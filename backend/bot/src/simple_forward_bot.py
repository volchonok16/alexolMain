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
        "Здравствуйте! 👋 Вас приветствует команда Alexol.\n\n"
        "Мы помогаем компаниям разрабатывать и развивать цифровые продукты — от идеи до запуска и поддержки.\n\n"
        "Чтобы мы могли предложить вам наиболее подходящее решение, пожалуйста, в одном сообщении укажите:\n\n"
        "✅ Ваше имя и название компании\n\n"
        "💡 Что вы планируете разработать или доработать\n\n"
        "📝 Краткое описание задачи и бизнес-контекста\n\n"
        "📞 Удобный способ связи\n\n"
        "Ваше обращение будет передано команде — мы изучим задачу и свяжемся с вами с предложением по дальнейшим шагам. 🚀"
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


def setup_forward_bot(application: Application) -> None:
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, forward_message))


def run_forward_bot() -> None:
    if not config.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    if not config.TELEGRAM_REQUESTS_CHAT_ID:
        raise RuntimeError("TELEGRAM_REQUESTS_CHAT_ID / TELEGRAM_CHAT_ID / TELEGRAM_CHANNEL_ID is not set")

    application = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    setup_forward_bot(application)

    application.run_polling(allowed_updates=Update.ALL_TYPES)

