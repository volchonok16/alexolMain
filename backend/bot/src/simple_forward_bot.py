from __future__ import annotations

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import config


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Привет! Просто напиши сюда сообщение о проекте,\n"
        "а я отправлю его команде Alexol."
    )


async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    user = update.effective_user
    user_mention = user.mention_html() if user else None
    username = f"@{user.username}" if user and user.username else None
    name = user.full_name if user else None

    who = user_mention or username or name or str(user.id if user else "")

    text = update.message.text.strip()

    payload = (
        "<b>🆕 Новое обращение из бота</b>\n\n"
        f"<b>От:</b> {who}\n\n"
        f"{text}"
    )

    await context.bot.send_message(
        chat_id=config.TELEGRAM_REQUESTS_CHAT_ID,
        text=payload,
        parse_mode="HTML",
        disable_web_page_preview=True,
    )

    await update.message.reply_text("Спасибо! Сообщение отправлено команде Alexol.")


def run_forward_bot() -> None:
    if not config.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    if not config.TELEGRAM_REQUESTS_CHAT_ID:
        raise RuntimeError("TELEGRAM_REQUESTS_CHAT_ID / TELEGRAM_CHAT_ID / TELEGRAM_CHANNEL_ID is not set")

    application = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, forward_message))

    application.run_polling(allowed_updates=Update.ALL_TYPES)

