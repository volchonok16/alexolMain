import json
import re
from pathlib import Path
from typing import Optional


EMOJIS_FILE = Path("emojis.json")


class EmojiHandler:
    def __init__(self):
        self.custom_emojis = {}
        self.use_custom = False
        self._load()

    def _load(self):
        if not EMOJIS_FILE.exists():
            return

        try:
            with open(EMOJIS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.custom_emojis = data.get("custom_emojis", {})
            self.use_custom = len(self.custom_emojis) > 0
        except Exception as e:
            print(f"⚠️ Ошибка загрузки emojis.json: {e}")

    def get_emoji_list_for_prompt(self) -> str:
        if not self.use_custom:
            return "🔥 💡 ⚡ 🚀 💻 🔐 📱 🌐 ✅ ⭐ 📊 🎯 💼 🔧 📈"

        emoji_hints = []
        for name, data in self.custom_emojis.items():
            emoji_hints.append(f"{data['placeholder']} (вместо {data['fallback']})")

        return (
            ", ".join(emoji_hints)
            + "\n\nТакже можешь использовать обычные: 💡 💻 🔐 📱 🌐 📊 🎯 💼 🔧 📈"
        )

    def escape_html_safe(self, text: str, preserve_tags: bool = False) -> str:
        """Экранирует HTML, но может сохранять валидные Telegram HTML-теги"""
        if not preserve_tags:
            text = text.replace("&", "&amp;")
            text = text.replace("<", "&lt;")
            text = text.replace(">", "&gt;")
            return text

        valid_tags_pattern = r'<(/?)(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-emoji)([^>]*)>'

        parts = []
        last_end = 0

        for match in re.finditer(valid_tags_pattern, text, re.IGNORECASE):
            start, end = match.span()

            if start > last_end:
                plain_text = text[last_end:start]
                plain_text = plain_text.replace("&", "&amp;")
                plain_text = plain_text.replace("<", "&lt;")
                plain_text = plain_text.replace(">", "&gt;")
                parts.append(plain_text)

            parts.append(match.group(0))
            last_end = end

        if last_end < len(text):
            plain_text = text[last_end:]
            plain_text = plain_text.replace("&", "&amp;")
            plain_text = plain_text.replace("<", "&lt;")
            plain_text = plain_text.replace(">", "&gt;")
            parts.append(plain_text)

        return "".join(parts)

    def process_text(self, text: str) -> tuple[str, bool]:
        if not self.use_custom:
            return text, False

        # Проверяем, есть ли HTML-теги форматирования
        has_html_tags = bool(
            re.search(
                r"<(b|strong|i|em|u|ins|s|strike|del|code|pre|a)[^>]*>",
                text,
                re.IGNORECASE,
            )
        )

        placeholder_map = {
            data["placeholder"]: f'<tg-emoji emoji-id="{data["id"]}">{data["fallback"]}</tg-emoji>'
            for data in self.custom_emojis.values()
            if data.get("placeholder") and data.get("id") and data.get("fallback")
        }
        if not placeholder_map:
            return text, False

        pattern = re.compile("|".join(re.escape(p) for p in sorted(placeholder_map, key=len, reverse=True)))
        parts = []
        last_end = 0

        for match in pattern.finditer(text):
            start, end = match.span()
            if start > last_end:
                parts.append(self.escape_html_safe(text[last_end:start], preserve_tags=has_html_tags))
            parts.append(placeholder_map[match.group(0)])
            last_end = end

        if last_end == 0:
            return text, False

        if last_end < len(text):
            parts.append(self.escape_html_safe(text[last_end:], preserve_tags=has_html_tags))

        return "".join(parts), True

    def prepare_for_telegram(self, text: str) -> tuple[str, Optional[str]]:
        """Подготавливает текст для Telegram с поддержкой HTML-форматирования"""
        has_html_tags = bool(
            re.search(
                r"<(b|strong|i|em|u|ins|s|strike|del|code|pre|a)[^>]*>",
                text,
                re.IGNORECASE,
            )
        )

        if not self.use_custom and not has_html_tags:
            return text, None

        if self.use_custom:
            processed, has_custom = self.process_text(text)
            if has_custom:
                return processed, "HTML"

        if has_html_tags:
            processed = self.escape_html_safe(text, preserve_tags=True)
            return processed, "HTML"

        return text, None

    def prepare_for_vk(self, text: str) -> str:
        """Подготавливает текст для VK - убирает HTML, оставляет эмодзи и форматирование через символы"""
        result = text

        result = re.sub(r"<b[^>]*>(.*?)</b>", r"【\1】", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(
            r"<strong[^>]*>(.*?)</strong>", r"【\1】", result, flags=re.IGNORECASE | re.DOTALL
        )

        result = re.sub(r"<i[^>]*>(.*?)</i>", r"✦\1✦", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<em[^>]*>(.*?)</em>", r"✦\1✦", result, flags=re.IGNORECASE | re.DOTALL)

        result = re.sub(
            r"<code[^>]*>(.*?)</code>", r"「\1」", result, flags=re.IGNORECASE | re.DOTALL
        )

        result = re.sub(r"<u[^>]*>(.*?)</u>", r"\1", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<ins[^>]*>(.*?)</ins>", r"\1", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<s[^>]*>(.*?)</s>", r"\1", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<strike[^>]*>(.*?)</strike>", r"\1", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<del[^>]*>(.*?)</del>", r"\1", result, flags=re.IGNORECASE | re.DOTALL)

        result = re.sub(
            r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
            r"\2 (\1)",
            result,
            flags=re.IGNORECASE | re.DOTALL,
        )

        result = re.sub(r"<tg-emoji[^>]*>([^<]*)</tg-emoji>", r"\1", result, flags=re.IGNORECASE)

        result = re.sub(r"<[^>]+>", "", result)

        result = result.replace("&amp;", "&")
        result = result.replace("&lt;", "<")
        result = result.replace("&gt;", ">")
        result = result.replace("&quot;", '"')
        result = result.replace("&#39;", "'")

        lines = result.split("\n")
        cleaned_lines = []
        for line in lines:
            cleaned_line = " ".join(line.split())
            cleaned_lines.append(cleaned_line)

        result = "\n".join(cleaned_lines)

        while "\n\n\n" in result:
            result = result.replace("\n\n\n", "\n\n")

        return result.strip()

