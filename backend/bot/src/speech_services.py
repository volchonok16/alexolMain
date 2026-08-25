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
    "en": "en-US-GuyNeural",
    "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural",
}

GTTS_LANG = {"en": "en", "es": "es", "fr": "fr"}

OPENROUTER_VOICE_BY_LANG = {
    "en": config.SPEAK_TTS_VOICE,
    "es": config.SPEAK_TTS_VOICE,
    "fr": config.SPEAK_TTS_VOICE,
}

OPENROUTER_TTS_FALLBACK_MODELS = [
    "deepgram/flux-tts:free",
    "fish-audio/s2.1-pro-free:free",
]

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


def warmup_local_whisper() -> None:
    """Предзагрузка Whisper при старте бота (чтобы первое голосовое не зависло)."""
    if (config.SPEAK_STT_BACKEND or "local").lower() != "local":
        return
    try:
        _get_local_whisper()
    except Exception as exc:
        print(f"⚠️ Whisper warmup failed: {exc}")


def _get_local_whisper():
    global _local_whisper_model
    if _local_whisper_model is None:
        from faster_whisper import WhisperModel

        print(f"🔄 Loading local Whisper model: {config.SPEAK_WHISPER_LOCAL_MODEL} (скачивание с HF Hub при первом запуске может занять 1–3 мин)…")
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
            print(f"✅ STT local Whisper: {text[:80]}...")
        return text or None
    except Exception as exc:
        print(f"⚠️ Local STT error: {exc}")
        return None
    finally:
        tmp_path.unlink(missing_ok=True)


async def _transcribe_openrouter(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
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
        async with httpx.AsyncClient(timeout=45.0) as client:
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
    backend = (config.SPEAK_STT_BACKEND or "local").lower()

    if backend == "openrouter":
        return await _transcribe_openrouter(audio_bytes, language)

    text = await asyncio.to_thread(_transcribe_local_sync, audio_bytes, language)
    if text:
        return text

    if config.OPENROUTER_API_KEY:
        print("⚠️ Local STT failed, trying OpenRouter fallback…")
        return await _transcribe_openrouter(audio_bytes, language)
    return None


async def _mp3_to_ogg(mp3_path: Path) -> Path:
    if not shutil.which("ffmpeg"):
        print("⚠️ ffmpeg не найден — отправим mp3 как audio")
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
        print(f"✅ TTS edge-tts ({voice}), {tmp_path.stat().st_size} bytes")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ edge-tts error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_gtts(text: str, language: str) -> Optional[Path]:
    from gtts import gTTS

    lang = GTTS_LANG.get(language, "en")
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    def _save() -> None:
        gTTS(text=text, lang=lang).save(str(tmp_path))

    try:
        await asyncio.wait_for(asyncio.to_thread(_save), timeout=30.0)
        if not tmp_path.exists() or tmp_path.stat().st_size == 0:
            tmp_path.unlink(missing_ok=True)
            return None
        print(f"✅ TTS gTTS ({lang}), {tmp_path.stat().st_size} bytes")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ gTTS error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_openrouter_one(
    text: str,
    language: str,
    model: str,
    voice: str,
) -> Optional[Path]:
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
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
            print(f"⚠️ OpenRouter TTS {model} HTTP {response.status_code}: {response.text[:200]}")
            tmp_path.unlink(missing_ok=True)
            return None

        content_type = (response.headers.get("content-type") or "").lower()
        if "json" in content_type:
            print(f"⚠️ OpenRouter TTS {model} JSON error: {response.text[:200]}")
            tmp_path.unlink(missing_ok=True)
            return None

        tmp_path.write_bytes(response.content)
        if tmp_path.stat().st_size == 0:
            tmp_path.unlink(missing_ok=True)
            return None

        print(f"✅ TTS OpenRouter ({model}, {voice}), {tmp_path.stat().st_size} bytes")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ OpenRouter TTS {model} error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_openrouter(text: str, language: str) -> Optional[Path]:
    if not config.OPENROUTER_API_KEY:
        return None

    voice = OPENROUTER_VOICE_BY_LANG.get(language, OPENROUTER_VOICE_BY_LANG["en"])
    models = [config.SPEAK_TTS_MODEL] + [
        m for m in OPENROUTER_TTS_FALLBACK_MODELS if m != config.SPEAK_TTS_MODEL
    ]
    for model in models:
        result = await _synthesize_openrouter_one(text, language, model, voice)
        if result:
            return result
    return None


async def synthesize_speech(text: str, language: str = "en") -> Optional[Path]:
    """Один голос через OpenRouter; gTTS только если OpenRouter недоступен."""
    clean = prepare_text_for_speech(text)
    if not clean:
        print("⚠️ TTS: empty text after cleanup")
        return None

    print(f"🔊 TTS request ({language}, {len(clean)} chars): {clean[:60]}...")

    providers = {
        "openrouter": lambda: _synthesize_openrouter(clean, language),
        "edge": lambda: _synthesize_edge_tts(clean, language),
        "gtts": lambda: _synthesize_gtts(clean, language),
    }
    order = [
        p.strip().lower()
        for p in (config.SPEAK_TTS_PROVIDERS or "openrouter,gtts").split(",")
        if p.strip()
    ]
    for name in order:
        synthesizer = providers.get(name)
        if not synthesizer:
            continue
        audio_path = await synthesizer()
        if audio_path and audio_path.exists() and audio_path.stat().st_size > 0:
            return audio_path

    print("❌ All TTS providers failed")
    return None
