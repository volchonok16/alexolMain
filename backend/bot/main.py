import asyncio
import argparse
import random
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from telegram import Update
from telegram.ext import Application

from src.post_generator import PostGenerator
from src.polling_error_handler import setup_polling_error_handler
from src.telegram_bot import TelegramPublisher
from src.project_requests_bot import run_requests_bot, setup_requests_bot
from src.simple_forward_bot import run_forward_bot, setup_forward_bot

import config
import pytz


scheduler = None
generator = None


async def publish_news_post():
    """Одна публикация новостного поста (вызывается по расписанию)."""
    global generator
    await generator.run_once()


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
    windows = getattr(config, "NEWS_WINDOWS", [(10, 11), (14, 15), (18, 19), (22, 23)])
    windows_str = ", ".join(f"{s:02d}–{e:02d}ч" for s, e in windows)
    print(f"📢 Канал: {config.TELEGRAM_CHANNEL_ID}")
    print(f"⏰ Публикация новостей: {len(windows)} раза в день | окна: {windows_str} ({config.TIMEZONE})")
    print(f"🧠 AI модель: {config.OPENROUTER_MODEL}")
    print("=" * 60)

    print("\n🚀 Публикация первого поста при запуске...")
    await generator.run_once()

    scheduler.start()
    schedule_news_posts()
    schedule_lead_posts()

    try:
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        print("\n🛑 Остановка бота...")
        scheduler.shutdown()


async def run_once():
    generator = PostGenerator()
    await generator.run_once()


async def preview():
    generator = PostGenerator()
    await generator.preview_post()


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

    application = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    setup_requests_bot(application)
    setup_forward_bot(application)
    setup_polling_error_handler(application)

    # Используем настройки по умолчанию; отдельный список allowed_updates не обязателен.
    application.run_polling()


def main():
    parser = argparse.ArgumentParser(description="IT News Bot для Telegram")
    parser.add_argument(
        "--mode",
        choices=["bot", "once", "preview", "test", "stats", "fetch", "requests", "forward"],
        default="bot",
        help=(
            "Режим: bot, once, preview, test, stats (статистика), fetch (загрузить контент), "
            "requests (приём заявок на проекты), forward (простая пересылка сообщений)"
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
    elif args.mode == "stats":
        asyncio.run(show_stats())
    elif args.mode == "fetch":
        asyncio.run(fetch_content())
    elif args.mode == "requests":
        # Используем объединённый бот: заявки + простая пересылка
        run_requests_and_forward_bot()
    elif args.mode == "forward":
        run_forward_bot()


if __name__ == "__main__":
    main()

