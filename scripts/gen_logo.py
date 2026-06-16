#!/usr/bin/env python3
"""Génère le logo officiel bmx (wordmark + vélo BMX en line-art).

Produit deux PNG sur fond transparent, réutilisés par l'app et par
scripts/gen_icons.py :
  - src/assets/logo-bmx.png       traits crème (#ededec)
  - src/assets/logo-bmx-neon.png  version néon (accent + halo)

Dépendance : Pillow (outil de dev ; les PNG sont commités).
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "src", "assets")

CREAM = (237, 237, 236, 255)   # #ededec
ACCENT = (255, 46, 99, 255)    # #ff2e63
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

W, H = 880, 280
SS = 3  # super-sampling pour des bords nets


def draw_bike(d: ImageDraw.ImageDraw, cx: int, cy: int, scale: float, color, lw: int):
    """Vélo BMX vu de profil, centré sur (cx, cy)."""
    r = int(70 * scale)            # rayon roue
    dx = int(95 * scale)           # demi-empattement
    rear = (cx - dx, cy + int(26 * scale))
    front = (cx + dx, cy + int(26 * scale))

    # Roues (pneu + jante).
    for c in (rear, front):
        d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=color, width=lw)
        ri = int(r * 0.5)
        d.ellipse([c[0] - ri, c[1] - ri, c[0] + ri, c[1] + ri], outline=color, width=max(2, lw // 2))
        d.ellipse([c[0] - 5, c[1] - 5, c[0] + 5, c[1] + 5], fill=color)

    bb = (cx, cy + int(30 * scale))                 # pédalier
    seat = (cx - int(48 * scale), cy - int(58 * scale))
    head = (cx + int(56 * scale), cy - int(40 * scale))
    bar = (cx + int(70 * scale), cy - int(78 * scale))

    for a, b in [
        (bb, head), (bb, seat), (seat, head),       # triangle principal
        (bb, rear), (seat, rear),                   # arrière
        (head, front), (head, bar),                 # fourche + potence
    ]:
        d.line([a, b], fill=color, width=lw)

    # Guidon + selle + manivelle.
    d.line([(bar[0] - int(26 * scale), bar[1]), (bar[0] + int(20 * scale), bar[1])], fill=color, width=lw)
    d.line([(seat[0] - int(26 * scale), seat[1]), (seat[0] + int(14 * scale), seat[1])], fill=color, width=lw)
    d.line([bb, (bb[0] - int(6 * scale), bb[1] + int(34 * scale))], fill=color, width=lw)


def render(color, neon=False) -> Image.Image:
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_bike(d, int(150 * SS), int(140 * SS), SS * 1.0, color, lw=int(9 * SS))

    font = ImageFont.truetype(FONT, int(170 * SS))
    text = "bmx"
    box = d.textbbox((0, 0), text, font=font)
    tx = int(300 * SS) - box[0]
    ty = int(140 * SS) - (box[1] + box[3]) // 2
    d.text((tx, ty), text, font=font, fill=color)
    # Point accent sur le i… ici plutôt une barre sous le wordmark.
    d.line([(tx, ty + box[3] + int(18 * SS)), (tx + (box[2] - box[0]), ty + box[3] + int(18 * SS))],
           fill=color, width=int(10 * SS))

    img = img.resize((W, H), Image.LANCZOS)

    if neon:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        glow.paste(img, (0, 0), img)
        glow = glow.filter(ImageFilter.GaussianBlur(10))
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for _ in range(3):
            out.alpha_composite(glow)
        out.alpha_composite(img)
        return out
    return img


def render_mark(color) -> Image.Image:
    """Emblème carré (vélo au-dessus, wordmark dessous) pour les icônes PWA."""
    S = 512
    img = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_bike(d, S * SS // 2, int(195 * SS), SS * 1.55, color, lw=int(11 * SS))

    font = ImageFont.truetype(FONT, int(165 * SS))
    text = "bmx"
    box = d.textbbox((0, 0), text, font=font)
    tx = (S * SS - (box[2] - box[0])) // 2 - box[0]
    ty = int(330 * SS) - box[1]
    d.text((tx, ty), text, font=font, fill=color)
    return img.resize((S, S), Image.LANCZOS)


def main():
    render(CREAM).save(os.path.join(OUT, "logo-bmx.png"))
    render(ACCENT, neon=True).save(os.path.join(OUT, "logo-bmx-neon.png"))
    render_mark(CREAM).save(os.path.join(OUT, "logo-bmx-mark.png"))
    print("  ✓ logo-bmx.png + logo-bmx-neon.png + logo-bmx-mark.png")


if __name__ == "__main__":
    main()
