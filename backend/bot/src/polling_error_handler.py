from __future__ import annotations

from telegram.error import Conflict
from telegram.ext import Application, ContextTypes


async def handle_polling_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    error = context.error

    if isinstance(error, Conflict):
        print("❌ Конфликт Telegram polling: другой экземпляр бота уже использует этот токен через getUpdates.")
        print("   Остановите второй polling-процесс или используйте отдельный токен для второго приёмника сообщений.")
        context.application.stop_running()
        return

    print(f"❌ Ошибка polling: {error}")


def setup_polling_error_handler(application: Application) -> None:
    application.add_error_handler(handle_polling_error)
