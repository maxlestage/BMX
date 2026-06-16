# -*- coding: utf-8 -*-
"""Traite le logo BMX fourni (src/assets/logo-source.png) pour l'app :
détoure le fond clair (flood-fill depuis les bords), recadre, et produit :
  - src/assets/logo-bmx.png        (badge détouré, transparent)
  - src/assets/logo-bmx-neon.png   (idem + halo bleu)
  - src/assets/logo-bmx-mark.png   (badge centré sur carré, pour les icônes)

Dépendances : Pillow + numpy (dev ; les PNG sont commités).
"""
import os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "src", "assets", "logo-source.png")
OUT = os.path.join(ROOT, "src", "assets")
GLOW = (90, 150, 210)  # halo bleu métallisé


def remove_bg(img: Image.Image, tol: int = 60) -> Image.Image:
    """Rend transparent le fond connexe aux bords (couleur proche des coins)."""
    img = img.convert("RGBA")
    arr = np.asarray(img).astype(np.int16)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3]
    # Référence = moyenne des 4 coins.
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    ref = corners.mean(axis=0)
    dist = np.sqrt(((rgb - ref) ** 2).sum(axis=2))
    near = dist < tol  # pixels « couleur de fond »

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x]:
                q.append((y, x)); visited[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not visited[y, x]:
                q.append((y, x)); visited[y, x] = True

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and near[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = arr[:, :, 3].copy()
    alpha[visited] = 0
    arr[:, :, 3] = alpha
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    return out.crop(out.getbbox())


def main():
    badge = remove_bg(Image.open(SRC))
    # Lissage léger des bords du détourage.
    badge.save(os.path.join(OUT, "logo-bmx.png"))

    # Version néon : halo bleu derrière le badge.
    pad = 60
    big = Image.new("RGBA", (badge.width + pad * 2, badge.height + pad * 2), (0, 0, 0, 0))
    big.alpha_composite(badge, (pad, pad))
    glow = Image.new("RGBA", big.size, (0, 0, 0, 0))
    glow.paste(big, (0, 0), big)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    tint = Image.new("RGBA", big.size, GLOW + (0,))
    glow_alpha = glow.split()[3]
    tinted = Image.new("RGBA", big.size, (0, 0, 0, 0))
    tinted.paste(Image.new("RGBA", big.size, GLOW + (255,)), (0, 0), glow_alpha)
    neon = Image.new("RGBA", big.size, (0, 0, 0, 0))
    for _ in range(2):
        neon.alpha_composite(tinted)
    neon.alpha_composite(big)
    neon.save(os.path.join(OUT, "logo-bmx-neon.png"))

    # Emblème carré pour les icônes (badge centré, marge).
    side = int(max(badge.width, badge.height) * 1.12)
    mark = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    mark.alpha_composite(badge, ((side - badge.width) // 2, (side - badge.height) // 2))
    mark.save(os.path.join(OUT, "logo-bmx-mark.png"))
    print(f"  ✓ logo-bmx.png ({badge.width}×{badge.height}) + neon + mark ({side}×{side})")


if __name__ == "__main__":
    main()
