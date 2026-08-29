"""Signature icons: Lucide phone (site footer) + official Telegram/WhatsApp marks."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image

BG = (12, 15, 22, 255)
SRC = 224
OUT = 56

# Same path as frontend/src/shared/ui/BrandIcons.tsx
WHATSAPP_PATH = (
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15"
    "-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463"
    "-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606"
    ".134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52"
    "-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01"
    "-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065"
    " 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625"
    ".712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289"
    ".173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031"
    "-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001"
    "-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 01"
    "2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 00"
    "12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l"
    "6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893"
    "-11.893a11.821 11.821 0 00-3.48-8.413z"
)

TELEGRAM_PATH = (
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 "
    "12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 "
    ".171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 "
    "1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8"
    "-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15"
    "-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49"
    "-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027"
    "-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025"
    "-1.627 4.476-1.635z"
)

# Lucide Phone (same mark as alexol.io footer)
LUCIDE_PHONE = (
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 "
    "19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 "
    "0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 "
    "2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
)


def canvas() -> Image.Image:
    return Image.new("RGBA", (SRC, SRC), BG)


def down(img: Image.Image) -> Image.Image:
    return img.resize((OUT, OUT), Image.Resampling.LANCZOS)


def save(img: Image.Image, name: str) -> None:
    roots = [
        Path("mail/public/email"),
        Path("frontend/public/email"),
    ]
    for root in roots:
        root.mkdir(parents=True, exist_ok=True)
        path = root / name
        down(img).save(path, "PNG")
        print("wrote", path)


def raster_svg(svg: str, size: int = SRC, pad_color: tuple[int, int, int, int] = (0, 0, 0, 0)) -> Image.Image:
    doc = pymupdf.open(stream=svg.encode("utf-8"), filetype="svg")
    page = doc[0]
    scale = size / max(page.rect.width, page.rect.height)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=True)
    img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGBA")
    if img.size != (size, size):
        canvas_img = Image.new("RGBA", (size, size), pad_color)
        x = (size - img.width) // 2
        y = (size - img.height) // 2
        canvas_img.paste(img, (x, y), img)
        return canvas_img
    return img


def knockout_dark_bg(img: Image.Image) -> Image.Image:
    """Turn near-black fill into real transparency so email clients don't show a square."""
    out = img.copy()
    pixels = out.load()
    width, height = out.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r <= 28 and g <= 32 and b <= 40:
                pixels[x, y] = (0, 0, 0, 0)
    return out


def draw_phone() -> Image.Image:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 28 28">
      <path fill="none" stroke="#FFFFFF" stroke-width="1.75" stroke-linecap="round"
        stroke-linejoin="round" d="{LUCIDE_PHONE}"/>
    </svg>"""
    return knockout_dark_bg(raster_svg(svg))


def draw_brand(path: str, fill: str) -> Image.Image:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <rect width="24" height="24" fill="#0C0F16"/>
      <path fill="{fill}" d="{path}"/>
    </svg>"""
    return raster_svg(svg)


def main() -> None:
    save(draw_phone(), "icon-phone.png")
    save(draw_brand(WHATSAPP_PATH, "#25D366"), "icon-whatsapp.png")
    save(draw_brand(TELEGRAM_PATH, "#2AABEE"), "icon-telegram.png")


if __name__ == "__main__":
    main()
