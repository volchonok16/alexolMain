from __future__ import annotations

import threading

from telegram.error import Conflict
from telegram.ext import Application, ContextTypes

_polling_conflict: bool = False
_stop_restart_block = threading.Event()


def block_forever_after_polling_conflict() -> None:
    """Сохраняем контейнер живым без перезапуска в цикле (Docker restart: unless-stopped)."""
    if not _polling_conflict:
        return
    print("")
    print("⏸️  Polling остановлен. Контейнер ждёт — перезапуски Docker больше не спамят лог.")
    print("   Как исправить: один токен = один процесс с getUpdates.")
    print("   • Остановите другой контейнер/скрипт с тем же TELEGRAM_BOT_TOKEN (другой сервер, systemd, локальный ПК).")
    print("   • Или задайте разные боты: TELEGRAM_BOT_TOKEN (заявки) ≠ TELEGRAM_NEWS_BOT_TOKEN (новости в канал).")
    print("   • Если был webhook: https://api.telegram.org/bot<TOKEN>/deleteWebhook?drop_pending_updates=true")
    print("")
    _stop_restart_block.wait()


async def handle_polling_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    global _polling_conflict
    error = context.error

    if isinstance(error, Conflict):
        _polling_conflict = True
        print("❌ Конфликт Telegram polling: другой экземпляр бота уже использует этот токен через getUpdates.")
        context.application.stop_running()
        return

    print(f"❌ Ошибка polling: {error}")


def setup_polling_error_handler(application: Application) -> None:
    application.add_error_handler(handle_polling_error)
