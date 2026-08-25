"""Language tutor AI via the same OpenRouter stack as the news bot.

Does NOT reuse news response cleaning (it strips English words).
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

import httpx

import config

LANG_META = {
    "en": {"name_ru": "английский", "name_en": "English", "code": "en"},
    "es": {"name_ru": "испанский", "name_en": "Spanish", "code": "es"},
    "fr": {"name_ru": "французский", "name_en": "French", "code": "fr"},
}


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None
    text = text.strip()
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


class SpeakTutorAI:
    def __init__(self) -> None:
        self.api_key = config.OPENROUTER_API_KEY
        self.base_url = config.OPENROUTER_BASE_URL
        self.model = config.OPENROUTER_MODEL
        self.fallback_models = config.OPENROUTER_FALLBACK_MODELS

    async def _chat(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1200,
        temperature: float = 0.7,
    ) -> Optional[str]:
        if not self.api_key or self.api_key == "your_openrouter_api_key":
            print("❌ OPENROUTER_API_KEY не настроен")
            return None

        models = [self.model] + [m for m in self.fallback_models if m != self.model]
        async with httpx.AsyncClient(timeout=90.0) as client:
            for model in models:
                try:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://alexol.io",
                            "X-Title": "Alexol Speak Tutor",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "max_tokens": max_tokens,
                            "temperature": temperature,
                        },
                    )
                    if response.status_code != 200:
                        print(f"⚠️ Speak AI {model}: HTTP {response.status_code}")
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

    async def start_conversation(self, language: str, user_name: str) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        system = (
            f"You are Alexol Speak, a friendly language practice partner. "
            f"The learner practices {meta['name_en']}. "
            "Start a natural casual conversation with one short spoken line (1-2 sentences) "
            "in the target language, then ask a simple question. "
            "Keep it beginner-friendly and warm."
        )
        user = (
            f"Learner name: {user_name or 'friend'}. "
            "Return ONLY valid JSON with keys: "
            "reply (string, target language), "
            "reply_translation (string, Russian)."
        )
        raw = await self._chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=400,
            temperature=0.85,
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
    ) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        system = f"""You are Alexol Speak — a language tutor and conversation partner.
Learner practices {meta['name_en']}. UI language for explanations is Russian.

Tasks for each user message:
1) Find grammar/vocabulary/word-order mistakes (ignore tiny typos if meaning is clear).
2) Continue the conversation naturally in {meta['name_en']} (1-3 short sentences, end with a question when natural).
3) Give a Russian translation of your reply.

Return ONLY valid JSON:
{{
  "has_errors": boolean,
  "corrections": [
    {{"wrong": "exact wrong fragment", "right": "corrected fragment"}}
  ],
  "corrected_message": "full corrected version of the user's message in {meta['name_en']}",
  "reply": "your spoken reply in {meta['name_en']}",
  "reply_translation": "Russian translation of reply"
}}

Rules:
- corrections: only real mistakes; empty array if none.
- wrong/right must be short phrases from the sentence, not the whole essay.
- Do not invent mistakes.
- Keep reply conversational, not lecture-like."""

        messages: list[dict[str, str]] = [{"role": "system", "content": system}]
        for item in history[-8:]:
            role = item.get("role") or "user"
            content = item.get("content") or ""
            if content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_text})

        raw = await self._chat(messages, max_tokens=1200, temperature=0.6)
        data = _extract_json(raw or "")
        if data and data.get("reply"):
            if not isinstance(data.get("corrections"), list):
                data["corrections"] = []
            data["has_errors"] = bool(data.get("has_errors") or data["corrections"])
            return data
        if raw:
            return {
                "has_errors": False,
                "corrections": [],
                "corrected_message": user_text,
                "reply": raw,
                "reply_translation": "",
            }
        return None

    async def make_hint(
        self,
        language: str,
        history: list[dict[str, str]],
        last_bot_reply: str,
    ) -> Optional[dict[str, Any]]:
        meta = LANG_META.get(language, LANG_META["en"])
        system = f"""You help a learner answer in {meta['name_en']}.
Explain in Russian what they can talk about, give 3 short ready phrases in {meta['name_en']}
with Russian translations, and one full example answer.
Return ONLY JSON:
{{
  "what_to_say": "Russian guidance paragraph",
  "phrases": [{{"en": "phrase", "ru": "перевод"}}],
  "example": "full example answer in {meta['name_en']}"
}}
Use key "en" for the target-language phrase even if the language is not English."""

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
                        f"Explain language mistakes for a {meta['name_en']} learner. "
                        "Answer in Russian, short and clear, with examples. No JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Original: {user_text}\nCorrections JSON: {payload}",
                },
            ],
            max_tokens=700,
            temperature=0.5,
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
