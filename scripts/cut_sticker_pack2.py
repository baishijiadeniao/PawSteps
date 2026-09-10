"""把 picture/2 的两张布偶猫贴纸表切成带透明背景的 sprites，输出到 public/stickers/。

用法: python3 scripts/cut_sticker_pack2.py

去底逻辑与 cut_sticker_emojis.py 一致：从格子边界对"中性亮色"像素做泛洪填充，
只把与边框连通的白/浅灰当背景，贴纸白描边外的细灰线会被吃掉、暖白色的猫毛不会。

两张表都不是规整 3x3（第二张最后一行只有 2 格、列边界每行也不同），
所以格子框按背景投影实测后写死在 SHEETS 里。
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/stickers"
MAX_SIDE = 320

SHEET_A = ROOT / "picture/2/ChatGPT Image 2026年9月10日 23_54_07.png"
SHEET_B = ROOT / "picture/2/2196601e-b4fc-489c-94d1-5adfcb63b28b.png"

# (源表, 格子框 left,top,right,bottom, 输出文件名)
CELLS: list[tuple[Path, tuple[int, int, int, int], str]] = [
    # ---- 表 A：3 x 3 ----
    (SHEET_A, (9, 27, 408, 403), "big_hug"),            # 抱紧你
    (SHEET_A, (437, 27, 804, 403), "peace_yeah"),       # 比个耶
    (SHEET_A, (834, 27, 1243, 403), "good_night"),      # 晚安
    (SHEET_A, (17, 441, 408, 798), "so_happy"),         # 好开心
    (SHEET_A, (425, 441, 804, 798), "kitty_kiss"),      # 亲亲你
    (SHEET_A, (840, 441, 1238, 798), "super_cool"),     # 超酷
    (SHEET_A, (8, 844, 394, 1254), "wow_surprised"),    # 哇哦
    (SHEET_A, (416, 844, 825, 1254), "so_good"),        # 真乖
    (SHEET_A, (837, 844, 1242, 1254), "together_you"),  # 和你在一起
    # ---- 表 B：3 列 x 5 行，末行 2 格 ----
    (SHEET_B, (9, 12, 331, 341), "good_morning"),       # 早安呀!
    (SHEET_B, (353, 12, 676, 341), "what_cry"),         # 啥啊啊?
    (SHEET_B, (705, 12, 1019, 341), "huh_really"),      # 哈?
    (SHEET_B, (14, 356, 324, 651), "remind_you"),       # 我在提醒你哦!
    (SHEET_B, (345, 356, 678, 651), "so_sleepy"),       # 好困哦
    (SHEET_B, (692, 356, 1010, 651), "amazed"),         # 哇!
    (SHEET_B, (12, 673, 335, 964), "passed_it"),        # 通过啦!
    (SHEET_B, (355, 673, 676, 964), "not_bad"),         # 不错耶!
    (SHEET_B, (696, 673, 1011, 964), "bless_choo"),     # 喂你!阿嚏!
    (SHEET_B, (14, 976, 322, 1250), "angry_pout"),      # 生气啦!
    (SHEET_B, (363, 976, 660, 1250), "huh_confused"),   # 哈???
    (SHEET_B, (692, 976, 1000, 1250), "night_cuddle"),  # 晚安啦:3
    (SHEET_B, (103, 1274, 434, 1513), "too_cute"),      # 可爱爆了啦
    (SHEET_B, (500, 1274, 874, 1513), "cool_enough"),   # 我现在够酷了吗?!
]


def is_bg(px: np.ndarray) -> np.ndarray:
    """中性亮色 => 背景候选（棋盘格、贴纸外灰线、气泡留白都命中；暖白猫毛不命中）。"""
    mn = px.min(axis=-1)
    mx = px.max(axis=-1)
    return (mn >= 224) & ((mx - mn) <= 8)


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
    images: dict[Path, np.ndarray] = {}
    for sheet_path, box, name in CELLS:
        if sheet_path not in images:
            images[sheet_path] = np.asarray(Image.open(sheet_path).convert("RGB"))
        l, t, r, b = box
        cell = images[sheet_path][t:b, l:r]
        bg = flood_background(cell)
        alpha = np.where(bg, 0, 255).astype(np.uint8)
        sprite = Image.fromarray(np.dstack([cell, alpha]), "RGBA")
        # 轻微模糊 alpha，柔化抗锯齿留下的亮边
        rr, gg, bb, aa = sprite.split()
        aa = aa.filter(ImageFilter.GaussianBlur(0.6))
        sprite = Image.merge("RGBA", (rr, gg, bb, aa))
        bbox = sprite.getbbox()
        if bbox:
            sprite = sprite.crop(bbox)
        if max(sprite.size) > MAX_SIDE:
            ratio = MAX_SIDE / max(sprite.size)
            sprite = sprite.resize(
                (round(sprite.width * ratio), round(sprite.height * ratio)),
                Image.LANCZOS,
            )
        sprite.save(OUT / f"{name}.png", optimize=True)
        opaque = float((np.asarray(aa) > 0).mean())
        print(f"{name}.png {sprite.size} opaque={opaque:.2%}")


if __name__ == "__main__":
    main()
