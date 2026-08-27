"""Speech-to-text and text-to-speech for Alexol Speak (free-first stack)."""

from __future__ import annotations

import asyncio
import base64
import html
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import edge_tts
import httpx

import config
from src.http_utils import openrouter_client_kwargs
from src.speak_settings import WHISPER_LANGUAGE_PROMPTS

EDGE_VOICE_BY_LANG = {
    "en": "en-US-GuyNeural",
    "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural",
    "de": "de-DE-ConradNeural",
}

GTTS_LANG = {"en": "en", "es": "es", "fr": "fr", "de": "de"}

OPENROUTER_VOICE_BY_LANG = {
    "en": config.SPEAK_TTS_VOICE,
    "es": config.SPEAK_TTS_VOICE,
    "fr": config.SPEAK_TTS_VOICE,
    "de": config.SPEAK_TTS_VOICE,
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


def _convert_ogg_to_wav(ogg_path: Path) -> Path:
    """16 kHz mono PCM — лучше для Whisper."""
    wav_path = ogg_path.with_suffix(".wav")
    if not shutil.which("ffmpeg"):
        return ogg_path
    proc = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(ogg_path),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(wav_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0 or not wav_path.exists() or wav_path.stat().st_size == 0:
        wav_path.unlink(missing_ok=True)
        return ogg_path
    return wav_path


def _transcribe_local_sync(audio_bytes: bytes, language: Optional[str] = None) -> Optional[str]:
    tmp = tempfile.NamedTemporaryFile(suffix=".ogg", delete=False)
    tmp_path = Path(tmp.name)
    wav_path: Path | None = None
    try:
        tmp.write(audio_bytes)
        tmp.close()

        audio_input = _convert_ogg_to_wav(tmp_path)
        if audio_input.suffix.lower() == ".wav":
            wav_path = audio_input

        model = _get_local_whisper()
        initial_prompt = WHISPER_LANGUAGE_PROMPTS.get(language or "", "")
        segments, _info = model.transcribe(
            str(audio_input),
            language=language,
            beam_size=5,
            best_of=2,
            temperature=0.0,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 400, "speech_pad_ms": 200},
            condition_on_previous_text=False,
            initial_prompt=initial_prompt or None,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.5,
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
        if wav_path and wav_path.exists():
            wav_path.unlink(missing_ok=True)


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
        async with httpx.AsyncClient(**openrouter_client_kwargs(45.0)) as client:
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


async def _adjust_mp3_speed(mp3_path: Path, speed: float) -> Path:
    """Меняем темп через ffmpeg atempo (0.5–2.0)."""
    if abs(speed - 1.0) < 0.02 or not shutil.which("ffmpeg"):
        return mp3_path
    speed = max(0.5, min(2.0, speed))
    out_path = mp3_path.with_name(f"{mp3_path.stem}_spd.mp3")
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-y",
        "-i",
        str(mp3_path),
        "-filter:a",
        f"atempo={speed}",
        str(out_path),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
        if stderr:
            print(f"⚠️ atempo error: {stderr.decode(errors='ignore')[:200]}")
        out_path.unlink(missing_ok=True)
        return mp3_path
    mp3_path.unlink(missing_ok=True)
    return out_path


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


async def _synthesize_edge_tts(text: str, language: str, speed: float = 1.0) -> Optional[Path]:
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
        tmp_path = await _adjust_mp3_speed(tmp_path, speed)
        print(f"✅ TTS edge-tts ({voice}), {tmp_path.stat().st_size} bytes")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ edge-tts error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_gtts(text: str, language: str, speed: float = 1.0) -> Optional[Path]:
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
        tmp_path = await _adjust_mp3_speed(tmp_path, speed)
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
    speed: float = 1.0,
) -> Optional[Path]:
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = Path(tmp.name)
    tmp.close()

    try:
        async with httpx.AsyncClient(**openrouter_client_kwargs(45.0)) as client:
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
                    "speed": round(speed, 2),
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

        print(f"✅ TTS OpenRouter ({model}, {voice}, speed={speed}), {tmp_path.stat().st_size} bytes")
        return await _mp3_to_ogg(tmp_path)
    except Exception as exc:
        print(f"⚠️ OpenRouter TTS {model} error: {exc}")
        tmp_path.unlink(missing_ok=True)
        return None


async def _synthesize_openrouter(text: str, language: str, speed: float = 1.0) -> Optional[Path]:
    if not config.OPENROUTER_API_KEY:
        return None

    voice = OPENROUTER_VOICE_BY_LANG.get(language, OPENROUTER_VOICE_BY_LANG["en"])
    models = [config.SPEAK_TTS_MODEL] + [
        m for m in OPENROUTER_TTS_FALLBACK_MODELS if m != config.SPEAK_TTS_MODEL
    ]
    for model in models:
        result = await _synthesize_openrouter_one(text, language, model, voice, speed)
        if result:
            return result
    return None


async def synthesize_speech(
    text: str,
    language: str = "en",
    *,
    speed: float | None = None,
) -> Optional[Path]:
    """Один голос через OpenRouter; gTTS только если OpenRouter недоступен."""
    clean = prepare_text_for_speech(text)
    if not clean:
        print("⚠️ TTS: empty text after cleanup")
        return None

    spd = speed if speed is not None else config.SPEAK_TTS_SPEED_DEFAULT
    print(f"🔊 TTS request ({language}, speed={spd}, {len(clean)} chars): {clean[:60]}...")

    providers = {
        "openrouter": lambda: _synthesize_openrouter(clean, language, spd),
        "edge": lambda: _synthesize_edge_tts(clean, language, spd),
        "gtts": lambda: _synthesize_gtts(clean, language, spd),
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
