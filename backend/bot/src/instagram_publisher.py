import asyncio
import random
from typing import Optional
from pathlib import Path

import config


class InstagramPublisher:
    def __init__(self):
        self.username = config.INSTAGRAM_USERNAME
        self.password = config.INSTAGRAM_PASSWORD
        self.client = None
        self.enabled = bool(self.username and self.password)

    async def _init_client(self):
        if self.client:
            return True

        if not self.enabled:
            return False

        try:
            from instagrapi import Client
            from instagrapi.exceptions import LoginRequired

            self.client = Client()
            self.client.delay_range = [2, 5]

            session_file = Path("data/instagram_session.json")
            loop = asyncio.get_event_loop()
            import concurrent.futures

            def do_login():
                if session_file.exists():
                    try:
                        self.client.load_settings(str(session_file))
                        self.client.login(self.username, self.password)
                        return "restored"
                    except LoginRequired:
                        self.client.login(self.username, self.password)
                        self.client.dump_settings(str(session_file))
                        return "relogin"
                else:
                    self.client.login(self.username, self.password)
                    self.client.dump_settings(str(session_file))
                    return "first"

            with concurrent.futures.ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(executor, do_login)
                if result == "restored":
                    print("   ✅ Instagram: сессия восстановлена")
                elif result == "relogin":
                    print("   ⚠️ Instagram: сессия устарела, перелогиниваемся...")
                else:
                    print("   📱 Instagram: первый вход...")

            print(f"   ✅ Instagram подключён: @{self.username}")
            return True

        except ImportError:
            print("   ⚠️ instagrapi не установлен. Установи: pip install instagrapi")
            return False
        except Exception as e:
            print(f"   ❌ Ошибка подключения к Instagram: {e}")
            return False

    async def publish_post(self, text: str, image_data: Optional[bytes] = None) -> bool:
        if not self.enabled:
            return False

        try:
            if not await self._init_client():
                return False

            if not image_data or len(image_data) < 1000:
                print("   ❌ Instagram: нет изображения")
                return False

            clean_text = self._prepare_text_for_instagram(text)

            if len(clean_text) > 2200:
                clean_text = clean_text[:2197] + "..."
                print("   ⚠️ Instagram: текст обрезан до 2200 символов")

            temp_image = Path("data/temp_instagram.jpg")
            temp_image.parent.mkdir(parents=True, exist_ok=True)

            with open(temp_image, "wb") as f:
                f.write(image_data)

            await asyncio.sleep(random.uniform(2, 5))

            import concurrent.futures

            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    lambda: self.client.photo_upload(str(temp_image), caption=clean_text),
                )

            temp_image.unlink()

            print(f"   ✅ Instagram: пост опубликован (ID: {result.pk})")
            return True

        except Exception as e:
            print(f"   ❌ Ошибка публикации в Instagram: {e}")
            return False

    def _prepare_text_for_instagram(self, text: str) -> str:
        import re

        result = text

        result = re.sub(r"<b[^>]*>(.*?)</b>", r"*\1*", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<strong[^>]*>(.*?)</strong>", r"*\1*", result, flags=re.IGNORECASE | re.DOTALL)

        result = re.sub(r"<i[^>]*>(.*?)</i>", r"_\1_", result, flags=re.IGNORECASE | re.DOTALL)
        result = re.sub(r"<em[^>]*>(.*?)</em>", r"_\1_", result, flags=re.IGNORECASE | re.DOTALL)

        result = re.sub(r"<code[^>]*>(.*?)</code>", r"`\1`", result, flags=re.IGNORECASE | re.DOTALL)

        result = re.sub(r"<[^>]+>", "", result)

        result = result.replace("&amp;", "&")
        result = result.replace("&lt;", "<")
        result = result.replace("&gt;", ">")
        result = result.replace("&quot;", '"')

        lines = result.split("\n")
        cleaned_lines = []
        for line in lines:
            cleaned_line = " ".join(line.split())
            if cleaned_line:
                cleaned_lines.append(cleaned_line)

        return "\n".join(cleaned_lines)

