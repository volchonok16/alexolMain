import feedparser
import aiohttp
import asyncio
import ssl
from bs4 import BeautifulSoup
from dataclasses import dataclass
from typing import Optional
import re
import random
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

from src.sources import SourcesManager
from src import database as db
import config


HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AlexolNewsBot/1.0; +https://alexol.io)",
    "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
}

_SSL_ERRORS = tuple(
    cls
    for cls in (
        ssl.SSLError,
        getattr(aiohttp, "ClientConnectorCertificateError", None),
        getattr(aiohttp, "ClientSSLError", None),
    )
    if cls is not None
)


@dataclass
class NewsArticle:
    title: str
    description: str
    link: str
    image_url: Optional[str] = None
    source: str = ""
    db_id: Optional[int] = None


class RSSParser:
    def __init__(self, feeds: list[str] = None):
        if feeds:
            self.feeds = feeds
        else:
            sources = SourcesManager()
            self.feeds = sources.get_enabled_rss_urls()

    def _to_utc(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _entry_published_utc(self, entry) -> Optional[datetime]:
        if getattr(entry, "published_parsed", None):
            try:
                # feedparser отдаёт struct_time в UTC
                return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            except Exception:
                pass
        published = getattr(entry, "published", None)
        if published:
            try:
                return self._to_utc(parsedate_to_datetime(published))
            except Exception:
                pass
        return None

    async def _get_feed_text(self, session: aiohttp.ClientSession, url: str) -> Optional[str]:
        timeout = aiohttp.ClientTimeout(total=30)
        try:
            async with session.get(url, timeout=timeout, headers=HTTP_HEADERS) as response:
                if response.status != 200:
                    print(f"⚠️ RSS {url}: HTTP {response.status}")
                    return None
                return await response.text()
        except _SSL_ERRORS as e:
            print(f"⚠️ RSS {url}: проблема SSL ({type(e).__name__}), пробуем без проверки сертификата")
            ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            async with session.get(url, timeout=timeout, headers=HTTP_HEADERS, ssl=ssl_ctx) as response:
                if response.status != 200:
                    print(f"⚠️ RSS {url}: HTTP {response.status}")
                    return None
                return await response.text()

    async def fetch_feed(self, session: aiohttp.ClientSession, url: str) -> list[NewsArticle]:
        articles = []
        try:
            content = await self._get_feed_text(session, url)
            if not content:
                return articles

            feed = feedparser.parse(content)
            source_name = feed.feed.get("title", url)
            max_age = timedelta(hours=config.NEWS_MAX_AGE_HOURS)
            now = datetime.now(timezone.utc)

            for entry in feed.entries[:25]:
                try:
                    published_time = self._entry_published_utc(entry)
                    if published_time and (now - published_time) > max_age:
                        continue

                    title = entry.get("title", "")
                    description = self._clean_html(entry.get("summary", entry.get("description", "")))
                    link = entry.get("link", "")
                    image_url = self._extract_image(entry)

                    if title and description:
                        if db.is_link_exists(link):
                            continue

                        post_id = db.save_parsed_post(
                            source_type="rss",
                            source_name=source_name,
                            title=title,
                            text=description[:2000],
                            link=link,
                            image_url=image_url,
                        )

                        articles.append(
                            NewsArticle(
                                title=title,
                                description=description[:2000],
                                link=link,
                                image_url=image_url,
                                source=source_name,
                                db_id=post_id,
                            )
                        )
                except Exception as e:
                    print(f"⚠️ Пропуск записи RSS {url}: {type(e).__name__}: {e}")
        except Exception as e:
            print(f"Ошибка при парсинге {url}: {e}")

        return articles

    def _clean_html(self, text: str) -> str:
        if not text:
            return ""
        soup = BeautifulSoup(text, "lxml")
        clean_text = soup.get_text(separator=" ", strip=True)
        clean_text = re.sub(r"\s+", " ", clean_text)
        return clean_text.strip()

    def _extract_image(self, entry: dict) -> Optional[str]:
        if "media_content" in entry:
            for media in entry.media_content:
                if media.get("medium") == "image" or media.get("type", "").startswith("image"):
                    return media.get("url")

        if "media_thumbnail" in entry:
            for thumb in entry.media_thumbnail:
                return thumb.get("url")

        if "enclosures" in entry:
            for enclosure in entry.enclosures:
                if enclosure.get("type", "").startswith("image"):
                    return enclosure.get("href") or enclosure.get("url")

        content = (
            entry.get("summary", "") + entry.get("content", [{}])[0].get("value", "")
            if entry.get("content")
            else entry.get("summary", "")
        )
        if content:
            soup = BeautifulSoup(content, "lxml")
            img = soup.find("img")
            if img and img.get("src"):
                return img.get("src")

        return None

    async def get_random_articles(self, count: int = 5) -> list[NewsArticle]:
        print(f"      📡 Парсинг {len(self.feeds)} RSS-лент...")
        async with aiohttp.ClientSession() as session:
            tasks = [self.fetch_feed(session, feed) for feed in self.feeds]
            results = await asyncio.gather(*tasks)

            all_articles = []
            for articles in results:
                all_articles.extend(articles)

            print(f"      ✅ Найдено {len(all_articles)} новых статей")

            if len(all_articles) > count:
                return random.sample(all_articles, count)
            return all_articles

    async def get_latest_article(self) -> Optional[NewsArticle]:
        articles = await self.get_random_articles(1)
        return articles[0] if articles else None
