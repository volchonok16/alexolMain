import asyncio
import argparse
import random
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from src.post_generator import PostGenerator
from src.telegram_bot import TelegramPublisher
from src.project_requests_bot import run_requests_bot
from src.simple_forward_bot import run_forward_bot

import config
import pytz


scheduler = None
generator = None


def get_next_post_time():
    tz = pytz.timezone(config.TIMEZONE)
    now = datetime.now(tz)
    random_minute = random.randint(0, 59)

    next_post = now.replace(hour=config.POST_HOUR, minute=random_minute, second=0, microsecond=0)

    if next_post <= now:
        next_post += timedelta(days=1)

    return next_post


async def publish_and_reschedule():
    global scheduler, generator

    await generator.run_once()

    schedule_next_post()


def schedule_next_post():
    global scheduler

    next_time = get_next_post_time()

    scheduler.add_job(
        publish_and_reschedule,
        DateTrigger(run_date=next_time),
        id="post_generator",
        name="Генератор постов",
        replace_existing=True,
    )

    print(f"📅 Следующий пост запланирован на: {next_time.strftime('%Y-%m-%d %H:%M:%S')}")


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
    print(f"📢 Канал: {config.TELEGRAM_CHANNEL_ID}")
    print(f"⏰ Публикация: ежедневно в {config.POST_HOUR:02d}:XX ({config.TIMEZONE})")
    print("🎲 Минуты выбираются случайно (0-59)")
    print(f"🧠 AI модель: {config.OPENROUTER_MODEL}")
    print("=" * 60)

    print("\n🚀 Публикация первого поста при запуске...")
    await generator.run_once()

    scheduler.start()
    schedule_next_post()
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
        run_requests_bot()
    elif args.mode == "forward":
        run_forward_bot()


if __name__ == "__main__":
    main()

