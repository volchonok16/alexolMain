import asyncio
import re
import aiohttp
from bs4 import BeautifulSoup
from typing import Optional
from dataclasses import dataclass
from pathlib import Path

from src.sources import SourcesManager
from src import database as db
import config


@dataclass
class TelegramPost:
    text: str
    image_url: Optional[str] = None
    channel: str = ""
    post_url: str = ""
    db_id: Optional[int] = None


class TelegramParser:
    def __init__(self):
        sources = SourcesManager()
        self.channels = sources.get_enabled_telegram_channels()
        self.client = None
        self.use_tdata = False
        self._tdata_init_done = False

    def _resolve_tdata_path(self) -> Optional[Path]:
        """Return a tdata folder that actually contains key_data, or None."""
        raw = Path(config.TDATA_PATH)
        for path in (raw, raw / "tdata"):
            if (path / "key_data").is_file():
                return path
        return None

    def _describe_tdata(self, path: Path) -> str:
        if not path.exists():
            return "путь не существует"
        if path.is_file():
            return "это файл, нужна папка tdata"
        try:
            names = sorted(p.name for p in path.iterdir())
        except OSError as e:
            return f"не удалось прочитать каталог: {e}"
        if not names:
            return "папка пустая"
        preview = ", ".join(names[:12])
        extra = f" (+{len(names) - 12})" if len(names) > 12 else ""
        return f"содержимое: {preview}{extra}"

    async def _init_client(self):
        if self.client:
            return True
        if self._tdata_init_done:
            return False

        self._tdata_init_done = True
        tdata_path = self._resolve_tdata_path()

        if tdata_path is None:
            configured = Path(config.TDATA_PATH)
            print(
                f"⚠️ tdata неполный или отсутствует ({configured}: {self._describe_tdata(configured)}). "
                "Нужен файл key_data из папки Telegram Desktop/tdata. Используем веб-парсинг."
            )
            return False

        try:
            from opentele.td import TDesktop
            from opentele.api import UseCurrentSession
        except ImportError:
            print("⚠️ opentele не установлен, используем веб-парсинг")
            return False

        try:
            print(f"📂 Загрузка tdata из: {tdata_path}")

            tdesk = TDesktop(str(tdata_path))

            if not tdesk.isLoaded():
                print("❌ Не удалось загрузить tdata, используем веб-парсинг")
                return False

            session_path = Path("data/parser_session")
            session_path.parent.mkdir(parents=True, exist_ok=True)

            self.client = await tdesk.ToTelethon(session=str(session_path), flag=UseCurrentSession)

            await self.client.connect()

            if not await self.client.is_user_authorized():
                print("❌ Сессия не авторизована, используем веб-парсинг")
                await self.client.disconnect()
                self.client = None
                return False

            me = await self.client.get_me()
            print(f"✅ Telegram клиент подключён: {me.first_name} (@{me.username})")
            self.use_tdata = True
            return True

        except BaseException as e:
            # opentele.OpenTeleException inherits from BaseException, not Exception
            if isinstance(e, (KeyboardInterrupt, SystemExit, asyncio.CancelledError)):
                raise
            print(f"⚠️ Ошибка загрузки tdata: {e}")
            print("   Используем веб-парсинг публичных каналов.")
            if self.client:
                try:
                    await self.client.disconnect()
                except Exception:
                    pass
                self.client = None
            return False

    async def fetch_channel_api(self, username: str, limit: int = 10) -> list[TelegramPost]:
        posts = []

        if not self.client:
            return posts

        try:
            entity = await self.client.get_entity(username)
            messages = await self.client.get_messages(entity, limit=limit)

            for msg in messages:
                if not msg.text or len(msg.text) < 100:
                    continue

                post_url = f"https://t.me/{username}/{msg.id}"

                if db.is_link_exists(post_url):
                    continue

                image_url = None
                if msg.photo:
                    try:
                        photo_path = Path(f"data/images/{username}_{msg.id}.jpg")
                        photo_path.parent.mkdir(parents=True, exist_ok=True)
                        await self.client.download_media(msg.photo, str(photo_path))
                        image_url = str(photo_path)
                    except Exception:
                        pass

                post_id = db.save_parsed_post(
                    source_type="telegram",
                    source_name=f"@{username}",
                    title=msg.text[:100] + "..." if len(msg.text) > 100 else msg.text,
                    text=msg.text,
                    link=post_url,
                    image_url=image_url,
                )

                if post_id:
                    posts.append(
                        TelegramPost(
                            text=msg.text,
                            image_url=image_url,
                            channel=f"@{username}",
                            post_url=post_url,
                            db_id=post_id,
                        )
                    )

        except Exception as e:
            print(f"❌ Ошибка парсинга @{username}: {e}")

        return posts

    async def fetch_channel_web(self, username: str, limit: int = 10) -> list[TelegramPost]:
        posts = []
        url = f"https://t.me/s/{username}"

        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; AlexolNewsBot/1.0; +https://alexol.io)",
            "Accept": "text/html,application/xhtml+xml",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30), headers=headers) as response:
                    if response.status != 200:
                        print(f"⚠️ Канал @{username} недоступен публично")
                        return posts

                    html = await response.text()
                    soup = BeautifulSoup(html, "lxml")

                    messages = soup.find_all("div", class_="tgme_widget_message")

                    for msg in messages[-limit:]:
                        text_div = msg.find("div", class_="tgme_widget_message_text")
                        if not text_div:
                            continue

                        text = text_div.get_text(separator="\n", strip=True)
                        if len(text) < 100:
                            continue

                        post_link = msg.get("data-post", "")
                        post_url = f"https://t.me/{post_link}" if post_link else ""

                        if post_url and db.is_link_exists(post_url):
                            continue

                        image_url = None
                        photo_wrap = msg.find("a", class_="tgme_widget_message_photo_wrap")
                        if photo_wrap:
                            style = photo_wrap.get("style", "")
                            url_match = re.search(r"url\(['\"]([^'\"]+)['\"]\)", style)
                            if url_match:
                                image_url = url_match.group(1)

                        post_id = db.save_parsed_post(
                            source_type="telegram",
                            source_name=f"@{username}",
                            title=text[:100] + "..." if len(text) > 100 else text,
                            text=text,
                            link=post_url,
                            image_url=image_url,
                        )

                        if post_id:
                            posts.append(
                                TelegramPost(
                                    text=text,
                                    image_url=image_url,
                                    channel=f"@{username}",
                                    post_url=post_url,
                                    db_id=post_id,
                                )
                            )

        except Exception as e:
            print(f"❌ Ошибка веб-парсинга @{username}: {e}")

        return posts

    async def fetch_channel(self, username: str, limit: int = 10) -> list[TelegramPost]:
        if self.use_tdata or await self._init_client():
            return await self.fetch_channel_api(username, limit)
        return await self.fetch_channel_web(username, limit)

    async def fetch_all_channels(self, limit_per_channel: int = 5) -> list[TelegramPost]:
        all_posts = []

        if not self.channels:
            return all_posts

        try:
            await self._init_client()

            for channel in self.channels:
                posts = await self.fetch_channel(channel, limit_per_channel)
                all_posts.extend(posts)
                method = "API" if self.use_tdata else "WEB"
                print(f"📱 [{method}] @{channel}: {len(posts)} новых постов")
        except BaseException as e:
            if isinstance(e, (KeyboardInterrupt, SystemExit, asyncio.CancelledError)):
                raise
            print(f"⚠️ Парсинг Telegram-каналов пропущен: {e}")

        return all_posts

    async def close(self):
        if self.client:
            await self.client.disconnect()

