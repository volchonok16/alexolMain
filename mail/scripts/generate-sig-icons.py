"""White-on-#0C0F16 PNG icons for the Alexol email signature (56x56)."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

BG = (12, 15, 22, 255)
WHITE = (255, 255, 255, 255)
SRC = 224
OUT = 56

# Simple Icons WhatsApp mark (24x24), white on the signature card.
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
    "2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 00"
    "12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l"
    "6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893"
    "-11.893a11.821 11.821 0 00-3.48-8.413z"
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


def raster_svg(svg: str, size: int = SRC) -> Image.Image:
    doc = pymupdf.open(stream=svg.encode("utf-8"), filetype="svg")
    page = doc[0]
    scale = size / max(page.rect.width, page.rect.height)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=True)
    img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGBA")
    if img.size != (size, size):
        canvas_img = Image.new("RGBA", (size, size), BG)
        x = (size - img.width) // 2
        y = (size - img.height) // 2
        canvas_img.paste(img, (x, y), img)
        return canvas_img
    return img


def draw_phone() -> Image.Image:
    """Lucide-style call receiver, tilted so it reads as a phone not a pin."""
    layer = Image.new("RGBA", (SRC, SRC), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w = 26
    box = (52, 40, 172, 184)
    d.arc(box, start=205, end=335, fill=WHITE, width=w)
    d.ellipse((56, 72, 100, 132), fill=WHITE)
    d.ellipse((124, 72, 168, 132), fill=WHITE)
    rot = layer.rotate(48, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    out = canvas()
    out.alpha_composite(rot)
    return out


def draw_whatsapp() -> Image.Image:
    """Official WhatsApp mark, white on the signature background."""
    pad = 1.4
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {24 + pad * 2} {24 + pad * 2}">'
        f'<rect x="{-pad}" y="{-pad}" width="{24 + pad * 2}" height="{24 + pad * 2}" fill="#0C0F16"/>'
        f'<path fill="#FFFFFF" d="{WHATSAPP_PATH}"/>'
        "</svg>"
    )
    return raster_svg(svg)


def draw_telegram() -> Image.Image:
    """Filled paper plane pointing up-right."""
    img = canvas()
    d = ImageDraw.Draw(img)
    d.polygon(
        [
            (36, 112),
            (188, 42),
            (108, 118),
            (96, 182),
        ],
        fill=WHITE,
    )
    d.polygon(
        [
            (108, 118),
            (188, 42),
            (124, 128),
        ],
        fill=BG,
    )
    return img


def main() -> None:
    save(draw_phone(), "icon-phone.png")
    save(draw_whatsapp(), "icon-whatsapp.png")
    save(draw_telegram(), "icon-telegram.png")


if __name__ == "__main__":
    main()
