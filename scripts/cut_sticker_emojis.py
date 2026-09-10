"""把两张 3x3 表情贴纸表切成带透明背景的 sprites，输出到 public/stickers/。

用法: python3 scripts/cut_sticker_emojis.py
背景是被压进 JPG 的"透明棋盘格"（中性 243/255 交替），从格子边界泛洪填充去除；
贴纸白描边外有一圈细灰线（~226-239）、文字气泡偏暖白，都能挡住泛洪不被误切。
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEETS = {
    # 注意：两表右下角格子带"豆包AI生成"水印（暖白色，与猫毛同色无法按颜色剔除），故不取用
    ROOT / "picture/1/表情1.jpg": [
        "you_are_the_best",  # 你最棒了
        "wipe_sweat",        # 擦擦汗
        "eat_well",          # 好好吃饭
        "sleep_well",        # 安心睡吧
        "pat_pat",           # 我拍拍你
        "shine_today",       # 今天也有光
        "get_better",        # 会好起来的
        "recover_together",  # 陪你慢慢恢复
    ],
    ROOT / "picture/1/表情2.jpg": [
        "better_today",  # 今天也会好一点
        "cheer_cheer",   # 加油加油
        "take_it_slow",  # 慢慢来就好
        "super_brave",   # 你超勇敢
        "with_you",      # 我陪着你
        "drink_water",   # 记得喝水
        "take_medicine", # 乖乖吃药
        "rest_well",     # 好好休息
    ],
}
OUT = ROOT / "public/stickers"
MAX_SIDE = 320


def is_bg(px: np.ndarray) -> np.ndarray:
    """中性亮色 => 背景候选。

    棋盘格(243/255 纯中性)与贴纸描边的灰线/白带都命中；
    猫的白毛是暖白(R-B 约 14)不命中，泛洪到毛发即停，不会啃出洞。
    """
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
