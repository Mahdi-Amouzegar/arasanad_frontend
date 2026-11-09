"""تولید آیکون‌های PWA آراسند.

طراحی: مربع گِرد با گرادیان آبی پالت برند + حرف «آ» سفید.
- نسخه‌ی معمولی: گوشه‌های گِرد
- نسخه‌ی maskable: تمام‌صفحه با حاشیه‌ی ایمن (safe zone)
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

BLUE_TOP = (36, 87, 197)      # #2457C5
BLUE_BOTTOM = (24, 58, 140)   # تیره‌تر برای گرادیان
WHITE = (255, 255, 255)

OUT_DIR = os.path.join("public", "icons")
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\tahoma.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
]


def find_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    raise SystemExit("هیچ فونت فارسی‌پسندی پیدا نشد")


def vertical_gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BLUE_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        color = tuple(
            round(BLUE_TOP[i] + (BLUE_BOTTOM[i] - BLUE_TOP[i]) * t) for i in range(3)
        )
        draw.line([(0, y), (size, y)], fill=color)
    return img


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def render(size: int, *, rounded: bool, glyph_ratio: float) -> Image.Image:
    base = vertical_gradient(size).convert("RGBA")

    # حرف «آ» سفید و وسط‌چین
    font = find_font(int(size * glyph_ratio))
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    text = "آ"
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    # کمی بالاتر از مرکز بصری، چون دنباله‌ی حروف فارسی پایین‌تر می‌افتد
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1] - size * 0.02
    draw.text((x, y), text, font=font, fill=WHITE)

    base = Image.alpha_composite(base, layer)

    if rounded:
        base.putalpha(rounded_mask(size, 0.22))
    return base


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    targets = [
        ("icon-192.png", 192, True, 0.52),
        ("icon-512.png", 512, True, 0.52),
        # maskable: حرف کوچک‌تر تا در ماسک دایره‌ای گوشی‌ها بریده نشود
        ("icon-maskable-512.png", 512, False, 0.40),
        ("apple-touch-icon.png", 180, False, 0.50),
    ]

    for name, size, rounded, ratio in targets:
        img = render(size, rounded=rounded, glyph_ratio=ratio)
        path = os.path.join(OUT_DIR, name)
        img.save(path, "PNG", optimize=True)
        print(f"{name:28} {size}x{size}  {os.path.getsize(path):,} bytes")


if __name__ == "__main__":
    main()
