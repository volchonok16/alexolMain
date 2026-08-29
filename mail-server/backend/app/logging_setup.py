"""Keep docker logs readable: SQL, IMAP polling, aiosmtpd chatter stay off INFO."""
from __future__ import annotations

import logging
import warnings


def configure_quiet_logging() -> None:
    for name in (
        "sqlalchemy.engine",
        "sqlalchemy.engine.Engine",
        "sqlalchemy.pool",
        "sqlalchemy.dialects",
        "mail.log",
        "mail.debug",
        "aiosmtpd",
        "aiosmtpd.smtp",
        "uvicorn.access",
        "httpx",
        "httpcore",
    ):
        logging.getLogger(name).setLevel(logging.WARNING)

    logging.getLogger("mail.log").setLevel(logging.ERROR)
    warnings.filterwarnings(
        "ignore",
        message="Requiring AUTH while not requiring TLS",
    )
