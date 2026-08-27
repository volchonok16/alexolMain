"""Language tutor AI via the same OpenRouter stack as the news bot.

Does NOT reuse news response cleaning (it strips English words).
"""

from __future__ import annotations

import json
import random
import re
from typing import Any, Optional

import httpx

import config
from src.http_utils import (
    format_openrouter_error_body,
    is_openrouter_security_block,
    openrouter_client_kwargs,
)

LANG_META = {
    "en": {"name_ru": "английский", "name_en": "English", "code": "en"},
    "es": {"name_ru": "испанский", "name_en": "Spanish", "code": "es"},
    "fr": {"name_ru": "французский", "name_en": "French", "code": "fr"},
    "de": {"name_ru": "немецкий", "name_en": "German", "code": "de"},
}

# Ключ → (подпись в UI RU, описание темы для модели EN)
TOPICS: dict[str, tuple[str, str]] = {
    "today": ("📅 Что делал сегодня", "what the learner did today / daily routine"),
    "work": ("💼 Работа и учёба", "work, studies, projects, colleagues"),
    "hobbies": ("🎨 Хобби", "hobbies, free time, sports, creativity"),
    "travel": ("✈️ Путешествия", "travel, cities, trips, dream destinations"),
    "food": ("🍕 Еда", "food, cooking, restaurants, favorite dishes"),
    "movies": ("🎬 Фильмы и сериалы", "movies, series, music, books"),
    "friends": ("👥 Друзья и семья", "friends, family, weekend plans together"),
    "future": ("🚀 Планы и мечты", "future plans, goals, dreams"),
    "random": ("🎲 Сам предложи тему", "surprise: pick any lively everyday topic yourself"),
    "custom": ("✍️ Своя тема", "custom topic chosen by the learner"),
}

OPENING_STYLES = [
    "Ask what they did today and react with curiosity.",
    "Ask about work/study today - what was interesting or hard.",
    "Ask about plans for tonight or the weekend.",
    "Ask about food: last meal, favorite cafe, or what they want to cook.",
    "Ask about a hobby or something they enjoy lately.",
]

# Первое голосовое после «Начать говорить» - статически, без AI (надёжно и мгновенно)
ASK_TOPIC_BY_LANG: dict[str, tuple[str, str]] = {
    "en": (
        "Hey {name}! Nice to meet you. What would you like to talk about today? "
        "If you're not sure, just say so - I'll pick something interesting!",
        "Привет, {name}! Рад познакомиться. О чём хочешь поговорить сегодня? "
        "Если не знаешь - скажи, я сам предложу тему!",
    ),
    "es": (
        "¡Hola, {name}! Encantado de conocerte. ¿De qué te gustaría hablar hoy? "
        "Si no lo sabes, dímelo y yo propongo un tema interesante.",
        "Привет, {name}! Рад познакомиться. О чём хочешь поговорить сегодня? "
        "Если не знаешь - скажи, я сам предложу тему!",
    ),
    "fr": (
        "Salut {name} ! Ravi de te rencontrer. De quoi aimerais-tu parler aujourd'hui ? "
        "Si tu ne sais pas, dis-le moi - je proposerai un sujet intéressant.",
        "Привет, {name}! Рад познакомиться. О чём хочешь поговорить сегодня? "
        "Если не знаешь - скажи, я сам предложу тему!",
    ),
    "de": (
        "Hallo {name}! Schön, dich kennenzulernen. Worüber möchtest du heute sprechen? "
        "Wenn du nicht weißt, sag es einfach - ich schlage ein spannendes Thema vor.",
        "Привет, {name}! Рад познакомиться. О чём хочешь поговорить сегодня? "
        "Если не знаешь - скажи, я сам предложу тему!",
    ),
}

# Смена темы во время разговора - без «привет, рад познакомиться»
CHANGE_TOPIC_BY_LANG: dict[str, tuple[str, str]] = {
    "en": (
        "Sure, let's switch topics! What do you want to talk about now? "
        "If you're not sure, just say so - I'll pick something.",
        "Хорошо, меняем тему! О чём поговорим? Или скажи «не знаю» - предложу сам.",
    ),
    "es": (
        "¡Vale, cambiemos de tema! ¿De qué quieres hablar ahora? "
        "Si no lo sabes, dímelo y yo propongo algo.",
        "Хорошо, меняем тему! О чём поговорим? Или скажи «не знаю» - предложу сам.",
    ),
    "fr": (
        "D'accord, changeons de sujet ! De quoi veux-tu parler maintenant ? "
        "Si tu ne sais pas, dis-le moi - je proposerai quelque chose.",
        "Хорошо, меняем тему! О чём поговорим? Или скажи «не знаю» - предложу сам.",
    ),
    "de": (
        "Okay, wechseln wir das Thema! Worüber möchtest du jetzt sprechen? "
        "Wenn du nicht weißt, sag es einfach - ich schlage etwas vor.",
        "Хорошо, меняем тему! О чём поговорим? Или скажи «не знаю» - предложу сам.",
    ),
}

_GARBAGE_REPLY_RE = re.compile(
    r"(user\s*safe|safety|```|\{\s*\"has_errors\")",
    re.IGNORECASE,
)

_VAGUE_TOPIC_PHRASES = {
    "не знаю",
    "not sure",
    "i don't know",
    "don't know",
    "no idea",
    "anything",
    "whatever",
    "предложи",
    "предложите",
    "anything is fine",
}

# Запасные ответы, если OpenRouter не вернул JSON
_BEGIN_FALLBACK: dict[str, dict[str, tuple[str, str]]] = {
    "en": {
        "vague": (
            "No problem! Let's talk about your day. What was the most interesting thing that happened today?",
            "Без проблем! Поговорим о твоём дне. Что было самым интересным сегодня?",
        ),
        "named": (
            "Great - {topic}! I'd love to hear more. What's your favorite thing about it?",
            "Отлично - {topic}! Расскажи, что тебе в этом больше всего нравится?",
        ),
    },
    "es": {
        "vague": (
            "¡No hay problema! Hablemos de tu día. ¿Qué fue lo más interesante hoy?",
            "Без проблем! Поговорим о твоём дне. Что было самым интересным сегодня?",
        ),
        "named": (
            "¡Genial - {topic}! Cuéntame, ¿qué es lo que más te gusta de eso?",
            "Отлично - {topic}! Расскажи, что тебе в этом больше всего нравится?",
        ),
    },
    "fr": {
        "vague": (
            "Pas de souci ! Parlons de ta journée. Qu'est-ce qui t'a le plus marqué aujourd'hui ?",
            "Без проблем! Поговорим о твоём дне. Что было самым интересным сегодня?",
        ),
        "named": (
            "Super - {topic} ! Dis-moi, qu'est-ce que tu préfères là-dedans ?",
            "Отлично - {topic}! Расскажи, что тебе в этом больше всего нравится?",
        ),
    },
    "de": {
        "vague": (
            "Kein Problem! Erzähl mir von deinem Tag. Was war heute am interessantesten?",
            "Без проблем! Поговорим о твоём дне. Что было самым интересным сегодня?",
        ),
        "named": (
            "Toll - {topic}! Was gefällt dir daran am meisten?",
            "Отлично - {topic}! Расскажи, что тебе в этом больше всего нравится?",
        ),
    },
}

_PRACTICE_FALLBACK: dict[str, tuple[str, str]] = {
    "en": (
        "That's interesting! Tell me a bit more - what happened next?",
        "Интересно! Расскажи подробнее - что было дальше?",
    ),
    "es": (
        "¡Qué interesante! Cuéntame un poco más - ¿qué pasó después?",
        "Интересно! Расскажи подробнее - что было дальше?",
    ),
    "fr": (
        "C'est intéressant ! Raconte-moi un peu plus - qu'est-ce qui s'est passé ensuite ?",
        "Интересно! Расскажи подробнее - что было дальше?",
    ),
    "de": (
        "Das ist interessant! Erzähl mir mehr - was ist als Nächstes passiert?",
        "Интересно! Расскажи подробнее - что было дальше?",
    ),
}


def _topic_roleplay_rules() -> str:
    return """
ROLE-PLAY & TOPIC RULES (CRITICAL - follow every turn):
You LEAD the conversation. NEVER ask meta questions like:
- "What questions should I ask you?"
- "What would you like me to ask?"
- "What do you want to talk about within this topic?"
- "How can I help you with this topic?"

When the learner names a scenario, YOU play the active role and drive it forward:

• Job / interview / "интервью" / "собеседование":
  → YOU are the interviewer. If you don't know their target role/field yet → ask ONE setup question:
    "What position or field are you interviewing for?" / "Какую специальность?"
  → Once you know (or they said it) → ask REAL interview questions one at a time
    (experience, strengths, why this job, handling stress, teamwork, etc.).
  → Stay in interviewer character until they change topic.

• Restaurant / café / ordering food → YOU are the waiter. Greet, offer menu, take order, ask preferences.

• Hotel / travel / airport → YOU are staff (reception, check-in, customs). Ask situational questions.

• Doctor / clinic → YOU are the doctor/nurse. Ask symptoms, history, give simple follow-ups.

• Shopping → YOU are the shop assistant. Help choose, ask size/color/budget.

• Casual topics (hobbies, movies, daily life, "не знаю") → curious friend; ask personal follow-ups.

If they give BOTH scenario and details (e.g. "interview for Python developer") → skip setup, start asking interview questions immediately.
If setup info appears in their latest message → update your mental context and proceed (don't re-ask).
"""


def _session_topic_block(
    *,
    custom_topic: str,
    topic_mode: str = "",
    topic_context: str = "",
) -> str:
    parts = []
    if custom_topic.strip():
        parts.append(f"Session topic: {custom_topic.strip()}")
    if topic_mode.strip():
        parts.append(f"Topic mode: {topic_mode.strip()}")
    if topic_context.strip():
        parts.append(f"Known context (role, field, situation): {topic_context.strip()}")
    if not parts:
        return "Session topic: free conversation"
    return "\n".join(parts)


def _clean_model_text(text: str) -> str:
    """Убираем reasoning/thinking блоки перед парсингом JSON."""
    if not text:
        return ""
    cleaned = text.strip()
    think_open = "<" + "think" + ">"
    think_close = "</" + "think" + ">"
    cleaned = re.sub(
        re.escape(think_open) + r"[\s\S]*?" + re.escape(think_close),
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(?is)<reasoning>[\s\S]*?</reasoning>", "", cleaned)
    return cleaned.strip()


def _is_valid_spoken_reply(text: str) -> bool:
    """Отсеиваем мусор модели (user safe, JSON, reasoning)."""
    s = (text or "").strip()
    if len(s) < 8:
        return False
    if _GARBAGE_REPLY_RE.search(s):
        return False
    if s.startswith("{") or s.startswith("["):
        return False
    if not re.search(r"[a-zA-Z\u00C0-\u024F\u0400-\u04FF]", s):
        return False
    return True


def _extract_reply_field(text: str) -> Optional[str]:
    """Достаёт reply из битого JSON."""
    if not text:
        return None
    match = re.search(r'"reply"\s*:\s*"((?:\\.|[^"\\])*)"', text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(f'"{match.group(1)}"')
    except json.JSONDecodeError:
        return match.group(1).replace('\\"', '"').replace("\\n", "\n")


def _is_vague_topic(text: str) -> bool:
    low = (text or "").lower().strip()
    return any(p in low for p in _VAGUE_TOPIC_PHRASES)


def _fallback_begin_topic(language: str, user_text: str) -> dict[str, Any]:
    pack = _BEGIN_FALLBACK.get(language, _BEGIN_FALLBACK["en"])
    topic = user_text.strip() or "free conversation"
    if _is_vague_topic(user_text):
        reply, trans = pack["vague"]
        return {
            "topic": "daily life",
            "topic_mode": "casual",
            "topic_context": "",
            "bot_picked_topic": True,
            "reply": reply,
            "reply_translation": trans,
        }
    label = topic[:80]
    reply, trans = pack["named"]
    return {
        "topic": label,
        "topic_mode": "casual",
        "topic_context": "",
        "bot_picked_topic": False,
        "reply": reply.format(topic=label),
        "reply_translation": trans.format(topic=label),
    }


def _fallback_practice_turn(language: str, user_text: str, topic_context: str = "") -> dict[str, Any]:
    reply, trans = _PRACTICE_FALLBACK.get(language, _PRACTICE_FALLBACK["en"])
    return {
        "has_errors": False,
        "corrections": [],
        "corrected_message": user_text,
        "reply": reply,
        "reply_translation": trans,
        "topic_context": topic_context or "",
    }


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None
    text = _clean_model_text(text)
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(text[start : end + 1])
                return data if isinstance(data, dict) else None
            except json.JSONDecodeError:
                return None
    return None


def _parse_speak_response(raw: str) -> Optional[dict[str, Any]]:
    data = _extract_json(raw)
    if data and data.get("reply"):
        return data
    reply = _extract_reply_field(raw or "")
    if reply and _is_valid_spoken_reply(reply):
        return {"reply": reply, "reply_translation": ""}
    cleaned = _clean_model_text(raw or "")
    if cleaned and _is_valid_spoken_reply(cleaned):
        return {"reply": cleaned, "reply_translation": ""}
    return None


def _normalize_compare(text: str) -> str:
    """Сравнение без учёта регистра, лишних пробелов и пробелов перед пунктуацией."""
    s = (text or "").lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([?!.,;:])", r"\1", s)
    s = re.sub(r"[`''']", "'", s)
    return s


def _is_trivial_correction(wrong: str, right: str) -> bool:
    """Пропускаем правки только по пунктуации, пробелам или регистру."""
    if not wrong or not right:
        return True
    if _normalize_compare(wrong) == _normalize_compare(right):
        return True

    words_w = re.findall(r"[\w']+", wrong.lower())
    words_r = re.findall(r"[\w']+", right.lower())
    if words_w and words_w == words_r:
        return True

    compact_wrong = re.sub(r"\s*([?!.,;:])", r"\1", wrong.strip())
    compact_right = re.sub(r"\s*([?!.,;:])", r"\1", right.strip())
    if compact_wrong.lower() == compact_right.lower():
        return True

    return False


def _normalize_corrections(
    raw_corrections: Any,
    *,
    user_text: str,
    corrected_message: str,
) -> list[dict[str, str]]:
    """Приводит corrections к единому виду; если список пуст, но есть corrected_message - одна правка целиком."""
    result: list[dict[str, str]] = []
    if isinstance(raw_corrections, list):
        for item in raw_corrections:
            if not isinstance(item, dict):
                continue
            wrong = str(item.get("wrong") or "").strip()
            right = str(item.get("right") or "").strip()
            wrong_line = str(item.get("wrong_line") or "").strip()
            right_line = str(item.get("right_line") or "").strip()
            if not wrong and wrong_line:
                wrong = wrong_line
            if not right and right_line:
                right = right_line
            if not wrong or not right:
                continue
            if user_text and wrong.lower() not in user_text.lower():
                continue
            if _is_trivial_correction(wrong, right):
                continue
            if wrong.lower() == right.lower():
                continue
            result.append(
                {
                    "wrong": wrong,
                    "right": right,
                    "wrong_line": wrong_line or wrong,
                    "right_line": right_line or right,
                    "type": str(item.get("type") or "grammar"),
                }
            )

    if not result and corrected_message.strip():
        orig = user_text.strip()
        fixed = corrected_message.strip()
        if orig and fixed and not _is_trivial_correction(orig, fixed):
            if _normalize_compare(orig) != _normalize_compare(fixed):
                result.append(
                    {
                        "wrong": orig,
                        "right": fixed,
                        "wrong_line": orig,
                        "right_line": fixed,
                        "type": "grammar",
                    }
                )
    return result


class SpeakTutorAI:
    def __init__(self) -> None:
        self.api_key = config.OPENROUTER_API_KEY
        self.base_url = config.OPENROUTER_BASE_URL
        self.model = config.SPEAK_OPENROUTER_MODEL
        self.fallback_models = config.SPEAK_OPENROUTER_FALLBACK_MODELS

    async def _chat(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1200,
        temperature: float = 0.7,
        json_mode: bool = False,
    ) -> Optional[str]:
        if not self.api_key or self.api_key == "your_openrouter_api_key":
            print("❌ OPENROUTER_API_KEY не настроен")
            return None

        models = [self.model] + [m for m in self.fallback_models if m != self.model]
        async with httpx.AsyncClient(**openrouter_client_kwargs(75.0)) as client:
            for model in models:
                try:
                    payload: dict[str, Any] = {
                        "model": model,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                    }
                    if json_mode:
                        payload["response_format"] = {"type": "json_object"}
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://alexol.io",
                            "X-Title": "Alexol Speak Tutor",
                        },
                        json=payload,
                    )
                    if response.status_code != 200:
                        body = format_openrouter_error_body(response)
                        print(f"⚠️ Speak AI {model}: HTTP {response.status_code} {body}")
                        if is_openrouter_security_block(response.status_code, body):
                            print(
                                "🚫 OpenRouter security policy (часто RU IP). "
                                "Задай OPENROUTER_HTTP_PROXY или HTTPS_PROXY вне РФ."
                            )
                            break
                        continue
                    data = response.json()
                    choices = data.get("choices") or []
                    if not choices:
                        continue
                    content = (choices[0].get("message") or {}).get("content") or ""
                    content = content.strip()
                    if content:
                        print(f"✅ Speak AI model: {model}")
                        return content
                except Exception as exc:
                    print(f"⚠️ Speak AI {model}: {exc}")
                    continue
        return None

    async def ask_for_topic(
        self,
        language: str,
        user_name: str,
        *,
        changing: bool = False,
    ) -> dict[str, Any]:
        """Голосовой вопрос о теме - готовый текст, без AI."""
        name = (user_name or "friend").strip() or "friend"
        templates = CHANGE_TOPIC_BY_LANG if changing else ASK_TOPIC_BY_LANG
        reply_tpl, trans_tpl = templates.get(language, templates["en"])
        return {
            "reply": reply_tpl.format(name=name),
            "reply_translation": trans_tpl.format(name=name),
        }

    async def begin_from_topic_choice(
        self,
        language: str,
        user_name: str,
        user_text: str,
        *,
        changing: bool = False,
    ) -> Optional[dict[str, Any]]:
        """Пользователь ответил на вопрос о теме - начинаем или переключаем разговор."""
        meta = LANG_META.get(language, LANG_META["en"])
        if changing:
            opening_rules = f"""This is a TOPIC SWITCH in an ongoing session - NOT the first message.
The learner already answered what they want to talk about next.

DO NOT greet again. DO NOT say "nice to meet you", "how are you", or ask "what would you like to talk about".
Give a smooth transition in {meta['name_en']} (1–2 short sentences + ONE question):
- If vague / "don't know" → pick a topic and jump in: "Great - let's talk about X. [question]"
- If they named a topic → brief ack + first real question: "Sure, [topic]! [question]"
- If role-play scenario → follow ROLE-PLAY rules below, stay in character immediately."""
        else:
            opening_rules = f"""The learner answered your question about what to talk about.

Analyze their message and decide:
- If they don't know / want a suggestion / say "anything" / "не знаю" / "предложи" / "not sure" → YOU pick a lively casual topic (today, work, hobbies, travel, food, movies, weekend plans).
- If they named a scenario or role-play topic (interview, restaurant, hotel, doctor, shopping…) → follow ROLE-PLAY rules below.
- If they named a casual topic → use it as a curious friend.

Then speak your OPENING in {meta['name_en']} (2–3 short sentences for a voice message):
1) Acknowledge warmly (if you picked the topic, say what and why it's interesting).
2) Ask ONE concrete question to start - setup question OR first real question (see rules)."""

        system = f"""You are Alexol Speak - a smart voice conversation partner for {meta['name_en']} practice.

{opening_rules}

{_topic_roleplay_rules()}

Return ONLY JSON:
{{
  "topic": "short topic label for session memory",
  "topic_mode": "roleplay|casual",
  "topic_context": "job field, role, or situation details if already known, else empty string",
  "bot_picked_topic": boolean,
  "reply": "spoken reply in {meta['name_en']}",
  "reply_translation": "Russian translation of reply"
}}

NEVER use helpdesk phrases. Be natural, curious, like a smart friend."""

        user = f'Learner name: {user_name or "friend"}\nTheir answer: "{user_text}"'
        raw = await self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=450,
            temperature=0.7,
            json_mode=True,
        )
        data = _parse_speak_response(raw or "")
        if data and data.get("reply") and _is_valid_spoken_reply(str(data.get("reply"))):
            data.setdefault("topic_mode", "casual")
            data.setdefault("topic_context", "")
            topic = (data.get("topic") or "").strip()
            if not topic or _is_vague_topic(topic):
                if data.get("bot_picked_topic"):
                    topic = user_text.strip()[:80] if not _is_vague_topic(user_text) else "daily life"
                else:
                    topic = user_text.strip() or "free conversation"
                if _is_vague_topic(topic):
                    topic = "daily life"
                data["topic"] = topic[:120]
            return data
        print(f"⚠️ begin_from_topic_choice AI failed, using fallback. raw={ (raw or '')[:200] }")
        return _fallback_begin_topic(language, user_text)

    async def start_conversation(
        self,
        language: str,
        user_name: str,
        topic_key: str = "random",
        custom_topic: str = "",
    ) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        topic_key = topic_key if topic_key in TOPICS else "random"
        _, topic_desc = TOPICS[topic_key]
        if topic_key == "custom" and custom_topic.strip():
            topic_desc = f"learner-chosen topic: {custom_topic.strip()}"

        style = random.choice(OPENING_STYLES)
        system = f"""You are Alexol Speak - an energetic voice conversation partner for language practice.
The learner practices {meta['name_en']}. Your reply will be spoken aloud as a voice message.

Topic focus: {topic_desc}
Opening style this turn: {style}

Write ONLY what you will SAY aloud (spoken dialogue), 1–3 short sentences in {meta['name_en']}.
You lead the chat: ask a concrete personal question. Be warm, curious, a bit playful.

HARD RULES:
- NEVER say "How can I help you", "How may I assist", "What do you need", or similar support-desk phrases.
- NEVER sound like a call center or FAQ bot.
- DO ask about real life: today, work, hobbies, food, plans, feelings, stories.
- Prefer questions like: What did you do today? Tell me a topic you want. What was the best part of your day?
- End with a clear question so the learner can answer by voice.
- Beginner-friendly vocabulary, natural spoken rhythm."""

        user = (
            f"Learner name: {user_name or 'friend'}. "
            "Return ONLY valid JSON with keys: "
            "reply (string, target language, spoken), "
            "reply_translation (string, Russian)."
        )
        raw = await self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=400,
            temperature=0.95,
        )
        data = _extract_json(raw or "")
        if data and data.get("reply"):
            return data
        if raw:
            return {"reply": raw, "reply_translation": ""}
        return None

    async def practice_turn(
        self,
        language: str,
        history: list[dict[str, str]],
        user_text: str,
        topic_key: str = "random",
        custom_topic: str = "",
        topic_mode: str = "",
        topic_context: str = "",
    ) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        topic_key = topic_key if topic_key in TOPICS else "random"
        _, topic_desc = TOPICS[topic_key]
        if custom_topic.strip():
            topic_desc = custom_topic.strip()

        session_info = _session_topic_block(
            custom_topic=custom_topic,
            topic_mode=topic_mode,
            topic_context=topic_context,
        )

        system = f"""You are Alexol Speak - a lively voice conversation partner AND careful grammar tutor.
Learner practices {meta['name_en']}. UI explanations language: Russian.
Your "reply" is spoken as a voice message - write natural speech, not a formal letter.

{session_info}

{_topic_roleplay_rules()}

For EACH user message you MUST:
1) Analyze real grammar, vocabulary, articles, prepositions, word order, tense, collocations.
2) List only REAL mistakes that affect correctness or natural meaning.
3) React to content and ask ONE concrete follow-up (stay in role for role-play topics).
4) Give Russian translation of your spoken reply.
5) If the learner clearly switches topic or scenario mid-conversation
   (e.g. "let's talk about food", "давай про путешествия", "switch to interview prep")
   → update "topic" and "topic_mode" in JSON.
   → In "reply": smooth transition ONLY - NO re-greeting, NO "nice to meet you",
     NO "how are you", NO asking what they want to talk about (they already said).
     Jump into the new topic with one concrete question.

If topic_mode is roleplay (e.g. interview): extract any new context from the user's message into topic_context in JSON.
For interview: once field/role is known → ask the NEXT interview question; never ask what to ask.

DO NOT flag as mistakes (leave corrections=[]):
- Spacing before punctuation: "and you ?" vs "and you?" - BOTH OK in chat.
- Missing/extra space around ? ! . ,
- Capitalization in casual chat: "hi" vs "Hi", "i'm" vs "I'm" unless clearly wrong.
- Informal but understandable phrasing if meaning is clear.
- Stylistic preferences when grammar is already acceptable.

ONLY flag: wrong words, wrong tense, missing/wrong articles, bad word order, wrong prepositions,
unnatural collocations, meaning-changing errors.

Return ONLY valid JSON:
{{
  "has_errors": boolean,
  "topic": "short topic label ONLY if learner changed topic this turn, else empty string",
  "topic_mode": "roleplay|casual - ONLY if topic/scenario changed this turn, else empty string",
  "topic_context": "updated context if learner gave new details (job title, field, etc.), else keep previous or empty",
  "corrections": [
    {{
      "wrong": "exact wrong fragment from the user text",
      "right": "corrected fragment",
      "wrong_line": "short phrase/clause containing the mistake (with the wrong words)",
      "right_line": "same phrase/clause fully corrected",
      "type": "grammar|vocabulary|article|preposition|word_order|tense|collocation|other"
    }}
  ],
  "corrected_message": "full corrected version of the user's message in {meta['name_en']}",
  "reply": "your spoken reply in {meta['name_en']} (1-3 short sentences, end with a question)",
  "reply_translation": "Russian translation of reply"
}}

HARD RULES:
- If there ARE real mistakes: has_errors=true and corrections MUST be non-empty.
- If the message is correct or only stylistic/punctuation: has_errors=false, corrections=[].
- wrong/right must be real substrings of wrong_line/right_line.
- Do NOT invent mistakes. Do NOT correct punctuation spacing.
- NEVER use helpdesk phrases ("How can I help you", etc.).
- React + ask (What happened next? How did you feel?).

Example - NO correction needed:
User: "hi i'm fine and you ?" → corrections=[] (casual chat, meaning clear)."""

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        for item in history[-8:]:
            role = item.get("role") or "user"
            content = item.get("content") or ""
            if content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_text})

        raw = await self._chat(messages, max_tokens=900, temperature=0.55, json_mode=True)
        data = _parse_speak_response(raw or "")
        if data and data.get("reply") and _is_valid_spoken_reply(str(data.get("reply"))):
            data["corrections"] = _normalize_corrections(
                data.get("corrections"),
                user_text=user_text,
                corrected_message=(data.get("corrected_message") or ""),
            )
            data["has_errors"] = bool(data["corrections"])
            data.setdefault("topic_context", topic_context or "")
            data.setdefault("topic", "")
            data.setdefault("topic_mode", "")
            return data
        print(f"⚠️ practice_turn AI failed, using fallback. raw={ (raw or '')[:200] }")
        return _fallback_practice_turn(language, user_text, topic_context)

    async def make_hint(
        self,
        language: str,
        history: list[dict[str, str]],
        last_bot_reply: str,
    ) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        system = f"""You help a learner answer aloud in {meta['name_en']}.
Explain in Russian what they can talk about (daily life, opinions, short stories),
give 3 short ready spoken phrases in {meta['name_en']} with Russian translations,
and one full example answer that sounds natural when spoken.
Return ONLY JSON:
{{
  "what_to_say": "Russian guidance paragraph",
  "phrases": [{{"en": "phrase", "ru": "перевод"}}],
  "example": "full example answer in {meta['name_en']}"
}}
Use key "en" for the target-language phrase even if the language is not English.
Avoid helpdesk phrases; keep it conversational."""

        context = last_bot_reply or ""
        if history:
            context = history[-1].get("content") or context

        raw = await self._chat(
            [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": f"Last tutor message to answer:\n{context}",
                },
            ],
            max_tokens=800,
            temperature=0.7,
        )
        data = _extract_json(raw or "")
        if data:
            return data
        return None

    async def explain_errors(
        self,
        language: str,
        user_text: str,
        corrections: list[dict[str, str]],
    ) -> Optional[str]:
        meta = LANG_META.get(language, LANG_META["en"])
        payload = json.dumps(corrections, ensure_ascii=False)
        raw = await self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        f"You explain {meta['name_en']} grammar mistakes to a Russian-speaking learner. "
                        "For each mistake: name the rule (articles, tense, preposition, collocation…), "
                        "why the original is wrong, and give 1 short correct example. "
                        "Answer in Russian, clear and structured with short paragraphs. No JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Original message:\n{user_text}\n\nCorrections JSON:\n{payload}",
                },
            ],
            max_tokens=900,
            temperature=0.4,
        )
        return raw

    async def pronunciation_feedback(self, language: str, user_text: str) -> Optional[str]:
        meta = LANG_META.get(language, LANG_META["en"])
        raw = await self._chat(
            [
                {
                    "role": "system",
                    "content": (
                        f"Give short pronunciation tips in Russian for saying this "
                        f"{meta['name_en']} phrase aloud. Mention stress and hard sounds. No JSON."
                    ),
                },
                {"role": "user", "content": user_text},
            ],
            max_tokens=500,
            temperature=0.5,
        )
        return raw
