#!/usr/bin/env python3
"""Génère les icônes PNG de la PWA à partir du logo officiel bmx.

Place l'emblème crème (src/assets/logo-bmx.png, traits crème sur fond
transparent) centré sur le fond sombre de la marque, avec une zone de sécurité
pour les icônes maskable (Android peut rogner jusqu'à un cercle de 80 %).

Dépendance : Pillow (outil de dev, lancé à la main ; les PNG sont commités).
"""
import os
from PIL import Image

BG = (23, 25, 28)  # #17191c — fond du site / theme_color
ROOT = os.path.join(os.path.dirname(__file__), "..")
LOGO = os.path.join(ROOT, "src", "assets", "logo-bmx-mark.png")
OUT = os.path.join(ROOT, "public")


def render(size, fraction):
    """Icône carrée `size`×`size` : logo à `fraction` de la largeur, centré."""
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    logo = Image.open(LOGO).convert("RGBA")
    target = int(size * fraction)
    w, h = logo.size
    scale = target / max(w, h)
    logo = logo.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas.convert("RGB")


def main():
    jobs = [
        # nom, taille, fraction (zone de sécurité maskable ≈ 0.74)
        ("icon-192.png", 192, 0.74),
        ("icon-512.png", 512, 0.74),
        ("apple-touch-icon.png", 180, 0.82),
        ("favicon-32.png", 32, 0.92),
    ]
    for name, size, frac in jobs:
        render(size, frac).save(os.path.join(OUT, name))
        print(f"  ✓ {name} ({size}×{size})")


if __name__ == "__main__":
    main()
