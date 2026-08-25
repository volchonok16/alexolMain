"""Настройки Alexol Speak: скорость озвучки."""

from __future__ import annotations

# key → (speed float for Flux TTS, label RU)
SPEECH_SPEED_PRESETS: dict[str, tuple[float, str]] = {
    "slow": (0.85, "🐢 Медленно (A2)"),
    "b1": (0.95, "📘 B1 — по умолчанию"),
    "normal": (1.0, "⚡ Обычная"),
    "fast": (1.1, "🚀 Быстрая"),
}

DEFAULT_SPEECH_SPEED_KEY = "b1"

WHISPER_LANGUAGE_PROMPTS = {
    "en": "English language conversation.",
    "es": "Conversación en español.",
    "fr": "Conversation en français.",
    "de": "Deutsch Konversation.",
}


def speed_key_from_session(session: dict) -> str:
    key = (session.get("speech_speed") or DEFAULT_SPEECH_SPEED_KEY).strip().lower()
    return key if key in SPEECH_SPEED_PRESETS else DEFAULT_SPEECH_SPEED_KEY


def speed_value_from_session(session: dict) -> float:
    key = speed_key_from_session(session)
    return SPEECH_SPEED_PRESETS[key][0]


def speed_label(key: str) -> str:
    return SPEECH_SPEED_PRESETS.get(key, SPEECH_SPEED_PRESETS[DEFAULT_SPEECH_SPEED_KEY])[1]
