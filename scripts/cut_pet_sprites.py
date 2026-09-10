"""把两张 3x3 桌宠贴纸表切成带透明背景的 sprites，输出到 public/pet/。

用法: python3 scripts/cut_pet_sprites.py
背景为近白纯色，从格子边界做泛洪填充去除；贴纸自身的深色描边会保护内部白毛不被误切。
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEETS = {
    # 注意：两表右下角格子带"豆包AI生成"水印且与猫尾像素粘连，无法干净去除，故不取用
    ROOT / "picture/1/桌宠1.jpg": [
        "sit", "tilt", "look",
        "loaf", "fish", "wave",
        "sleep", "groom",
    ],
    ROOT / "picture/1/桌宠2.jpg": [
        "standwave", "cheer", "playbow",
        "roll", "giggle", "dance",
        "sleep2", "content",
    ],
}
OUT = ROOT / "public/pet"
MAX_SIDE = 320


def is_bg(px: np.ndarray) -> np.ndarray:
    """近白且接近无彩色 => 背景候选"""
    mn = px.min(axis=-1)
    mx = px.max(axis=-1)
    return (mn >= 240) & ((mx - mn) <= 16)


def flood_background(cell: np.ndarray) -> np.ndarray:
    h, w, _ = cell.shape
    bg_candidate = is_bg(cell)
    bg = np.zeros((h, w), dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_candidate[y, x] and not bg[y, x]:
                bg[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_candidate[y, x] and not bg[y, x]:
                bg[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and bg_candidate[ny, nx]:
                bg[ny, nx] = True
                dq.append((ny, nx))
    return bg


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for sheet_path, names in SHEETS.items():
        img = Image.open(sheet_path).convert("RGB")
        w, h = img.size
        arr = np.asarray(img)
        cw, ch = w / 3, h / 3
        for idx, name in enumerate(names):
            row, col = divmod(idx, 3)
            x0, y0 = round(col * cw), round(row * ch)
            x1, y1 = round((col + 1) * cw), round((row + 1) * ch)
            cell = arr[y0:y1, x0:x1]
            bg = flood_background(cell)
            alpha = np.where(bg, 0, 255).astype(np.uint8)
            rgba = np.dstack([cell, alpha])
            sprite = Image.fromarray(rgba, "RGBA")
            # 轻微模糊 alpha，柔化 JPEG 抗锯齿留下的亮边
            r, g, b, a = sprite.split()
            a = a.filter(ImageFilter.GaussianBlur(0.6))
            sprite = Image.merge("RGBA", (r, g, b, a))
            # 裁到内容包围盒
            bbox = sprite.getbbox()
            if bbox:
                sprite = sprite.crop(bbox)
            # 限制最大边长，控制体积
            if max(sprite.size) > MAX_SIDE:
                ratio = MAX_SIDE / max(sprite.size)
                sprite = sprite.resize(
                    (round(sprite.width * ratio), round(sprite.height * ratio)),
                    Image.LANCZOS,
                )
            sprite.save(OUT / f"{name}.png", optimize=True)
            opaque = float((np.asarray(a) > 0).mean())
            print(f"{name}.png {sprite.size} opaque={opaque:.2%}")


if __name__ == "__main__":
    main()
