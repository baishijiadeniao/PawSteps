"""把 picture/联动 的三张 3x3 联动表切成独立贴纸，输出到 public/stickers/。

用法: python3 scripts/cut_sticker_pack3.py

三张源表本身就带透明通道（ChatGPT 导出的 RGBA），所以这里不做泛洪去底，
只按格子裁开 + 按 alpha 包围盒收紧 + 缩到 320px。

两个坑：
1. 表 1 是 1536x1024，格子不是正方形，而且三行的列边界各不相同；
   表 3 的白色刀切描边在格与格之间互相粘连，没有全零列。
   所以切线按背景投影实测后写死在 SHEETS 里（每行一组列切线）。
2. 表 1 的 alpha 最大值只有 254，且透明区的 RGB 是有颜色的垃圾值，
   直接 LANCZOS 缩放会在边缘糊出一圈粉灰色。
   因此先把 alpha 拉满、透明区 RGB 清零，再走预乘 alpha 缩放。
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/stickers"
MAX_SIDE = 320

SHEET_1 = ROOT / "picture/联动/ChatGPT Image 2026年9月13日 23_09_38.png"
SHEET_2 = ROOT / "picture/联动/ChatGPT Image 2026年9月13日 23_10_18.png"
SHEET_3 = ROOT / "picture/联动/ChatGPT Image 2026年9月13日 23_10_31.png"

# 每张表：行带 (top, bottom) + 每行的两条列切线 + 3x3 输出文件名（行优先）
# 行/列边界都取"相邻两格内容之间的空白中点"，不是内容包围盒，
# 否则切出来必然贴边、把溢出的描边和装饰切掉。
# 名字是按下标对齐格子的，不要的格子写 None 占位，删掉字符串会让后面全部错位。
SHEETS: list[
    tuple[Path, list[tuple[int, int]], list[tuple[int, int]], list[str | None]]
] = [
    # ---- Hello Kitty x 布偶猫（1536 x 1024，内容行带 26-374 / 380-688 / 694-1010）----
    (
        SHEET_1,
        [(0, 377), (377, 691), (691, 1024)],
        [(552, 990), (527, 1018), (538, 1014)],
        [
            "kitty_heart",
            "kitty_hug",
            "kitty_laptop",
            "kitty_bubble_tea",
            "kitty_nap",
            "kitty_costume",
            "kitty_umbrella",
            "kitty_pancake",
            "kitty_pillow",
        ],
    ),
    # ---- 玲娜贝儿 x 布偶猫（1254 x 1254，内容行带 53-443 / 470-837 / 849-1226）----
    (
        SHEET_2,
        [(0, 456), (456, 843), (843, 1254)],
        [(420, 834), (431, 847), (439, 831)],
        [
            "linabell_wave",
            "linabell_cuddle",
            "linabell_detective",
            None,  # 一起来自拍：不要这格
            "linabell_nap",
            "linabell_butterfly",
            "linabell_tea_party",
            "linabell_kiss",
            "linabell_trip",
        ],
    ),
    # ---- 星星人 x 布偶猫（1254 x 1254，内容行带 15-421 / 429-814 / 824-1231）----
    (
        SHEET_3,
        [(0, 425), (425, 819), (819, 1254)],
        [(424, 822), (421, 829), (423, 825)],
        [
            "starry_stargazing",
            "starry_hug",
            "starry_sleep",
            "starry_star",
            "starry_box",
            "starry_ride",
            "starry_sunset",
            "starry_wish",
            "starry_cheer",
        ],
    ),
]


def load(sheet: Path) -> np.ndarray:
    """读表并修掉 alpha 通道里的两处导出瑕疵。"""
    a = np.asarray(Image.open(sheet).convert("RGBA")).copy()
    al = a[..., 3]
    al[al >= 250] = 255  # 表 1 整体只有 254，拉成真正不透明
    for i in range(3):  # 透明区的 RGB 是垃圾值，先清零避免缩放时糊色
        a[..., i][al == 0] = 0
    return a


def shrink(sprite: Image.Image) -> Image.Image:
    """预乘 alpha 缩放到 MAX_SIDE 以内。"""
    if max(sprite.size) <= MAX_SIDE:
        return sprite
    ratio = MAX_SIDE / max(sprite.size)
    size = (round(sprite.width * ratio), round(sprite.height * ratio))
    a = np.asarray(sprite).astype(np.float32)
    alpha = a[..., 3:4] / 255.0
    pre = np.round(np.dstack([a[..., :3] * alpha, a[..., 3]])).astype(np.uint8)
    small = np.asarray(Image.fromarray(pre, "RGBA").resize(size, Image.LANCZOS)).astype(
        np.float32
    )
    al = small[..., 3:4]
    rgb = np.where(al > 1, small[..., :3] * 255.0 / np.maximum(al, 1.0), 0.0)
    out = np.round(np.dstack([np.clip(rgb, 0, 255), al])).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for sheet, row_bands, col_cuts, names in SHEETS:
        arr = load(sheet)
        width = arr.shape[1]
        for r, (top, bottom) in enumerate(row_bands):
            left_cut, right_cut = col_cuts[r]
            edges = [0, left_cut, right_cut, width]
            for c in range(3):
                name = names[r * 3 + c]
                if name is None:
                    continue
                l, rr = edges[c], edges[c + 1]
                sprite = Image.fromarray(arr[top:bottom, l:rr], "RGBA")
                box = sprite.getbbox()
                sprite = sprite.crop(box) if box else sprite
                sprite = shrink(sprite)
                sprite.save(OUT / f"{name}.png", optimize=True)
                alpha = np.asarray(sprite)[..., 3]
                print(
                    f"{name}.png {sprite.size} "
                    f"opaque={float((alpha > 0).mean()):.2%}"
                )


if __name__ == "__main__":
    main()
