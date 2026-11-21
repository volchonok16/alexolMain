"""Общие хелперы для исходящих HTTP-запросов бота."""

from __future__ import annotations

from typing import Any

import httpx

import config


def openrouter_client_kwargs(timeout: float) -> dict[str, Any]:
    """Аргументы для httpx.AsyncClient при запросах к OpenRouter."""
    kwargs: dict[str, Any] = {"timeout": timeout}
    if config.OPENROUTER_HTTP_PROXY:
        kwargs["proxy"] = config.OPENROUTER_HTTP_PROXY
    return kwargs


def is_openrouter_security_block(status_code: int, body: str) -> bool:
    """Cloudflare/geo policy до auth - не ошибка ключа и не недоступность модели."""
    if status_code != 403:
        return False
    lower = (body or "").lower()
    return "access denied by security policy" in lower or "security policy" in lower


def format_openrouter_error_body(response: httpx.Response) -> str:
    try:
        data = response.json()
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err)[:200]
        if isinstance(err, str):
            return err[:200]
        return str(data)[:200]
    except Exception:
        return (response.text or "")[:200]


def openrouter_unavailable_hints(*, saw_security_block: bool = False) -> None:
    print("\n❌ Все модели недоступны!")
    if saw_security_block:
        print("   🚫 OpenRouter вернул 403 Access denied by security policy.")
        print("   Это блокировка Cloudflare по IP/региону (часто RU), не ключ и не список моделей.")
        print("   Решение:")
        print("      1. Задай OPENROUTER_HTTP_PROXY (или HTTPS_PROXY) - прокси/VPN вне РФ")
        print("      2. Либо гоняй bot_news на VPS в EU/US")
        if not config.OPENROUTER_HTTP_PROXY:
            print("      ℹ️ Сейчас прокси для OpenRouter не задан")
        return
    print("   💡 Проверь:")
    print("      1. Актуальные бесплатные модели на https://openrouter.ai/models")
    print("      2. Правильность API ключа в .env файле")
    print("      3. Баланс на OpenRouter (даже бесплатные модели требуют регистрации)")
    print("      4. Попробуй обновить OPENROUTER_MODEL в .env на актуальную модель")
    if not config.OPENROUTER_HTTP_PROXY:
        print("      5. При 403 security policy - OPENROUTER_HTTP_PROXY вне РФ")


def proxy_log_suffix() -> str:
    return " (через прокси)" if config.OPENROUTER_HTTP_PROXY else ""
