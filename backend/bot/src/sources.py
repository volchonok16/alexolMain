import json
from pathlib import Path
from dataclasses import dataclass


SOURCES_FILE = Path("sources.json")


@dataclass
class RSSSource:
    url: str
    name: str
    enabled: bool = True


@dataclass
class TelegramSource:
    username: str
    name: str
    enabled: bool = True


class SourcesManager:
    def __init__(self):
        self.rss_feeds: list[RSSSource] = []
        self.telegram_channels: list[TelegramSource] = []
        self._load()

    def _load(self):
        if not SOURCES_FILE.exists():
            self._create_default()

        with open(SOURCES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.rss_feeds = [RSSSource(**feed) for feed in data.get("rss_feeds", [])]
        self.telegram_channels = [TelegramSource(**channel) for channel in data.get("telegram_channels", [])]

    def _create_default(self):
        default_data = {
            "rss_feeds": [
                {"url": "https://habr.com/ru/rss/best/daily/", "name": "Habr", "enabled": True},
            ],
            "telegram_channels": [],
        }
        with open(SOURCES_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)

    def save(self):
        data = {
            "rss_feeds": [{"url": s.url, "name": s.name, "enabled": s.enabled} for s in self.rss_feeds],
            "telegram_channels": [
                {"username": s.username, "name": s.name, "enabled": s.enabled} for s in self.telegram_channels
            ],
        }
        with open(SOURCES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_enabled_rss_urls(self) -> list[str]:
        return [feed.url for feed in self.rss_feeds if feed.enabled]

    def get_enabled_telegram_channels(self) -> list[str]:
        return [channel.username for channel in self.telegram_channels if channel.enabled]

    def add_rss(self, url: str, name: str):
        self.rss_feeds.append(RSSSource(url=url, name=name, enabled=True))
        self.save()

    def add_telegram(self, username: str, name: str):
        self.telegram_channels.append(TelegramSource(username=username, name=name, enabled=True))
        self.save()

    def toggle_rss(self, url: str, enabled: bool):
        for feed in self.rss_feeds:
            if feed.url == url:
                feed.enabled = enabled
                break
        self.save()

    def toggle_telegram(self, username: str, enabled: bool):
        for channel in self.telegram_channels:
            if channel.username == username:
                channel.enabled = enabled
                break
        self.save()

    def remove_rss(self, url: str):
        self.rss_feeds = [f for f in self.rss_feeds if f.url != url]
        self.save()

    def remove_telegram(self, username: str):
        self.telegram_channels = [c for c in self.telegram_channels if c.username != username]
        self.save()

