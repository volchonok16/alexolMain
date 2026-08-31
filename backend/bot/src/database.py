import sqlite3
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

import config


DB_PATH = Path("data/posts.db")


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS parsed_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_type TEXT NOT NULL,
            source_name TEXT NOT NULL,
            original_title TEXT NOT NULL,
            original_text TEXT NOT NULL,
            original_link TEXT UNIQUE,
            image_url TEXT,
            parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used INTEGER DEFAULT 0
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS generated_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parsed_post_id INTEGER,
            generated_text TEXT NOT NULL,
            image_path TEXT,
            published INTEGER DEFAULT 0,
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parsed_post_id) REFERENCES parsed_posts(id)
        )
    """
    )

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_parsed_used ON parsed_posts(used)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_published ON generated_posts(published)")

    conn.commit()
    conn.close()


def save_parsed_post(
    source_type: str,
    source_name: str,
    title: str,
    text: str,
    link: str,
    image_url: Optional[str] = None,
) -> Optional[int]:
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO parsed_posts (source_type, source_name, original_title, original_text, original_link, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (source_type, source_name, title, text, link, image_url),
        )
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def get_unused_parsed_post() -> Optional[dict]:
    posts = get_unused_parsed_posts(1)
    return posts[0] if posts else None


def get_unused_parsed_posts(count: int = 5) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()

    max_age = timedelta(hours=config.NEWS_MAX_AGE_HOURS)
    cutoff_time = datetime.now() - max_age

    cursor.execute(
        """
        SELECT * FROM parsed_posts
        WHERE used = 0
        AND datetime(parsed_at) >= datetime(?)
        ORDER BY RANDOM()
        LIMIT ?
    """,
        (cutoff_time.isoformat(), count),
    )

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def mark_parsed_post_used(post_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE parsed_posts SET used = 1 WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()


def mark_old_posts_as_used():
    conn = get_connection()
    cursor = conn.cursor()

    max_age = timedelta(hours=config.NEWS_MAX_AGE_HOURS)
    cutoff_time = datetime.now() - max_age

    cursor.execute(
        """
        UPDATE parsed_posts
        SET used = 1
        WHERE used = 0
        AND datetime(parsed_at) < datetime(?)
    """,
        (cutoff_time.isoformat(),),
    )

    updated = cursor.rowcount
    conn.commit()
    conn.close()

    return updated


def cleanup_old_posts():
    conn = get_connection()
    cursor = conn.cursor()

    cleanup_days = timedelta(days=config.CLEANUP_DAYS)
    cutoff_time = datetime.now() - cleanup_days

    cursor.execute(
        """
        DELETE FROM generated_posts
        WHERE datetime(created_at) < datetime(?)
    """,
        (cutoff_time.isoformat(),),
    )
    deleted_generated = cursor.rowcount

    cursor.execute(
        """
        DELETE FROM parsed_posts
        WHERE datetime(parsed_at) < datetime(?)
    """,
        (cutoff_time.isoformat(),),
    )
    deleted_parsed = cursor.rowcount

    conn.commit()
    conn.close()

    return deleted_parsed, deleted_generated


def is_link_exists(link: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM parsed_posts WHERE original_link = ?", (link,))
    exists = cursor.fetchone() is not None
    conn.close()
    return exists


def save_generated_post(
    parsed_post_id: Optional[int],
    generated_text: str,
    image_path: Optional[str] = None,
) -> int:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO generated_posts (parsed_post_id, generated_text, image_path)
        VALUES (?, ?, ?)
    """,
        (parsed_post_id, generated_text, image_path),
    )

    conn.commit()
    post_id = cursor.lastrowid
    conn.close()
    return post_id


def mark_post_published(post_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE generated_posts
        SET published = 1, published_at = ?
        WHERE id = ?
    """,
        (datetime.now(), post_id),
    )
    conn.commit()
    conn.close()


def get_last_news_published_at() -> Optional[datetime]:
    """Время последней опубликованной новости (не промо-поста без исходника)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT published_at FROM generated_posts
        WHERE published = 1 AND parsed_post_id IS NOT NULL AND published_at IS NOT NULL
        ORDER BY datetime(published_at) DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    raw = row["published_at"]
    if isinstance(raw, datetime):
        return raw
    text = str(raw).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def get_stats() -> dict:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM parsed_posts")
    total_parsed = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM parsed_posts WHERE used = 0")
    unused_parsed = cursor.fetchone()[0]

    max_age = timedelta(hours=config.NEWS_MAX_AGE_HOURS)
    cutoff_time = datetime.now() - max_age
    cursor.execute(
        """
        SELECT COUNT(*) FROM parsed_posts
        WHERE used = 0
        AND datetime(parsed_at) >= datetime(?)
    """,
        (cutoff_time.isoformat(),),
    )
    fresh_unused = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM generated_posts")
    total_generated = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM generated_posts WHERE published = 1")
    total_published = cursor.fetchone()[0]

    conn.close()

    return {
        "total_parsed": total_parsed,
        "unused_parsed": unused_parsed,
        "fresh_unused": fresh_unused,
        "total_generated": total_generated,
        "total_published": total_published,
    }


def get_recent_posts(limit: int = 10) -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT g.*, p.original_title, p.source_name
        FROM generated_posts g
        LEFT JOIN parsed_posts p ON g.parsed_post_id = p.id
        ORDER BY g.created_at DESC
        LIMIT ?
    """,
        (limit,),
    )

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


init_db()

