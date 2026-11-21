from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes


async def news_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.effective_message:
        return
    await update.effective_message.reply_text(
        "Готово. Если сбросите пароль на mail.alexol.io, новый пароль придёт сюда."
    )


def setup_news_start(application: Application) -> None:
    application.add_handler(CommandHandler("start", news_start))
