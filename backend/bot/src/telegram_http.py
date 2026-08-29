"""Stable HTTP client for Telegram Bot API.

HTTP/2 to api.telegram.org often returns 502 Bad Gateway; python-telegram-bot
then logs a full traceback while retrying. HTTP/1.1 avoids that path.
"""
from __future__ import annotations

import logging

from telegram.error import NetworkError, TimedOut
from telegram.ext import ApplicationBuilder
from telegram.request import HTTPXRequest

import config


class _OmitTransientPollingTraceback(logging.Filter):
    """PTB logs a full traceback on every Telegram 502; keep one warning line."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not record.exc_info or record.exc_info[0] is None:
            return True
        if issubclass(record.exc_info[0], (NetworkError, TimedOut)):
            record.exc_info = None
            record.levelno = logging.WARNING
            record.levelname = "WARNING"
        return True


def _quiet_transient_polling_logs() -> None:
    for name in ("telegram.ext._updater", "telegram.ext.Updater"):
        logging.getLogger(name).addFilter(_OmitTransientPollingTraceback())


_quiet_transient_polling_logs()


def telegram_request(*, for_get_updates: bool = False) -> HTTPXRequest:
    read_timeout = 32.0 if for_get_updates else 20.0
    kwargs: dict = {
        "connect_timeout": 20.0,
        "read_timeout": read_timeout,
        "write_timeout": 20.0,
        "pool_timeout": 5.0,
        "http_version": "1.1",
    }
    if config.TELEGRAM_HTTP_PROXY:
        kwargs["proxy"] = config.TELEGRAM_HTTP_PROXY
    return HTTPXRequest(**kwargs)


def application_builder(token: str) -> ApplicationBuilder:
    return (
        Application.builder()
        .token(token)
        .request(telegram_request())
        .get_updates_request(telegram_request(for_get_updates=True))
    )
