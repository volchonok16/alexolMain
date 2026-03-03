from __future__ import annotations

from dataclasses import dataclass

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

import config


NAME, COMPANY, EMAIL, PHONE, BUDGET, DESCRIPTION = range(6)


BUDGET_CHOICES: list[tuple[str, str]] = [
    ("50 - 200 тыс. ₽", "budget_50_200"),
    ("200 - 500 тыс. ₽", "budget_200_500"),
    ("500 тыс. - 1 млн ₽", "budget_500_1000"),
    ("1 - 3 млн ₽", "budget_1_3m"),
    ("3 - 5 млн ₽", "budget_3_5m"),
    ("От 5 млн ₽", "budget_5m_plus"),
]


@dataclass
class ProjectRequest:
    name: str | None = None
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    budget: str | None = None
    description: str | None = None


def _get_request(context: ContextTypes.DEFAULT_TYPE) -> ProjectRequest:
    data = context.user_data.get("project_request")
    if isinstance(data, ProjectRequest):
        return data
    req = ProjectRequest()
    context.user_data["project_request"] = req
    return req


def format_request_message(req: ProjectRequest, user_mention: str | None = None) -> str:
    parts: list[str] = []
    parts.append("<b>🆕 Новая заявка на проект</b>\n")

    if user_mention:
        parts.append(f"<b>От пользователя:</b> {user_mention}\n")

    if req.name:
        parts.append(f"<b>Имя:</b> {req.name}\n")
    if req.company:
        parts.append(f"<b>Компания:</b> {req.company}\n")
    if req.email:
        parts.append(f"<b>Email:</b> {req.email}\n")
    if req.phone:
        parts.append(f"<b>Телефон:</b> {req.phone}\n")
    if req.budget:
        parts.append(f"<b>Бюджет:</b> {req.budget}\n")

    parts.append("\n<b>Описание проекта:</b>\n")
    if req.description:
        parts.append(req.description)
    else:
        parts.append("—")

    return "".join(parts)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "Привет! Я бот Alexol.\n\n"
        "Чтобы оставить заявку на новый проект, отправь команду /project."
    )
    return ConversationHandler.END


async def project_entry(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data["project_request"] = ProjectRequest()
    await update.message.reply_text("Давай соберём информацию о проекте.\n\nКак тебя зовут?")
    return NAME


async def handle_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    req = _get_request(context)
    req.name = update.message.text.strip()
    await update.message.reply_text(
        "Из какой ты компании? (можно пропустить, отправь «-» если не хочешь указывать)"
    )
    return COMPANY


async def handle_company(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    req = _get_request(context)
    text = update.message.text.strip()
    if text != "-":
        req.company = text
    await update.message.reply_text("Укажи, пожалуйста, свой email (чтобы мы могли связаться):")
    return EMAIL


async def handle_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    req = _get_request(context)
    email = update.message.text.strip()

    if "@" not in email or "." not in email:
        await update.message.reply_text("Похоже, это не похоже на email. Попробуй ещё раз:")
        return EMAIL

    req.email = email
    await update.message.reply_text(
        "Оставь, пожалуйста, телефон (можно пропустить, отправь «-», если не хочешь указывать):"
    )
    return PHONE


async def handle_phone(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    req = _get_request(context)
    text = update.message.text.strip()
    if text != "-":
        req.phone = text

    keyboard = [
        [InlineKeyboardButton(text=label, callback_data=code)]
        for label, code in BUDGET_CHOICES
    ]
    await update.message.reply_text(
        "Выбери, пожалуйста, ориентировочный бюджет проекта, как на сайте:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return BUDGET


async def handle_budget_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    req = _get_request(context)
    code = query.data

    label = next((lbl for lbl, c in BUDGET_CHOICES if c == code), None)
    if not label:
        # На всякий случай, если пришло что-то неожиданное
        await query.edit_message_text("Не удалось определить бюджет. Попробуй ещё раз отправить /project.")
        context.user_data.pop("project_request", None)
        return ConversationHandler.END

    req.budget = label

    await query.edit_message_text(
        f"Бюджет: {label}\n\n"
        "Теперь опиши, пожалуйста, проект: что нужно сделать, какие есть идеи/требования?"
    )
    return DESCRIPTION


async def handle_description(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    req = _get_request(context)
    req.description = update.message.text.strip()

    user = update.effective_user
    user_mention = user.mention_html() if user else None
    text = format_request_message(req, user_mention=user_mention)

    await context.bot.send_message(
        chat_id=config.TELEGRAM_REQUESTS_CHAT_ID,
        text=text,
        parse_mode="HTML",
        disable_web_page_preview=True,
    )

    await update.message.reply_text(
        "Спасибо! Твоя заявка отправлена команде Alexol. Мы свяжемся с тобой в ближайшее время."
    )

    context.user_data.pop("project_request", None)
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.pop("project_request", None)
    await update.message.reply_text("Окей, заявку отменили. Если захочешь начать заново — напиши /project.")
    return ConversationHandler.END


def run_requests_bot() -> None:
    if not config.TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    if not config.TELEGRAM_REQUESTS_CHAT_ID:
        raise RuntimeError("TELEGRAM_REQUESTS_CHAT_ID / TELEGRAM_CHAT_ID / TELEGRAM_CHANNEL_ID is not set")

    application = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("project", project_entry)],
        states={
            NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_name)],
            COMPANY: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_company)],
            EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_email)],
            PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_phone)],
            BUDGET: [CallbackQueryHandler(handle_budget_callback)],
            DESCRIPTION: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_description)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(conv_handler)

    application.run_polling(allowed_updates=Update.ALL_TYPES)

