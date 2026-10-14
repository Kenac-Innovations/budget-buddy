"""Render the checked-in catalogue with equal contain stages (requires Pillow).

Run from any directory: python3 catalogue/kenac/render_contact_sheet.py
Only the preview is resized/composited; source product files are never changed.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
CATALOGUE = ROOT / "catalogue/kenac"


def font(size):
    for path in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def render():
    images = json.loads((CATALOGUE / "images.json").read_text())
    products = {p["sku"]: p for p in json.loads((CATALOGUE / "products.json").read_text())}
    columns, cell_width, cell_height = 5, 320, 350
    sheet = Image.new("RGB", (1640, 130 + ((len(images) + 4) // 5) * cell_height), "white")
    draw = ImageDraw.Draw(sheet)
    draw.text((28, 22), "Kenac catalogue · official family visuals", font=font(30), fill="#17212b")
    draw.text((28, 65), f"{len(images)} manufacturer images · all families unpriced · 14 October 2026",
              font=font(19), fill="#485360")
    for index, record in enumerate(images):
        path = ROOT / record["file"]
        data = path.read_bytes()
        with Image.open(path) as source:
            assert source.size == (record["width"], record["height"]), path
            assert source.format.lower() == record["format"], path
            assert source.width >= 400 and len(data) <= 1_500_000, path
            assert len(data) == record["bytes"], path
            assert hashlib.sha256(data).hexdigest() == record["sha256"], path
            # Match the card's square contain stage and 10% internal padding.
            stage = Image.new("RGBA", (256, 256), "#f5f6f8")
            visual = ImageOps.contain(source.convert("RGBA"), (204, 204), Image.Resampling.LANCZOS)
            stage.alpha_composite(visual, ((256 - visual.width) // 2, (256 - visual.height) // 2))
        x, y = 20 + (index % columns) * cell_width, 112 + (index // columns) * cell_height
        sheet.paste(stage.convert("RGB"), (x + 22, y))
        words, lines, line = products[record["sku"]]["name"].split(), [], ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if draw.textlength(candidate, font=font(19)) > 295:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
        draw.multiline_text((x + 2, y + 266), "\n".join(lines), font=font(19), fill="#17212b", spacing=3)
        draw.text((x + 2, y + 321), record["sku"], font=font(12), fill="#485360")
    output = CATALOGUE / "contact-sheet.png"
    sheet.save(output, optimize=True)
    print(f"Verified and rendered {len(images)} images: {output.relative_to(ROOT)}")


if __name__ == "__main__":
    render()
