import asyncio
import argparse
import random
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from src.post_generator import PostGenerator
from src.polling_error_handler import block_forever_after_polling_conflict, setup_polling_error_handler
from src.telegram_bot import TelegramPublisher
from src.telegram_http import application_builder
from src.news_start import setup_news_start
from src.project_requests_bot import run_requests_bot, setup_requests_bot
from src.simple_forward_bot import run_forward_bot, setup_forward_bot
from src.speak_tutor_bot import run_speak_bot

import config
import pytz


scheduler = None
generator = None


async def publish_news_post():
    """Одна публикация новостного поста (вызывается по расписанию)."""
    global generator
    try:
        await generator.run_once()
    except BaseException as e:
        if isinstance(e, (KeyboardInterrupt, SystemExit, asyncio.CancelledError)):
            raise
        print(f"❌ Ошибка публикации новостного поста: {e}")


def schedule_news_posts():
    """4 публикации в день в случайную минуту внутри каждого часового окна.

    Окна (по умолчанию): 10–11, 14–15, 18–19, 22–23.
    Переопределить можно через NEWS_WINDOWS в config.py.
    """
    global scheduler
    tz = config.TIMEZONE

    windows = getattr(config, "NEWS_WINDOWS", [(10, 11), (14, 15), (18, 19), (22, 23)])

    for i, (start_hour, end_hour) in enumerate(windows, 1):
        # Случайная минута внутри окна, фиксируется при старте бота на весь день.
        minute = random.randint(0, 59)
        # Выбираем час: если окно шире одного часа, случайно выбираем час внутри диапазона.
        if end_hour > start_hour + 1:
            hour = random.randint(start_hour, end_hour - 1)
        else:
            hour = start_hour

        scheduler.add_job(
            publish_news_post,
            CronTrigger(hour=hour, minute=minute, timezone=tz),
            id=f"post_generator_{i}",
            name=f"Новости {i}/4 ({start_hour:02d}–{end_hour:02d}ч)",
            replace_existing=True,
        )
        print(f"📅 Новости {i}/4: ежедневно в {hour:02d}:{minute:02d} ({tz})")


async def publish_lead_post():
    """Публикация промо-поста о поиске новых проектов."""
    global generator
    if not generator:
        generator = PostGenerator()
    await generator.generate_lead_and_publish()


def schedule_lead_posts():
    """Планируем промо-посты по чётным дням месяца."""
    global scheduler

    scheduler.add_job(
        publish_lead_post,
        # Каждый чётный день месяца в config.POST_HOUR:00
        CronTrigger(day="2-31/2", hour=config.POST_HOUR, minute=0),
        id="lead_generator",
        name="Посты о поиске новых проектов",
        replace_existing=True,
    )
    print("📅 Промо-посты о поиске проектов будут публиковаться каждые 3 дня")


async def run_bot():
    global scheduler, generator

    generator = PostGenerator()
    scheduler = AsyncIOScheduler(timezone=config.TIMEZONE)

    print("=" * 60)
    print("🤖 IT News Bot для Telegram")
    print("=" * 60)
    generator.print_status()
    windows = getattr(config, "NEWS_WINDOWS", [(10, 11), (14, 15), (18, 19), (22, 23)])
    windows_str = ", ".join(f"{s:02d}–{e:02d}ч" for s, e in windows)
    print(f"📢 Канал: {config.TELEGRAM_CHANNEL_ID}")
    print(f"⏰ Публикация новостей: {len(windows)} раза в день | окна: {windows_str} ({config.TIMEZONE})")
    print(f"🧠 AI модель: {config.OPENROUTER_MODEL}")
    if config.OPENROUTER_HTTP_PROXY:
        print(f"🌐 OpenRouter proxy: {config.OPENROUTER_HTTP_PROXY.split('@')[-1]}")
    else:
        print("🌐 OpenRouter proxy: не задан (при 403 security policy нужен прокси вне РФ)")
    print("=" * 60)

    news_token = config.TELEGRAM_NEWS_BOT_TOKEN or config.TELEGRAM_BOT_TOKEN
    if not news_token:
        raise RuntimeError("TELEGRAM_NEWS_BOT_TOKEN / TELEGRAM_BOT_TOKEN is not set")

    application = application_builder(news_token).build()
    setup_news_start(application)
    setup_polling_error_handler(application)

    async with application:
        await application.start()
        if application.updater:
            await application.updater.start_polling(drop_pending_updates=True)
            print("📬 /start: бот принимает личные сообщения для сброса пароля почты")

        print("\n🚀 Публикация первого поста при запуске...")
        try:
            await generator.run_once()
        except BaseException as e:
            if isinstance(e, (KeyboardInterrupt, SystemExit, asyncio.CancelledError)):
                raise
            print(f"❌ Ошибка первой публикации (бот продолжит работу по расписанию): {e}")

        scheduler.start()
        schedule_news_posts()
        schedule_lead_posts()

        try:
            while True:
                await asyncio.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            print("\n🛑 Остановка бота...")
        finally:
            scheduler.shutdown()
            if application.updater:
                await application.updater.stop()


async def run_once():
    generator = PostGenerator()
    await generator.run_once()


async def preview():
    generator = PostGenerator()
    await generator.preview_post()


async def diagnose():
    """Полная диагностика: конфиг, Telegram, backend, OpenRouter, SQLite."""
    from src import database as db

    print("=" * 60)
    print("🔍 Диагностика новостного бота")
    print("=" * 60)

    generator = PostGenerator()
    generator.print_status()

    stats = db.get_stats()
    print(f"\n📊 SQLite: спарсено={stats.get('total_parsed', 0)}, "
          f"сгенерировано={stats.get('total_generated', 0)}, "
          f"опубликовано={stats.get('total_published', 0)}, "
          f"неиспользованных={stats.get('unused_parsed', 0)}")

    publisher = TelegramPublisher()
    bot_info = await publisher.get_bot_info()
    if bot_info:
        print(f"\n✅ Telegram: @{bot_info.get('username')} (id={bot_info.get('id')})")
    else:
        print("\n❌ Telegram: не удалось подключиться (проверь TELEGRAM_NEWS_BOT_TOKEN)")

    if generator.backend_news:
        ok, msg = await generator.backend_news.test_connection()
        print(f"{'✅' if ok else '❌'} Backend API: {msg}")
        await generator.backend_news.aclose()
    else:
        print("❌ Backend API: интеграция отключена")

    if config.OPENROUTER_API_KEY:
        try:
            import httpx
            from src.http_utils import openrouter_client_kwargs, is_openrouter_security_block

            async with httpx.AsyncClient(**openrouter_client_kwargs(15.0)) as client:
                resp = await client.get(
                    f"{config.OPENROUTER_BASE_URL}/models",
                    headers={"Authorization": f"Bearer {config.OPENROUTER_API_KEY}"},
                )
            if resp.status_code == 200:
                print("✅ OpenRouter: API доступен")
            elif is_openrouter_security_block(resp.status_code, resp.text):
                print("❌ OpenRouter: 403 security policy — нужен OPENROUTER_HTTP_PROXY вне РФ")
            else:
                print(f"❌ OpenRouter: HTTP {resp.status_code} {(resp.text or '')[:120]}")
        except Exception as e:
            print(f"❌ OpenRouter: {e}")
    else:
        print("❌ OpenRouter: OPENROUTER_API_KEY не задан")

    print("\n📰 RSS (1 статья)...")
    articles = await generator.rss_parser.get_random_articles(1)
    if articles:
        print(f"✅ RSS OK: {articles[0].title[:70]}...")
    else:
        print("❌ RSS: не удалось получить статьи")

    print("\n💡 Ручной прогон: python main.py --mode once")
    print("=" * 60)


async def test_connection():
    print("🔍 Проверка подключения...")

    publisher = TelegramPublisher()
    bot_info = await publisher.get_bot_info()

    if bot_info:
        print(f"✅ Telegram бот: @{bot_info.get('username')}")
    else:
        print("❌ Не удалось подключиться к Telegram")
        return

    generator = PostGenerator()
    print("\n📰 Проверка RSS источников...")
    articles = await generator.rss_parser.get_random_articles(3)

    if articles:
        print(f"✅ Получено {len(articles)} статей")
        for i, article in enumerate(articles, 1):
            print(f"   {i}. {article.title[:60]}...")
    else:
        print("❌ Не удалось получить статьи из RSS")

    # Проверка VK
    if generator.vk:
        print("\n📤 Проверка подключения к VK...")
        vk_ok = await generator.vk.test_connection()
        if vk_ok:
            print(f"✅ VK подключение работает (группа ID: {config.VK_GROUP_ID})")
        else:
            print("❌ Не удалось подключиться к VK")
            print("   💡 Проверь:")
            print("      - VK_ACCESS_TOKEN в .env")
            print("      - VK_GROUP_ID в .env")
            print("      - Токен сообщества (не пользователя!)")
            print("      - Права токена: manage, photos, wall")
    else:
        print("\n⚠️ VK не настроен (пропускаем)")

    print("\n✅ Все проверки пройдены!")


async def show_stats():
    generator = PostGenerator()
    await generator.show_stats()


async def fetch_content():
    generator = PostGenerator()
    await generator.fetch_new_content()
    print("✅ Контент загружен!")


def run_requests_and_forward_bot() -> None:
    if not config.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    if not config.TELEGRAM_REQUESTS_CHAT_ID:
        raise RuntimeError("TELEGRAM_REQUESTS_CHAT_ID / TELEGRAM_CHAT_ID / TELEGRAM_CHANNEL_ID is not set")

    application = application_builder(config.TELEGRAM_BOT_TOKEN).build()

    setup_requests_bot(application)
    setup_forward_bot(application)
    setup_polling_error_handler(application)

    # Используем настройки по умолчанию; отдельный список allowed_updates не обязателен.
    application.run_polling()
    block_forever_after_polling_conflict()


def main():
    parser = argparse.ArgumentParser(description="IT News Bot для Telegram")
    parser.add_argument(
        "--mode",
        choices=["bot", "once", "preview", "test", "diagnose", "stats", "fetch", "requests", "forward", "speak"],
        default="bot",
        help=(
            "Режим: bot, once, preview, test, diagnose (диагностика), stats (статистика), "
            "fetch (загрузить контент), requests (приём заявок на проекты), "
            "forward (простая пересылка сообщений), speak (языковой tutor)"
        ),
    )

    args = parser.parse_args()

    if args.mode == "bot":
        asyncio.run(run_bot())
    elif args.mode == "once":
        asyncio.run(run_once())
    elif args.mode == "preview":
        asyncio.run(preview())
    elif args.mode == "test":
        asyncio.run(test_connection())
    elif args.mode == "diagnose":
        asyncio.run(diagnose())
    elif args.mode == "stats":
        asyncio.run(show_stats())
    elif args.mode == "fetch":
        asyncio.run(fetch_content())
    elif args.mode == "requests":
        # Используем объединённый бот: заявки + простая пересылка
        run_requests_and_forward_bot()
    elif args.mode == "forward":
        run_forward_bot()
    elif args.mode == "speak":
        run_speak_bot()


if __name__ == "__main__":
    main()

