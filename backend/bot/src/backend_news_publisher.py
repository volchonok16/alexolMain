from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import httpx


def _detect_image_type(image_data: bytes) -> Tuple[bytes, str, str]:
    """
    Returns (normalized_bytes, filename, mimetype).
    Backend allows: jpeg/jpg, png, webp.
    """
    if not image_data:
        raise ValueError("image_data is empty")

    jpeg_signature = b"\xff\xd8\xff"
    png_signature = b"\x89PNG\r\n\x1a\n"
    webp_signature = b"RIFF"
    gif_signature = b"GIF"

    if image_data.startswith(jpeg_signature):
        return image_data, "photo.jpg", "image/jpeg"
    if image_data.startswith(png_signature):
        return image_data, "photo.png", "image/png"
    if image_data[:4] == webp_signature:
        # NOTE: crude check; good enough for our use-case
        return image_data, "photo.webp", "image/webp"
    if image_data.startswith(gif_signature):
        # Convert GIF -> PNG to pass backend fileFilter.
        from PIL import Image
        from io import BytesIO

        img = Image.open(BytesIO(image_data))
        out = BytesIO()
        # Take first frame
        img.seek(0)
        img.convert("RGB").save(out, format="PNG")
        return out.getvalue(), "photo.png", "image/png"

    # Unknown type: try to decode with Pillow and convert to JPEG
    from PIL import Image
    from io import BytesIO

    img = Image.open(BytesIO(image_data))
    out = BytesIO()
    img.convert("RGB").save(out, format="JPEG", quality=92)
    return out.getvalue(), "photo.jpg", "image/jpeg"


@dataclass
class BackendCredentials:
    api_url: str  # e.g. https://api.alexol.io/api
    login: str
    password: str


class BackendNewsPublisher:
    def __init__(self, creds: BackendCredentials):
        self._creds = creds
        self._token: Optional[str] = None
        self._client = httpx.AsyncClient(timeout=20.0)

    async def aclose(self):
        await self._client.aclose()

    async def _ensure_token(self) -> str:
        if self._token:
            return self._token

        url = self._creds.api_url.rstrip("/") + "/auth/login"
        resp = await self._client.post(url, json={"login": self._creds.login, "password": self._creds.password})
        if resp.status_code >= 400:
            body = resp.text[:500] if resp.text else ""
            raise RuntimeError(f"Backend login failed: HTTP {resp.status_code} {body}")
        data = resp.json()

        token = data.get("token")
        if not token:
            raise RuntimeError("Backend login succeeded but response has no token")
        self._token = token
        return token

    async def create_news(self, title: str, text: str, image_data: bytes) -> bool:
        token = await self._ensure_token()

        normalized_bytes, filename, mimetype = _detect_image_type(image_data)
        url = self._creds.api_url.rstrip("/") + "/news"

        files = {
            "photo": (filename, normalized_bytes, mimetype),
        }
        data = {
            "title": title,
            "text": text,
        }

        resp = await self._client.post(
            url,
            data=data,
            files=files,
            headers={"Authorization": f"Bearer {token}"},
        )

        if resp.status_code == 401:
            # token expired / invalid -> relogin once
            self._token = None
            token = await self._ensure_token()
            resp = await self._client.post(
                url,
                data=data,
                files=files,
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code >= 400:
            body = resp.text[:500] if resp.text else ""
            raise RuntimeError(f"Backend POST /news failed: HTTP {resp.status_code} {body}")

        return True

    async def test_connection(self) -> tuple[bool, str]:
        try:
            await self._ensure_token()
            return True, "Backend login OK"
        except Exception as e:
            return False, str(e)

