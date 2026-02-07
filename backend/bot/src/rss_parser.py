import feedparser
import aiohttp
import asyncio
from bs4 import BeautifulSoup
from dataclasses import dataclass
from typing import Optional
import re
import random
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

from src.sources import SourcesManager
from src import database as db
import config


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

    async def fetch_feed(self, session: aiohttp.ClientSession, url: str) -> list[NewsArticle]:
        articles = []
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                content = await response.text()
                feed = feedparser.parse(content)

                source_name = feed.feed.get("title", url)

                max_age = timedelta(hours=config.NEWS_MAX_AGE_HOURS)
                now = datetime.now()

                for entry in feed.entries[:10]:
                    published_time = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        try:
                            published_time = datetime(*entry.published_parsed[:6])
                        except Exception:
                            pass
                    elif hasattr(entry, "published"):
                        try:
                            published_time = parsedate_to_datetime(entry.published)
                        except Exception:
                            pass

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

