"""Speech-to-text (OpenRouter Whisper) and text-to-speech (edge-tts → ogg)."""

from __future__ import annotations

import asyncio
import base64
import shutil
import tempfile
from pathlib import Path
from typing import Optional

import edge_tts
import httpx

import config

VOICE_BY_LANG = {
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
}


async def transcribe_ogg(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
    """Transcribe Telegram voice (ogg/opus) via OpenRouter STT."""
    if not config.OPENROUTER_API_KEY:
        print("❌ OPENROUTER_API_KEY не задан — STT недоступен")
        return None

    payload: dict = {
        "model": config.SPEAK_STT_MODEL,
        "input_audio": {
            "data": base64.b64encode(audio_bytes).decode("ascii"),
            "format": "ogg",
        },
    }
    if language:
        payload["language"] = language

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{config.OPENROUTER_BASE_URL}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://alexol.io",
                    "X-Title": "Alexol Speak Tutor",
                },
                json=payload,
            )

        if response.status_code != 200:
            print(f"⚠️ STT HTTP {response.status_code}: {response.text[:200]}")
            return None

        data = response.json()
        text = (data.get("text") or "").strip()
        return text or None
    except Exception as exc:
        print(f"⚠️ STT error: {exc}")
        return None


async def _mp3_to_ogg(mp3_path: Path) -> Optional[Path]:
    """Convert mp3 to ogg/opus for Telegram send_voice. Falls back to mp3 path."""
    if not shutil.which("ffmpeg"):
        return mp3_path

    ogg_path = mp3_path.with_suffix(".ogg")
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-y",
        "-i",
        str(mp3_path),
        "-c:a",
        "libopus",
        "-b:a",
        "48k",
        str(ogg_path),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    code = await proc.wait()
    if code != 0 or not ogg_path.exists() or ogg_path.stat().st_size == 0:
        ogg_path.unlink(missing_ok=True)
        return mp3_path
    mp3_path.unlink(missing_ok=True)
    return ogg_path


async def synthesize_speech(text: str, language: str = "en") -> Optional[Path]:
    """Generate voice file (ogg if ffmpeg available, else mp3). Caller deletes file."""
    clean = (text or "").strip()
    if not clean:
        return None

    voice = VOICE_BY_LANG.get(language, VOICE_BY_LANG["en"])
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    try:
        communicate = edge_tts.Communicate(clean, voice)
        await communicate.save(str(tmp_path))
        if tmp_path.stat().st_size == 0:
            tmp_path.unlink(missing_ok=True)
            return None
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ TTS error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None
