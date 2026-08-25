"""Telegram language practice bot (Alexol Speak) — text + voice, corrections, hints."""

from __future__ import annotations

import html
from pathlib import Path
from typing import Any

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputFile,
    LabeledPrice,
    MenuButtonCommands,
    Update,
)
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    PreCheckoutQueryHandler,
    filters,
)

import config
from src.polling_error_handler import block_forever_after_polling_conflict, setup_polling_error_handler
from src.speak_ai import LANG_META, SpeakTutorAI
from src.speech_services import synthesize_speech, transcribe_ogg

ai = SpeakTutorAI()

CB_LANG = "speak_lang:"
CB_TEXT = "speak_text"
CB_HELP = "speak_help"
CB_FINISH = "speak_finish"
CB_EXPLAIN = "speak_explain"
CB_PRONUNCE = "speak_pronounce"
CB_MENU_LANG = "speak_menu_lang"
CB_MENU_TOPIC = "speak_menu_topic"
CB_DONATE = "speak_donate"
CB_DONATE_AMOUNT = "speak_donate_amount:"

# Суммы пожертвования в Telegram Stars (XTR)
DONATE_AMOUNTS = (10, 50, 100, 250)


def _session(context: ContextTypes.DEFAULT_TYPE) -> dict[str, Any]:
    data = context.user_data.setdefault(
        "speak",
        {
            "language": None,
            "custom_topic": "",
            "awaiting_topic": False,
            "history": [],
            "last_reply": "",
            "last_reply_translation": "",
            "last_user_text": "",
            "last_user_input_mode": "text",
            "last_corrections": [],
            "points": 0,
            "active": False,
        },
    )
    return data


def _lang_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("🇬🇧 English", callback_data=f"{CB_LANG}en")],
            [InlineKeyboardButton("🇪🇸 Español", callback_data=f"{CB_LANG}es")],
            [InlineKeyboardButton("🇫🇷 Français", callback_data=f"{CB_LANG}fr")],
        ]
    )


def _session_keyboard(points: int | None = None) -> InlineKeyboardMarkup:
    # Как на скрине Supreme Speak: ⭐ +N — очки и вход в донат Stars
    star = f"⭐ +{points}" if points else "⭐ Поддержать"
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("💬 Текст", callback_data=CB_TEXT),
                InlineKeyboardButton(star, callback_data=CB_DONATE),
            ],
            [
                InlineKeyboardButton("💡 Помощь", callback_data=CB_HELP),
                InlineKeyboardButton("🏁 Завершить", callback_data=CB_FINISH),
            ],
        ]
    )


def _donate_keyboard(suggested: int | None = None) -> InlineKeyboardMarkup:
    amounts = list(DONATE_AMOUNTS)
    if suggested and suggested not in amounts:
        amounts.insert(0, suggested)
    row = [
        InlineKeyboardButton(f"⭐ {n}", callback_data=f"{CB_DONATE_AMOUNT}{n}")
        for n in amounts[:4]
    ]
    return InlineKeyboardMarkup([row])


def _correction_keyboard(*, show_pronunciation: bool = False) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = [
        [InlineKeyboardButton("📖 Объяснение ошибок", callback_data=CB_EXPLAIN)],
    ]
    if show_pronunciation:
        rows.append(
            [InlineKeyboardButton("🗣️ Оценка произношения", callback_data=CB_PRONUNCE)]
        )
    return InlineKeyboardMarkup(rows)


def format_corrections(corrections: list[dict[str, str]], user_text: str) -> str:
    """Формат как у Supreme Speak: строка с зачёркнутой ошибкой + строка с подчёркнутым исправлением."""
    if not corrections:
        return ""

    lines = ["🔍 <b>Заметил ошибки в твоём сообщении:</b>"]
    shown = 0

    for item in corrections[:6]:
        wrong = (item.get("wrong") or "").strip()
        right = (item.get("right") or "").strip()
        wrong_line = (item.get("wrong_line") or "").strip()
        right_line = (item.get("right_line") or "").strip()

        if not wrong and not wrong_line:
            continue
        if not right and not right_line:
            continue

        # Строка с ошибкой
        if wrong_line and wrong and wrong in wrong_line:
            bad = html.escape(wrong_line).replace(
                html.escape(wrong), f"<s>{html.escape(wrong)}</s>", 1
            )
        elif wrong_line:
            bad = f"<s>{html.escape(wrong_line)}</s>"
        else:
            bad = f"<s>{html.escape(wrong)}</s>"

        # Строка с исправлением
        if right_line and right and right in right_line:
            good = html.escape(right_line).replace(
                html.escape(right), f"<u>{html.escape(right)}</u>", 1
            )
        elif right_line:
            good = f"<u>{html.escape(right_line)}</u>"
        else:
            good = f"<u>{html.escape(right)}</u>"

        lines.append("")
        lines.append(bad)
        lines.append(good)
        shown += 1

    if shown == 0:
        return ""
    return "\n".join(lines)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    session = _session(context)
    session["active"] = False
    session["history"] = []
    session["awaiting_topic"] = False
    session["custom_topic"] = ""
    name = update.effective_user.first_name if update.effective_user else ""
    await update.message.reply_text(
        f"Привет{', ' + name if name else ''}! 👋\n\n"
        "Я — <b>Alexol Speak</b>. Общаюсь с тобой <b>голосовыми</b> — отвечай голосом или текстом.\n\n"
        "Выбери язык для практики:",
        parse_mode=ParseMode.HTML,
        reply_markup=_lang_keyboard(),
    )


async def cmd_language(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Выбери язык практики:",
        reply_markup=_lang_keyboard(),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "📖 <b>Как пользоваться</b>\n\n"
        "• /start — начать заново\n"
        "• /language — сменить язык\n"
        "• /topic — новая тема (бот спросит голосом)\n"
        "• /donate — поддержать бота Stars ⭐\n"
        "• /help — эта справка\n\n"
        "🎙 Бот говорит <b>голосовыми</b> — слушай и отвечай\n"
        "❓ Не знаешь тему — скажи «не знаю», бот сам предложит\n"
        "❓ Не знаешь, что ответить — «💡 Помощь»\n"
        "📖 Текст и перевод фразы бота — «💬 Текст»\n"
        "⭐ Кнопка <b>⭐ +N</b> — очки и донат Stars",
        parse_mode=ParseMode.HTML,
    )


async def cmd_topic(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    session = _session(context)
    if not session.get("language"):
        await update.message.reply_text("Сначала выбери язык:", reply_markup=_lang_keyboard())
        return
    session["active"] = False
    session["history"] = []
    session["custom_topic"] = ""
    name = update.effective_user.first_name if update.effective_user else "friend"
    await update.message.reply_text("Слушай голосовое 👇")
    await _ask_topic_voice(context, update.effective_chat.id, session, name)


async def cmd_donate(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "⭐ <b>Поддержать Alexol Speak</b>\n\n"
        "Если бот полезен — можно отправить Telegram Stars. "
        "Это добровольное пожертвование, практика остаётся бесплатной.\n\n"
        "Выбери сумму:",
        parse_mode=ParseMode.HTML,
        reply_markup=_donate_keyboard(),
    )


async def cmd_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Меню:",
        reply_markup=InlineKeyboardMarkup(
            [
                [InlineKeyboardButton("🌐 Сменить язык", callback_data=CB_MENU_LANG)],
                [InlineKeyboardButton("🗣 Новая тема", callback_data=CB_MENU_TOPIC)],
                [InlineKeyboardButton("💡 Помощь", callback_data=CB_HELP)],
                [InlineKeyboardButton("⭐ Поддержать Stars", callback_data=CB_DONATE)],
                [InlineKeyboardButton("🏁 Завершить сессию", callback_data=CB_FINISH)],
            ]
        ),
    )


async def on_lang_selected(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    lang = (query.data or "").removeprefix(CB_LANG)
    if lang not in LANG_META:
        await query.edit_message_text("Неизвестный язык. Выбери ещё раз:", reply_markup=_lang_keyboard())
        return

    session = _session(context)
    session["language"] = lang
    session["history"] = []
    session["active"] = False
    session["points"] = 0
    session["custom_topic"] = ""
    meta = LANG_META[lang]
    name = update.effective_user.first_name if update.effective_user else "friend"

    await query.edit_message_text(
        f"Практикуем <b>{meta['name_ru']}</b> ({meta['name_en']}). Слушай голосовое 👇",
        parse_mode=ParseMode.HTML,
    )
    await _ask_topic_voice(context, query.message.chat_id, session, name)


async def _ask_topic_voice(
    context: ContextTypes.DEFAULT_TYPE,
    chat_id: int,
    session: dict[str, Any],
    user_name: str,
) -> None:
    lang = session.get("language")
    if not lang:
        return

    session["awaiting_topic"] = True
    session["active"] = False
    session["history"] = []

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.RECORD_VOICE)
    result = await ai.ask_for_topic(lang, user_name)
    if not result:
        await context.bot.send_message(
            chat_id=chat_id,
            text="Не удалось подключиться. Попробуй /start через минуту.",
        )
        return

    reply = (result.get("reply") or "").strip()
    translation = (result.get("reply_translation") or "").strip()
    session["last_reply"] = reply
    session["last_reply_translation"] = translation

    await _send_tutor_voice_and_controls(
        context,
        chat_id=chat_id,
        lang=lang,
        reply=reply,
        points=None,
    )
    await context.bot.send_message(
        chat_id=chat_id,
        text="Ответь <b>голосом 🎙</b> или текстом. Не знаешь тему — просто скажи «не знаю», я сам предложу.",
        parse_mode=ParseMode.HTML,
    )


async def _start_conversation_from_topic(
    context: ContextTypes.DEFAULT_TYPE,
    *,
    chat_id: int,
    session: dict[str, Any],
    user_name: str,
    user_text: str,
    input_mode: str = "text",
) -> None:
    lang = session.get("language")
    if not lang:
        return

    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.RECORD_VOICE)
    result = await ai.begin_from_topic_choice(lang, user_name, user_text)
    if not result:
        await context.bot.send_message(
            chat_id=chat_id,
            text="Не получилось начать разговор. Попробуй ещё раз — назови тему или скажи «не знаю».",
        )
        return

    reply = (result.get("reply") or "").strip()
    translation = (result.get("reply_translation") or "").strip()
    topic = (result.get("topic") or user_text).strip()

    session["awaiting_topic"] = False
    session["active"] = True
    session["custom_topic"] = topic
    session["last_reply"] = reply
    session["last_reply_translation"] = translation
    session["last_user_text"] = user_text
    session["last_user_input_mode"] = input_mode
    session["history"] = [
        {"role": "user", "content": user_text},
        {"role": "assistant", "content": reply},
    ]

    await _send_tutor_voice_and_controls(
        context,
        chat_id=chat_id,
        lang=lang,
        reply=reply,
        points=None,
    )


async def _send_tutor_voice_and_controls(
    context: ContextTypes.DEFAULT_TYPE,
    *,
    chat_id: int,
    lang: str,
    reply: str,
    points: int | None = None,
) -> None:
    """Разговор — только голосом (voice/audio). Текст не отправляем."""
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.RECORD_VOICE)
    audio_path = await synthesize_speech(reply, lang)
    keyboard = _session_keyboard(points)

    try:
        if not audio_path:
            print("❌ TTS failed completely — no audio generated")
            await context.bot.send_message(
                chat_id=chat_id,
                text="⚠️ Не удалось озвучить ответ. Попробуй ещё раз через минуту.",
                reply_markup=keyboard,
            )
            return

        filename = "voice.ogg" if audio_path.suffix.lower() == ".ogg" else "speech.mp3"
        with audio_path.open("rb") as audio_file:
            voice_file = InputFile(audio_file, filename=filename)
            try:
                if audio_path.suffix.lower() == ".ogg":
                    await context.bot.send_voice(
                        chat_id=chat_id,
                        voice=voice_file,
                        reply_markup=keyboard,
                    )
                else:
                    await context.bot.send_audio(
                        chat_id=chat_id,
                        audio=voice_file,
                        title="Alexol Speak",
                        reply_markup=keyboard,
                    )
            except Exception as send_exc:
                print(f"⚠️ send_voice failed, retry as audio: {send_exc}")
                audio_file.seek(0)
                await context.bot.send_audio(
                    chat_id=chat_id,
                    audio=InputFile(audio_file, filename=filename),
                    title="Alexol Speak",
                    reply_markup=keyboard,
                )
    finally:
        if audio_path:
            Path(audio_path).unlink(missing_ok=True)


async def on_text_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    reply = session.get("last_reply") or ""
    translation = session.get("last_reply_translation") or ""
    if not reply:
        await query.message.reply_text("Пока нет фразы — сначала начни разговор.")
        return
    text = f"💬 <b>Текст</b>\n\n{html.escape(reply)}"
    if translation:
        text += f"\n\n🇷🇺 {html.escape(translation)}"
    await query.message.reply_text(text, parse_mode=ParseMode.HTML)


async def on_help_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    lang = session.get("language")
    if not lang or not session.get("active"):
        await query.message.reply_text("Сначала выбери язык и начни разговор (/start).")
        return

    await context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
    hint = await ai.make_hint(lang, session.get("history") or [], session.get("last_reply") or "")
    if not hint:
        await query.message.reply_text("Подсказку сейчас получить не удалось. Попробуй ещё раз.")
        return

    lines = ["💡 <b>Подсказка</b>\n"]
    what = hint.get("what_to_say") or ""
    if what:
        lines.append(f"<b>Что ответить</b>\n{html.escape(what)}\n")
    phrases = hint.get("phrases") or []
    if phrases:
        lines.append("<b>Фразы</b>")
        for p in phrases[:5]:
            en = html.escape((p.get("en") or "").strip())
            ru = html.escape((p.get("ru") or "").strip())
            if en:
                lines.append(f"• <i>{en}</i>" + (f" — {ru}" if ru else ""))
    example = hint.get("example") or ""
    if example:
        lines.append(f"\n<b>Пример</b>\n{html.escape(example)}")
    await query.message.reply_text("\n".join(lines), parse_mode=ParseMode.HTML)


async def on_finish(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    points = session.get("points") or 0
    session["active"] = False
    session["history"] = []
    await query.message.reply_text(
        f"Сессия завершена. Очки за разговор: <b>{points}</b> ⭐\n"
        "Чтобы начать снова — /start",
        parse_mode=ParseMode.HTML,
        reply_markup=_lang_keyboard(),
    )


async def on_explain(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    lang = session.get("language")
    corrections = session.get("last_corrections") or []
    user_text = session.get("last_user_text") or ""
    if not lang or not corrections:
        await query.message.reply_text("Сейчас нет ошибок для объяснения.")
        return
    await context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
    text = await ai.explain_errors(lang, user_text, corrections)
    await query.message.reply_text(text or "Не удалось получить объяснение.")


async def on_pronounce(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    if session.get("last_user_input_mode") != "voice":
        await query.message.reply_text("Оценка произношения доступна только после голосового ответа 🎙")
        return
    lang = session.get("language")
    user_text = session.get("last_user_text") or ""
    if not lang or not user_text:
        await query.message.reply_text("Сначала отправь голосовое или текст.")
        return
    await context.bot.send_chat_action(chat_id=query.message.chat_id, action=ChatAction.TYPING)
    text = await ai.pronunciation_feedback(lang, user_text)
    await query.message.reply_text(text or "Не удалось оценить произношение.")


async def on_menu_lang(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.message.reply_text("Выбери язык практики:", reply_markup=_lang_keyboard())


async def on_menu_topic(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    if not session.get("language"):
        await query.message.reply_text("Сначала выбери язык:", reply_markup=_lang_keyboard())
        return
    session["active"] = False
    session["history"] = []
    session["custom_topic"] = ""
    name = update.effective_user.first_name if update.effective_user else "friend"
    await query.message.reply_text("Слушай голосовое 👇")
    await _ask_topic_voice(context, query.message.chat_id, session, name)


async def on_donate_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    session = _session(context)
    suggested = 10
    # если только что получили очки — предложим ту же сумму как на скрине (+10)
    last_gain = int(session.get("last_points_gain") or 0)
    if last_gain > 0:
        suggested = last_gain
    await query.message.reply_text(
        "⭐ <b>Спасибо за поддержку!</b>\n\n"
        f"Очки за практику: <b>{int(session.get('points') or 0)}</b>\n"
        "Можешь отправить Telegram Stars — добровольно, практика бесплатна.\n\n"
        "Выбери сумму:",
        parse_mode=ParseMode.HTML,
        reply_markup=_donate_keyboard(suggested),
    )


async def _send_stars_invoice(
    context: ContextTypes.DEFAULT_TYPE,
    *,
    chat_id: int,
    user_id: int,
    amount: int,
) -> None:
    amount = max(1, min(int(amount), 100_000))
    await context.bot.send_invoice(
        chat_id=chat_id,
        title="Поддержка Alexol Speak",
        description="Добровольное пожертвование Stars. Спасибо, что помогаешь развивать бота!",
        payload=f"speak_donate:{user_id}:{amount}",
        provider_token="",  # пусто для Telegram Stars
        currency="XTR",
        prices=[LabeledPrice(label=f"{amount} Stars", amount=amount)],
    )


async def on_donate_amount(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    raw = (query.data or "").removeprefix(CB_DONATE_AMOUNT)
    try:
        amount = int(raw)
    except ValueError:
        await query.message.reply_text("Не удалось прочитать сумму. Попробуй /donate")
        return

    user = update.effective_user
    if not user:
        return
    try:
        await _send_stars_invoice(
            context,
            chat_id=query.message.chat_id,
            user_id=user.id,
            amount=amount,
        )
    except Exception as exc:
        print(f"⚠️ Stars invoice error: {exc}")
        await query.message.reply_text(
            "Не удалось открыть оплату Stars. Проверь, что у бота включены платежи в BotFather, "
            "и попробуй ещё раз."
        )


async def on_precheckout(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.pre_checkout_query
    if not query:
        return
    payload = query.invoice_payload or ""
    ok = payload.startswith("speak_donate:") and query.currency == "XTR"
    await query.answer(ok=ok, error_message=None if ok else "Неверный платёж")


async def on_successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    payment = update.message.successful_payment if update.message else None
    if not payment:
        return
    stars = payment.total_amount
    charge_id = payment.telegram_payment_charge_id
    print(f"⭐ Stars donation: {stars} XTR, charge_id={charge_id}")
    await update.message.reply_text(
        f"Спасибо за <b>{stars} ⭐</b>! Твоя поддержка очень важна 💙\n"
        "Продолжаем практику — отвечай голосом или текстом.",
        parse_mode=ParseMode.HTML,
    )


async def handle_user_text(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    text: str,
    *,
    input_mode: str = "text",
) -> None:
    session = _session(context)
    lang = session.get("language")
    if not lang:
        await update.message.reply_text("Сначала выбери язык:", reply_markup=_lang_keyboard())
        return

    text = (text or "").strip()
    if not text:
        await update.message.reply_text("Пустое сообщение — попробуй ещё раз.")
        return

    # Ждём ответ на голосовой вопрос «о чём поговорим?»
    if session.get("awaiting_topic"):
        name = update.effective_user.first_name if update.effective_user else "friend"
        await _start_conversation_from_topic(
            context,
            chat_id=update.effective_chat.id,
            session=session,
            user_name=name,
            user_text=text,
            input_mode=input_mode,
        )
        return

    if not session.get("active"):
        name = update.effective_user.first_name if update.effective_user else "friend"
        await update.message.reply_text("Сначала выбери язык (/start) или дождись моего голосового вопроса.")
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    result = await ai.practice_turn(
        lang,
        session.get("history") or [],
        text,
        topic_key="custom",
        custom_topic=session.get("custom_topic") or "",
    )
    if not result:
        await update.message.reply_text("Сейчас не получилось ответить. Попробуй ещё раз.")
        return

    corrections = result.get("corrections") or []
    reply = (result.get("reply") or "").strip()
    translation = (result.get("reply_translation") or "").strip()
    has_errors = bool(corrections)

    session["last_user_text"] = text
    session["last_user_input_mode"] = input_mode
    session["last_corrections"] = corrections
    session["last_reply"] = reply
    session["last_reply_translation"] = translation
    history = session.get("history") or []
    history.append({"role": "user", "content": text})
    history.append({"role": "assistant", "content": reply})
    session["history"] = history[-16:]

    gained = 10
    if has_errors:
        gained = 5
    session["points"] = int(session.get("points") or 0) + gained
    session["last_points_gain"] = gained

    if has_errors:
        block = format_corrections(corrections, text)
        if not block:
            corrected = html.escape((result.get("corrected_message") or text).strip())
            original = html.escape(text)
            block = (
                "🔍 <b>Заметил ошибки в твоём сообщении:</b>\n\n"
                f"<s>{original}</s>\n"
                f"<u>{corrected}</u>"
            )
        await update.message.reply_text(
            block,
            parse_mode=ParseMode.HTML,
            reply_markup=_correction_keyboard(show_pronunciation=(input_mode == "voice")),
        )

    await _send_tutor_voice_and_controls(
        context,
        chat_id=update.effective_chat.id,
        lang=lang,
        reply=reply,
        points=gained,
    )


async def on_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return
    await handle_user_text(update, context, update.message.text)


async def on_voice_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.voice:
        return

    session = _session(context)
    lang = session.get("language")
    if not lang:
        await update.message.reply_text("Сначала выбери язык:", reply_markup=_lang_keyboard())
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    voice = update.message.voice
    tg_file = await context.bot.get_file(voice.file_id)
    audio_bytes = bytes(await tg_file.download_as_bytearray())

    transcript = await transcribe_ogg(audio_bytes, language=lang)
    if not transcript:
        await update.message.reply_text(
            "Не удалось распознать голос. Напиши текстом или запиши ещё раз."
        )
        return

    await handle_user_text(update, context, transcript, input_mode="voice")


def setup_speak_bot(application: Application) -> None:
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("language", cmd_language))
    application.add_handler(CommandHandler("topic", cmd_topic))
    application.add_handler(CommandHandler("menu", cmd_menu))
    application.add_handler(CommandHandler("donate", cmd_donate))

    application.add_handler(CallbackQueryHandler(on_lang_selected, pattern=f"^{CB_LANG}"))
    application.add_handler(CallbackQueryHandler(on_text_button, pattern=f"^{CB_TEXT}$"))
    application.add_handler(CallbackQueryHandler(on_help_button, pattern=f"^{CB_HELP}$"))
    application.add_handler(CallbackQueryHandler(on_finish, pattern=f"^{CB_FINISH}$"))
    application.add_handler(CallbackQueryHandler(on_explain, pattern=f"^{CB_EXPLAIN}$"))
    application.add_handler(CallbackQueryHandler(on_pronounce, pattern=f"^{CB_PRONUNCE}$"))
    application.add_handler(CallbackQueryHandler(on_menu_lang, pattern=f"^{CB_MENU_LANG}$"))
    application.add_handler(CallbackQueryHandler(on_menu_topic, pattern=f"^{CB_MENU_TOPIC}$"))
    application.add_handler(CallbackQueryHandler(on_donate_menu, pattern=f"^{CB_DONATE}$"))
    application.add_handler(CallbackQueryHandler(on_donate_amount, pattern=f"^{CB_DONATE_AMOUNT}"))

    application.add_handler(PreCheckoutQueryHandler(on_precheckout))
    application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, on_successful_payment))
    application.add_handler(MessageHandler(filters.VOICE, on_voice_message))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text_message))


def run_speak_bot() -> None:
    token = config.SPEAK_BOT_TOKEN
    if not token:
        raise RuntimeError("SPEAK_BOT_TOKEN is not set")
    if not config.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    async def _post_init(app: Application) -> None:
        await app.bot.set_my_commands(
            [
                ("start", "Начать / выбрать язык"),
                ("language", "Сменить язык"),
                ("topic", "Новая тема"),
                ("donate", "Поддержать Stars ⭐"),
                ("menu", "Меню"),
                ("help", "Справка"),
            ]
        )
        try:
            await app.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
        except Exception:
            pass

    application = (
        Application.builder()
        .token(token)
        .post_init(_post_init)
        .build()
    )
    setup_speak_bot(application)
    setup_polling_error_handler(application)

    print("🗣 Alexol Speak Tutor bot started (polling)")
    application.run_polling()
    block_forever_after_polling_conflict()
