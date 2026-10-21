"""把 picture/2 新增的两张 3x3 布偶猫表情表切成贴纸，输出到 public/stickers/。

用法: python3 scripts/cut_sticker_pack5.py [--preview]

为什么这次不做"泛洪去底"：这两张表是满版漫画分格——猫/女孩的身体被格边
直接裁断，主体贴着四条边，格子里根本没有一圈可供抠除的背景。
实测（逐格取众数色再泛洪）会把布偶猫的奶白肚皮整片抠穿，
所以正确的切法是把每一格当作一张"方卡贴纸"，只裁方格 + 倒圆角。

要点：
1. 格间是白色刀切线，位置实测后写死在 GRIDS 里；内边界内缩避开白线。
2. 圆角用 4x 超采样的 mask 再降采样，边缘不带锯齿。
3. 缩到 MAX_SIDE 走 pack4 的预乘 alpha 路径，避免圆角处出现暗边。
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/stickers"
MAX_SIDE = 320

SHEET_A = ROOT / "picture/2/file_00000000b62081fd9da16ffffc5d0225.png"
SHEET_B = ROOT / "picture/2/file_00000000539c8230ae310f1816450a7b.png"

# 每张表的三等分线（白色刀切线取中线，实测结果）
GRIDS = {
    SHEET_A: ([0, 415, 840, 1254], [0, 414, 839, 1254]),
    SHEET_B: ([0, 412, 840, 1254], [0, 415, 830, 1254]),
}

# 内边界内缩：白色刀切线宽 11~16 像素，取 10 才抠不到白边；
# 外缘是满版出血，只内缩 2 防边缘脏线。
INSET_INNER = 10
INSET_OUTER = 2
# 圆角半径（源图表素）
RADIUS = 46

# 每格 9 个贴纸名，顺序为行优先
NAMES_A = [
    "good_day_stretch",  # 黄底 仰躺举爪 "Good Day"
    "thumb_up_wink",     # 蓝底 眨眼竖大拇指
    "grumpy_stare",      # 紫底 斜眼不爽
    "fish_playmate",     # 粉底 趴桌沿 + 蓝鱼
    "loaf_sleep",        # 蓝底 侧睡 ZZZ
    "oh_really",         # 橙底 张嘴惊讶 !!
    "shades_cool",       # 绿底 墨镜 Cool Cat
    "fluffy_back",       # 粉底 背影翘尾
    "my_box",            # 蓝底 纸箱 My Box
]
NAMES_B = [
    "baby_kiss",        # 粉底 女孩亲猫 My Baby
    "belly_nap",        # 蓝白床 仰睡猫 ZZZ
    "yeah_good_day",    # 黄底 女孩比耶抱猫
    "posh_sit",         # 紫底 端坐猫
    "blanket_peek",     # 米色 被窝里探头
    "king_home",        # 蓝底 戴皇冠 King of Home
    "sleep_hugging",    # 蓝底 女孩侧睡抱猫（左下角有签名）
    "question_ears",    # 粉底 趴桌猫 + ? 气泡
    "always_together",  # 米黄底 抱猫大笑 Together Always
]


def load(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"))


def rounded_tile(cell: np.ndarray, radius: int) -> Image.Image:
    """方格 -> 圆角 RGBA 贴纸，圆角 mask 超采样 4 倍后降采样抗锯齿。"""
    sprite = Image.fromarray(np.ascontiguousarray(cell), "RGB").convert("RGBA")
    ss = 4
    big = Image.new("L", (sprite.width * ss, sprite.height * ss), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        [0, 0, big.width - 1, big.height - 1], radius=radius * ss, fill=255
    )
    sprite.putalpha(big.resize(sprite.size, Image.LANCZOS))
    return sprite


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


def report(name: str, sprite: Image.Image) -> None:
    alpha = np.asarray(sprite)[..., 3]
    print(f"{name}.png {sprite.size} opaque={float((alpha > 0).mean()):.2%}")


def cell_box(lines: list[int], index: int) -> tuple[int, int]:
    """第 index 格的起止（外缘贴边、内边界躲开白色刀切线）。"""
    lo = lines[index] + (INSET_OUTER if index == 0 else INSET_INNER)
    hi = lines[index + 1] - (INSET_OUTER if index == 2 else INSET_INNER)
    return lo, hi


def build_sprites() -> list[tuple[str, Image.Image]]:
    out: list[tuple[str, Image.Image]] = []
    for sheet, names in ((SHEET_A, NAMES_A), (SHEET_B, NAMES_B)):
        arr = load(sheet)
        cols, rows = GRIDS[sheet]
        for row in range(3):
            t, b = cell_box(rows, row)
            for col in range(3):
                l, r = cell_box(cols, col)
                out.append(
                    (names[row * 3 + col], rounded_tile(arr[t:b, l:r], RADIUS))
                )
    return out


def preview(sprites: list[tuple[str, Image.Image]], path: Path) -> None:
    """把 9 张贴纸拼成 3x3 预览图（洋红底，用来确认圆角与裁边）。"""
    tile = 340
    board = Image.new("RGBA", (tile * 3, tile * 3), (255, 0, 255, 255))
    for i, (_, sprite) in enumerate(sprites):
        s = min((tile - 20) / max(sprite.size), 1.0)
        small = sprite.resize(
            (max(1, round(sprite.width * s)), max(1, round(sprite.height * s))),
            Image.LANCZOS,
        )
        px, py = (i % 3) * tile, (i // 3) * tile
        board.alpha_composite(
            small, (px + (tile - small.width) // 2, py + (tile - small.height) // 2)
        )
    board.convert("RGB").save(path)
    print(f"preview -> {path}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    all_sprites = build_sprites()
    for name, sprite in all_sprites:
        out = shrink(sprite)
        out.save(OUT / f"{name}.png", optimize=True)
        report(name, out)
    if "--preview" in sys.argv:
        preview(all_sprites[:9], Path("/tmp/preview_a.png"))
        preview(all_sprites[9:], Path("/tmp/preview_b.png"))


if __name__ == "__main__":
    main()
