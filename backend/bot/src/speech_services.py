"""Speech-to-text and text-to-speech for Alexol Speak (free-first stack)."""

from __future__ import annotations

import asyncio
import base64
import html
import re
import shutil
import tempfile
from pathlib import Path
from typing import Optional

import edge_tts
import httpx

import config

EDGE_VOICE_BY_LANG = {
    "en": "en-US-JennyNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
}

OPENROUTER_VOICE_BY_LANG = {
    "en": "flux-alexis-en",
    "es": "flux-alexis-en",
    "fr": "flux-alexis-en",
}

MAX_TTS_CHARS = 900

_local_whisper_model = None


def prepare_text_for_speech(text: str) -> str:
    """Убираем HTML/разметку перед озвучкой."""
    clean = html.unescape(text or "")
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    if len(clean) > MAX_TTS_CHARS:
        clean = clean[:MAX_TTS_CHARS].rsplit(" ", 1)[0] + "..."
    return clean


def _get_local_whisper():
    global _local_whisper_model
    if _local_whisper_model is None:
        from faster_whisper import WhisperModel

        print(f"🔄 Loading local Whisper model: {config.SPEAK_WHISPER_LOCAL_MODEL}")
        _local_whisper_model = WhisperModel(
            config.SPEAK_WHISPER_LOCAL_MODEL,
            device="cpu",
            compute_type="int8",
        )
        print("✅ Local Whisper ready")
    return _local_whisper_model


def _transcribe_local_sync(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
    tmp = tempfile.NamedTemporaryFile(suffix=".ogg", delete=False)
    tmp_path = Path(tmp.name)
    try:
        tmp.write(audio_bytes)
        tmp.close()

        model = _get_local_whisper()
        segments, _info = model.transcribe(
            str(tmp_path),
            language=language,
            beam_size=1,
            vad_filter=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        if text:
            print("✅ STT local Whisper (free)")
        return text or None
    except Exception as exc:
        print(f"⚠️ Local STT error: {exc}")
        return None
    finally:
        tmp_path.unlink(missing_ok=True)


async def _transcribe_openrouter(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
    """Платный STT через OpenRouter — только если SPEAK_STT_BACKEND=openrouter."""
    if not config.OPENROUTER_API_KEY:
        print("❌ OPENROUTER_API_KEY не задан — OpenRouter STT недоступен")
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
            print(f"⚠️ OpenRouter STT HTTP {response.status_code}: {response.text[:200]}")
            return None

        data = response.json()
        text = (data.get("text") or "").strip()
        if text:
            print(f"✅ STT OpenRouter ({config.SPEAK_STT_MODEL})")
        return text or None
    except Exception as exc:
        print(f"⚠️ OpenRouter STT error: {exc}")
        return None


async def transcribe_ogg(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
    """Распознавание голоса: local Whisper (бесплатно) или OpenRouter (платно)."""
    backend = (config.SPEAK_STT_BACKEND or "local").lower()

    if backend == "openrouter":
        return await _transcribe_openrouter(audio_bytes, language)

    text = await asyncio.to_thread(_transcribe_local_sync, audio_bytes, language)
    if text:
        return text

    # Запасной вариант, если local упал и есть ключ
    if config.OPENROUTER_API_KEY:
        print("⚠️ Local STT failed, trying OpenRouter fallback…")
        return await _transcribe_openrouter(audio_bytes, language)
    return None


async def _mp3_to_ogg(mp3_path: Path) -> Optional[Path]:
    """Convert mp3 to ogg/opus — формат Telegram voice."""
    if not shutil.which("ffmpeg"):
        print("⚠️ ffmpeg не найден — отправим как audio/mp3")
        return mp3_path

    ogg_path = mp3_path.with_suffix(".ogg")
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-y",
        "-i",
        str(mp3_path),
        "-c:a",
        "libopus",
        "-ac",
        "1",
        "-ar",
        "48000",
        "-b:a",
        "64k",
        str(ogg_path),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0 or not ogg_path.exists() or ogg_path.stat().st_size == 0:
        if stderr:
            print(f"⚠️ ffmpeg error: {stderr.decode(errors='ignore')[:200]}")
        ogg_path.unlink(missing_ok=True)
        return mp3_path
    mp3_path.unlink(missing_ok=True)
    return ogg_path


async def _synthesize_edge_tts(text: str, language: str) -> Optional[Path]:
    voice = EDGE_VOICE_BY_LANG.get(language, EDGE_VOICE_BY_LANG["en"])
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()
    try:
        communicate = edge_tts.Communicate(text, voice)
        await asyncio.wait_for(communicate.save(str(tmp_path)), timeout=25.0)
        if not tmp_path.exists() or tmp_path.stat().st_size == 0:
            tmp_path.unlink(missing_ok=True)
            return None
        print(f"✅ TTS edge-tts ({voice})")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ edge-tts error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_openrouter(text: str, language: str) -> Optional[Path]:
    if not config.OPENROUTER_API_KEY:
        return None

    model = config.SPEAK_TTS_MODEL
    voice = OPENROUTER_VOICE_BY_LANG.get(language, OPENROUTER_VOICE_BY_LANG["en"])
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                f"{config.OPENROUTER_BASE_URL}/audio/speech",
                headers={
                    "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://alexol.io",
                    "X-Title": "Alexol Speak Tutor",
                },
                json={
                    "model": model,
                    "input": text,
                    "voice": voice,
                    "response_format": "mp3",
                },
            )

        if response.status_code != 200:
            print(f"⚠️ OpenRouter TTS HTTP {response.status_code}: {response.text[:200]}")
            tmp_path.unlink(missing_ok=True)
            return None

        content_type = (response.headers.get("content-type") or "").lower()
        if "json" in content_type:
            print(f"⚠️ OpenRouter TTS returned JSON: {response.text[:200]}")
            tmp_path.unlink(missing_ok=True)
            return None

        tmp_path.write_bytes(response.content)
        if tmp_path.stat().st_size == 0:
            tmp_path.unlink(missing_ok=True)
            return None

        print(f"✅ TTS OpenRouter ({model}, {voice})")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ OpenRouter TTS error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def synthesize_speech(text: str, language: str = "en") -> Optional[Path]:
    """Generate voice file. edge-tts (бесплатно) → OpenRouter free TTS (deepgram/flux-tts:free)."""
    clean = prepare_text_for_speech(text)
    if not clean:
        return None

    audio_path = await _synthesize_edge_tts(clean, language)
    if audio_path:
        return audio_path

    return await _synthesize_openrouter(clean, language)
