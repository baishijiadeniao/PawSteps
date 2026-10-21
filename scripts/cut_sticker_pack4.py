"""把 picture/联动 新增的五张 3x3 联动表切成独立贴纸，输出到 public/stickers/。

用法: python3 scripts/cut_sticker_pack4.py

与 pack3 的区别：这五张源表是 RGB 实底（没有透明通道），
所以要先做"泛洪去底"——从边缘向内扩散，把与背景色足够接近的
连通区域抠成透明，再按 alpha 包围盒收紧 + 预乘 alpha 缩到 320px。

要点：
1. 抠图按背景色判：小丸子表是粉底，星黛露/可琦安/达菲三张是黑底，
   玲娜贝儿四季表每格一个粉彩色（外加一圈渐白晕染）。
2. 水彩边缘是渐变的，纯硬阈值会留一圈毛边，
   所以在背景连通区的外圈窄带里按"离背景色的距离"做线性 alpha 过渡。
3. 表1-4（粉底/黑底）的内容会真实跨越三等分行线（野餐垫、帐篷尖），
   相邻图案在行线上互相搭接，直线切谁都不对。所以整表泛洪去底后，
   给每格取"离背景最远"的种子点，再按"普通前景低成本、颜色过渡带
   高成本"做多源 Dijkstra 竞争生长（手写分水岭）：分界线会自己贴到
   图案边缘的颜色过渡带上，而不是一刀切在几何中线。
4. 生长后做碎片归位：和格内主体不连通的孤立小碎片（如漂到邻格的
   帐篷顶小星星）改判给本体离它最近的那格。
   另外有些装饰（星黛露的帐篷顶星、花篮兔弯耳）经草皮"细颈"和邻格
   身体连通，任何通用规则都无法把它和"合法越线"（立耳尖、挂垂草皮）
   区分开，所以在 SHEETS 里给对应表配 override 矩形区 + 颜色谓词，
   分格后强制改判。
5. 表5（四季）格间有白色刀切线、内容不越界，保持逐格切 + 逐格泛洪。
"""

import heapq
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/stickers"
MAX_SIDE = 320

SHEET_1 = ROOT / "picture/联动/ChatGPT Image 2026年9月14日 17_42_38.png"  # 樱桃小丸子（粉底）
SHEET_2 = ROOT / "picture/联动/ChatGPT Image 2026年9月14日 17_42_43.png"  # 星黛露（黑底）
SHEET_3 = ROOT / "picture/联动/ChatGPT Image 2026年9月14日 17_42_52.png"  # 可琦安（黑底）
SHEET_4 = ROOT / "picture/联动/ChatGPT Image 2026年9月14日 17_42_56.png"  # 达菲（黑底）
SHEET_5 = ROOT / "picture/联动/ChatGPT Image 2026年9月14日 18_55_25.png"  # 玲娜贝儿四季（每格粉彩）

PINK = (30, 12, 45, (249, 212, 209))  # (conn, ramp_lo, ramp_hi, 固定背景色)
BLACK = (48, 18, 80, (0, 0, 0))
# 四季表每格一个粉彩色，且格缘有一圈"渐白"晕染：背景色按整格众数估计，
# 走 cell_sprite_pastel 的"两遍墙 + 线段清理"路径（conn 为第二遍泛洪阈值）。
PASTEL = (45, 14, 55, None)
WHITE = np.array([255, 255, 255], dtype=np.int16)

# override 条目：(行起, 行终, 列起, 列终, 目标格 0..8, 颜色谓词)
Override = tuple[int, int, int, int, int, Callable[[np.ndarray], np.ndarray]]


def _not_green(rgb: np.ndarray) -> np.ndarray:
    """非"草绿"像素：耳朵、星星及其描边之类；草皮挂垂留在原格。"""
    a = rgb.astype(np.int32)
    return ~((a[..., 1] > a[..., 0] + 5) & (a[..., 1] > a[..., 2] + 5))


def _not_grass(rgb: np.ndarray) -> np.ndarray:
    """在 _not_green 基础上再排除橄榄黄绿（walk 草坪下垂的草尖色）。"""
    a = rgb.astype(np.int32)
    olive = (np.abs(a[..., 0] - a[..., 1]) <= 30) & (a[..., 1] > a[..., 2] + 45)
    return _not_green(rgb) & ~olive


# 每张表：源文件 + 3x3 分格边界([列, 行]) + 去底参数 + 输出文件名（行优先）+ 强制改判区
GRID_1536 = ([0, 512, 1024, 1536], [0, 341, 683, 1024])
GRID_1254 = ([0, 418, 836, 1254], [0, 418, 836, 1254])
# 小丸子表实测的行/列空白沟中点，比三等分更贴合真实布局
GRID_MARUKO = ([0, 503, 1005, 1536], [0, 390, 710, 1024])

SHEETS: list[
    tuple[
        Path,
        tuple[list[int], list[int]],
        tuple[int, int, int, tuple[int, int, int] | None],
        list[str],
        list[Override],
    ]
] = [
    # ---- 樱桃小丸子 x 布偶猫 ----
    (
        SHEET_1,
        GRID_MARUKO,
        PINK,
        [
            "maruko_hug",
            "maruko_butterfly",
            "maruko_jump",
            "maruko_draw",
            "maruko_outing",
            "maruko_sleep",
            "maruko_icecream",
            "maruko_bush",
            "maruko_cake",
        ],
        [],
    ),
    # ---- 星黛露 x 布偶猫 ----
    (
        SHEET_2,
        GRID_1536,
        BLACK,
        [
            "stellalou_hug",
            "stellalou_flowerbed",
            "stellalou_tea",
            "stellalou_cuddle",
            "stellalou_tent",
            "stellalou_walk",
            "stellalou_magic",
            "stellalou_cloud",
            "stellalou_basket",
        ],
        [
            # 帐篷顶星：经草皮细颈被 flowerbed(1) 顺走，强制还给 tent(4)
            # 星尖从 350 行起；区内非绿内容全是星星/挂绳，深色描边也一并吃掉
            (350, 413, 705, 800, 4, _not_green),
            # 花篮兔弯耳上半：被 walk(5) 的草地拿下，强制还给 basket(8)。
            # 下行到 770 把弯耳与头部的连接带一并归还，避免穹顶悬浮；
            # 谓词排除草绿与橄榄黄绿（草坪下垂草尖）。穹顶是上窄下宽的
            # 梯形，两侧草尖/花瓣像素会混进宽矩形，故按行分三段收紧列界。
            (686, 694, 1240, 1310, 8, _not_grass),
            (694, 702, 1225, 1330, 8, _not_grass),
            (702, 770, 1195, 1365, 8, _not_grass),
        ],
    ),
    # ---- 可琦安 x 布偶猫 ----
    (
        SHEET_3,
        GRID_1536,
        BLACK,
        [
            "cookieann_hug",
            "cookieann_cuddle",
            "cookieann_cookie",
            "cookieann_grass",
            "cookieann_icecream",
            "cookieann_picnic",
            "cookieann_nap",
            "cookieann_photo",
            "cookieann_petal",
        ],
        [],
    ),
    # ---- 达菲 x 布偶猫 ----
    (
        SHEET_4,
        GRID_1536,
        BLACK,
        [
            "duffy_hug",
            "duffy_mat",
            "duffy_school",
            "duffy_sandcastle",
            "duffy_sleep",
            "duffy_flowers",
            "duffy_pounce",
            "duffy_sunset",
            "duffy_teacup",
        ],
        [],
    ),
    # ---- 玲娜贝儿四季款 x 布偶猫 ----
    (
        SHEET_5,
        GRID_1254,
        PASTEL,
        [
            "linabell_sprout",
            "linabell_rain",
            "linabell_radish",
            "linabell_lotus",
            "linabell_watermelon",
            "linabell_lily",
            "linabell_maple",
            "linabell_snowball",
            "linabell_snowman",
        ],
        [],
    ),
]


def load(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"))


def cell_bg(cell: np.ndarray) -> np.ndarray:
    """整格颜色按 16 一档取众数，作为该格的背景色估计。"""
    quantized = cell.astype(np.int32) // 16
    codes = (quantized[..., 0] * 16 + quantized[..., 1]) * 16 + quantized[..., 2]
    values, counts = np.unique(codes.ravel(), return_counts=True)
    top = int(values[counts.argmax()])
    return np.array([top // 256, (top // 16) % 16, top % 16], dtype=np.int16) * 16 + 8


def flood_alpha(px: np.ndarray, bg: np.ndarray, conn: int, lo: int, hi: int, allow_white: bool) -> np.ndarray:
    """RGB 像素 -> float alpha：从边缘泛洪抠背景，外圈窄带做 alpha 渐变。"""
    dist = np.abs(px - bg).max(axis=2)
    if allow_white:
        # 粉彩格的格缘有一圈渐白的晕染，接近纯白的部分一并视作背景
        dist = np.minimum(dist, np.abs(px - WHITE).max(axis=2))

    near = dist <= conn
    pad = np.zeros((near.shape[0] + 2, near.shape[1] + 2), dtype=bool)
    pad[1:-1, 1:-1] = near
    labels, _ = ndimage.label(pad, structure=np.ones((3, 3)))
    labels = labels[1:-1, 1:-1]
    border_labels = np.unique(
        np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    )
    border_labels = border_labels[border_labels > 0]
    bg_mask = np.isin(labels, border_labels)

    band = ndimage.binary_dilation(bg_mask, iterations=2) & ~bg_mask
    ramp = np.clip((dist - lo) / (hi - lo), 0.0, 1.0)

    alpha = np.full(dist.shape, 255.0)
    alpha[band] = ramp[band] * 255.0
    alpha[bg_mask] = 0.0
    return alpha


def _disk(radius: int) -> np.ndarray:
    y, x = np.ogrid[-radius : radius + 1, -radius : radius + 1]
    return (x * x + y * y) <= radius * radius


def _entry_cost(arr: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """生长进入每个前景像素的代价（整数 1..9）。

    普通不透明像素代价≈1；两件事会让代价变高：
    1. 颜色突变处（相邻像素 RGB 差很大）——水彩图案之间的"接缝"，
       代价高意味着两波的边界愿意贴到这里；
    2. 半透明处（alpha 低）——水彩的淡边/水痕，不属于任何图案的身体，
       波前宁可绕行，避免顺着淡边把邻格的小挂件牵走。
    """
    a = arr.astype(np.int16)
    grad = np.zeros(alpha.shape, dtype=np.int32)
    d0 = np.abs(np.diff(a, axis=0)).max(axis=2)
    grad[:-1] = np.maximum(grad[:-1], d0)
    grad[1:] = np.maximum(grad[1:], d0)
    d1 = np.abs(np.diff(a, axis=1)).max(axis=2)
    grad[:, :-1] = np.maximum(grad[:, :-1], d1)
    grad[:, 1:] = np.maximum(grad[:, 1:], d1)
    edge = np.clip(grad // 18, 0, 4)
    faint = np.clip((190 - alpha.astype(np.int32)) // 32, 0, 4)
    return (1 + edge + faint).astype(np.int32)


def geodesic_partition(
    fg: np.ndarray,
    col_edges: list[int],
    row_edges: list[int],
    alpha: np.ndarray,
    arr: np.ndarray,
    overrides: list[Override] = (),
) -> np.ndarray:
    """把前景分给 9 个格。分两步：

    1. 只给"实心"前景（alpha >= SOLID）分格：开运算找到每格图案的
       "主体"，在主体片区的最深处播种，按逐像素代价做多源最短路径
       竞争生长（marker-controlled watershed，heapq 实现）。
       进入像素的代价在颜色接缝/淡边处变高，所以边界会贴到图案
       边缘的色边上，叠在草地上的兔耳会判给耳朵本体所在的那格。
       没种子连到的孤立实心碎片（漂进邻格的帐篷顶小星星之类），
       归给本体离它最近的那格。
    2. 半透明的淡边/水痕（0 < alpha < SOLID）不属于任何图案的身体，
       统一划给最近的实心像素那一格。
    """
    SOLID = 128
    solid = fg & (alpha >= SOLID)
    body = ndimage.binary_opening(solid, structure=_disk(25))
    labels, _ = ndimage.label(body, structure=np.ones((3, 3)))
    depth = ndimage.distance_transform_edt(solid)
    seeds: dict[int, int] = {}
    h, w = fg.shape
    for cell in range(9):
        r, c = divmod(cell, 3)
        y0, y1 = row_edges[r], row_edges[r + 1]
        x0, x1 = col_edges[c], col_edges[c + 1]
        region = labels[y0:y1, x0:x1]
        best_idx, best_ov = 0, 0
        if region.max() > 0:
            sizes = np.bincount(region.ravel())
            sizes[0] = 0
            best_idx = int(sizes.argmax())
            best_ov = int(sizes[best_idx])
        if best_ov < 3000:  # 该格没有像样的主体
            continue
        # 种子取"主体在本格范围内那一片"的中心附近、离背景最深处；
        # 若与邻格图案粘成同一 blob，两片会各自取到自己那一边的身体
        comp = labels == best_idx
        slice_ = np.zeros_like(comp)
        slice_[y0:y1, x0:x1] = comp[y0:y1, x0:x1]
        sy, sx = np.nonzero(slice_)
        cy, cx = int(round(sy.mean())), int(round(sx.mean()))
        win = np.zeros_like(depth)
        y_lo, y_hi = max(0, cy - 60), min(h, cy + 61)
        x_lo, x_hi = max(0, cx - 60), min(w, cx + 61)
        win[y_lo:y_hi, x_lo:x_hi] = np.where(
            slice_[y_lo:y_hi, x_lo:x_hi], depth[y_lo:y_hi, x_lo:x_hi], 0
        )
        py, px_ = np.unravel_index(np.argmax(win), win.shape)
        if win[py, px_] > 0:
            seeds[cell] = py * w + px_

    # 多源 Dijkstra（先弹出者获得像素）：进入像素代价见 _entry_cost
    cost = _entry_cost(arr, alpha)
    dist = np.full(fg.shape, np.iinfo(np.int64).max, dtype=np.int64)
    owner = np.full(fg.shape, -1, dtype=np.int8)
    heap: list[tuple[int, int]] = []
    for cell, idx in seeds.items():
        dist.flat[idx] = 0
        owner.flat[idx] = cell
        heap.append((0, int(idx)))
    heapq.heapify(heap)
    cost_flat = cost.ravel()
    solid_flat = solid.ravel()
    dist_flat = dist.ravel()
    # (dy, dx, 展平偏移)：8 邻域
    nbrs = [(dy, dx, dy * w + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0)]
    while heap:
        cur, idx = heapq.heappop(heap)
        if cur > dist_flat[idx]:  # 过期的堆项
            continue
        who = owner.flat[idx]
        y, x = divmod(idx, w)
        for dy, dx, off in nbrs:
            ny, nx = y + dy, x + dx
            if not (0 <= ny < h and 0 <= nx < w):
                continue
            n = idx + off
            if not solid_flat[n]:
                continue
            nd = cur + int(cost_flat[n])
            if nd < dist_flat[n]:
                dist_flat[n] = nd
                owner.flat[n] = who
                heapq.heappush(heap, (nd, int(n)))

    # 孤立实心碎片归位：生长没连到的实心连通域（没有本格的种子），
    # 改判给本体离它最近的那格（如漂进花床格的帐篷顶小星星）
    claimed = solid & (owner >= 0)
    orphans, n_orph = ndimage.label(solid & ~claimed, structure=np.ones((3, 3)))
    if n_orph:
        dists = {
            c: ndimage.distance_transform_edt(~(solid & (owner == c)))
            for c in seeds
        }
        sizes = np.bincount(orphans.ravel())
        for cid in range(1, n_orph + 1):
            if sizes[cid] < 100:  # 噪声碎点，直接丢弃
                continue
            frag = orphans == cid
            target = min(dists, key=lambda c: float(dists[c][frag].mean()))
            owner[frag] = target
        claimed = solid & (owner >= 0)

    # 手工改判：把指定矩形区里满足颜色谓词的实心像素强制划给目标格
    # （通用规则无法区分"细颈偷窃"和"合法越线"，见模块注释第 4 点）
    for r0, r1, c0, c1, cell, pred in overrides:
        sel = solid[r0:r1, c0:c1] & pred(arr[r0:r1, c0:c1])
        sub = owner[r0:r1, c0:c1]
        sub[sel] = cell
        owner[r0:r1, c0:c1] = sub

    # 淡边归位：半透明像素划给最近的实心像素那一格
    halo = fg & ~claimed
    if halo.any():
        near = ndimage.distance_transform_edt(
            ~claimed, return_distances=False, return_indices=True
        )
        owner[halo] = owner[near[0][halo], near[1][halo]]
    return np.where(fg, owner, -1)


def sheet_sprites(
    arr: np.ndarray,
    col_edges: list[int],
    row_edges: list[int],
    conn: int,
    lo: int,
    hi: int,
    bg_rgb: tuple[int, int, int],
    overrides: list[Override] = (),
) -> list[Image.Image]:
    """整表泛洪去底 + 测地分格，返回 9 个 RGBA（已按包围盒收紧）。"""
    px = arr.astype(np.int16)
    alpha = flood_alpha(px, np.array(bg_rgb, dtype=np.int16), conn, lo, hi, False)
    fg = alpha > 0
    owner = geodesic_partition(fg, col_edges, row_edges, alpha, arr, overrides)

    out: list[Image.Image] = []
    for cell in range(9):
        sub = owner == cell
        sprite_alpha = np.where(sub, alpha, 0).astype(np.uint8)
        rgb = arr.copy()
        rgb[sprite_alpha == 0] = 0
        sprite = Image.fromarray(np.dstack([rgb, sprite_alpha]), "RGBA")
        box = sprite.getbbox()
        out.append(sprite.crop(box) if box else sprite)
    return out


def finish_sprite(cell: np.ndarray, alpha: np.ndarray) -> Image.Image:
    a = alpha.astype(np.uint8)
    rgb = cell.copy()
    rgb[a == 0] = 0
    sprite = Image.fromarray(np.dstack([rgb, a]), "RGBA")
    box = sprite.getbbox()
    return sprite.crop(box) if box else sprite


def cell_sprite_pastel(cell: np.ndarray, conn: int, lo: int, hi: int) -> Image.Image:
    """四季表单格去底：背景是"格缘白晕 -> 粉彩中心"的宽渐变，角色白毛、
    粉身体与背景色几乎相同，单次泛洪无法既清底又保内容。三步走：

    1. conn=20 保守泛洪，且把粉色调像素（R-G>=25 且 |G-B|<=14，粉身体与
       奶白背景差在色度方向而非亮度）从"近背景"里排除；
    2. 以第一遍幸存的白/粉内容为核外扩 3px 立"墙"，再 conn 泛洪一遍——
       墙挡住泛洪吞掉与白晕同色的白毛；
    3. 墙会圈住一些渐变残底岛：按"到 WHITE->背景色线段的距离 <= 12"找
       与已抠除区域相连的像素并入背景（背景渐变全在线上，白毛/粉身偏离线）。
    """
    pi = cell.astype(np.int32)
    bg = cell_bg(pi.astype(np.int16)).astype(np.int32)
    d_mode = np.abs(pi - bg).max(axis=2)
    d_white = np.abs(pi - WHITE.astype(np.int32)).max(axis=2)
    dist = np.minimum(d_mode, d_white)
    pinkish = (pi[..., 0] - pi[..., 1] >= 25) & (np.abs(pi[..., 1] - pi[..., 2]) <= 14)

    def border_flood(near: np.ndarray) -> np.ndarray:
        pad = np.zeros((near.shape[0] + 2, near.shape[1] + 2), dtype=bool)
        pad[1:-1, 1:-1] = near
        labels, _ = ndimage.label(pad, structure=np.ones((3, 3)))
        labels = labels[1:-1, 1:-1]
        bl = np.unique(np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]))
        return np.isin(labels, bl[bl > 0])

    bg1 = border_flood((dist <= 20) & ~pinkish)
    barrier = ndimage.binary_dilation((~bg1) & ((d_white <= 30) | pinkish), iterations=3)
    bg2 = border_flood(((dist <= conn) & ~barrier) | bg1) & ~barrier
    bgm = bg1 | bg2

    w = WHITE.astype(np.float64)
    v = bg.astype(np.float64) - w
    t = np.clip(((pi - w) @ v) / float((v * v).sum()), 0.0, 1.0)[..., None]
    d_line = np.abs(pi - (w + t * v)).max(axis=2)
    line_near = d_line <= 12
    pad = np.zeros((line_near.shape[0] + 2, line_near.shape[1] + 2), dtype=bool)
    pad[1:-1, 1:-1] = line_near
    labels, _ = ndimage.label(pad, structure=np.ones((3, 3)))
    labels = labels[1:-1, 1:-1]
    touching = np.unique(labels[ndimage.binary_dilation(bgm) & line_near])
    bgm |= np.isin(labels, touching[touching > 0])

    band = ndimage.binary_dilation(bgm, iterations=2) & ~bgm
    ramp = np.clip((dist - lo) / (hi - lo), 0.0, 1.0)
    alpha = np.full(dist.shape, 255.0)
    alpha[band] = ramp[band] * 255.0
    alpha[bgm] = 0.0
    return finish_sprite(cell, alpha)


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
    edge = np.concatenate([alpha[0, :], alpha[-1, :], alpha[:, 0], alpha[:, -1]])
    print(
        f"{name}.png {sprite.size} "
        f"opaque={float((alpha > 0).mean()):.2%} edge_touch={float((edge > 0).mean()):.1%}"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for sheet, (col_edges, row_edges), (conn, lo, hi, fixed_bg), names, overrides in SHEETS:
        arr = load(sheet)
        if fixed_bg is not None:  # 表1-4：整表泛洪 + 测地分格
            sprites = sheet_sprites(arr, col_edges, row_edges, conn, lo, hi, fixed_bg, overrides)
        else:  # 表5：四季表格子相连、有白色刀切线，逐格内缩 7px 再切
            inset = 7
            sprites = []
            for r in range(3):
                for c in range(3):
                    cell = arr[
                        row_edges[r] + inset : row_edges[r + 1] - inset,
                        col_edges[c] + inset : col_edges[c + 1] - inset,
                    ]
                    sprites.append(cell_sprite_pastel(cell, conn, lo, hi))
        for name, sprite in zip(names, sprites):
            out = shrink(sprite)
            out.save(OUT / f"{name}.png", optimize=True)
            report(name, out)


if __name__ == "__main__":
    main()
