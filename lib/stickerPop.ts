/**
 * 表情包贴纸弹出事件总线。
 *
 * 项目里没有跨组件反馈机制（彩带都是各组件局部 state），
 * 这里用一个最小的 window CustomEvent 做全局广播：
 * 业务侧调用 popSticker(scene)，全局挂载的 <StickerPopup /> 负责动画展示。
 */

/** 触发场景：单项打卡完成，或保存心情时的心情档位 */
export type StickerScene =
  | "checkin"
  | "GREAT"
  | "GOOD"
  | "OK"
  | "DOWN"
  | "ANXIOUS";

/** 事件名（全局唯一） */
export const STICKER_POP_EVENT = "app:sticker-pop";

/** "当天全部康复任务完成"事件：桌宠听到后会跳庆祝舞 */
export const ALL_DONE_EVENT = "app:all-done";

/** 派发一次"全部完成"事件；非浏览器环境下静默跳过 */
export function announceAllDone(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ALL_DONE_EVENT));
}

/** 贴纸文件名列表（对应 public/stickers/*.png），用于预加载 */
export const ALL_STICKERS = [
  "you_are_the_best",
  "wipe_sweat",
  "eat_well",
  "sleep_well",
  "pat_pat",
  "shine_today",
  "get_better",
  "recover_together",
  "better_today",
  "cheer_cheer",
  "take_it_slow",
  "super_brave",
  "with_you",
  "drink_water",
  "take_medicine",
  "rest_well",
  // picture/2 首批两张表情表切出的 23 张日常贴纸（收集册里开箱即用）
  "big_hug",
  "peace_yeah",
  "good_night",
  "so_happy",
  "kitty_kiss",
  "super_cool",
  "wow_surprised",
  "so_good",
  "together_you",
  "good_morning",
  "what_cry",
  "huh_really",
  "remind_you",
  "so_sleepy",
  "amazed",
  "passed_it",
  "not_bad",
  "bless_choo",
  "angry_pout",
  "huh_confused",
  "night_cuddle",
  "too_cute",
  "cool_enough",
  // picture/2 新增两张九宫格切出的 18 张贴纸（满版漫画分格，切成圆角方卡）
  "good_day_stretch",
  "thumb_up_wink",
  "grumpy_stare",
  "fish_playmate",
  "loaf_sleep",
  "oh_really",
  "shades_cool",
  "fluffy_back",
  "my_box",
  "baby_kiss",
  "belly_nap",
  "yeah_good_day",
  "posh_sit",
  "blanket_peek",
  "king_home",
  "sleep_hugging",
  "question_ears",
  "always_together",
  // picture/联动 八张 3x3 联动表切出的 71 张贴纸（每个术后日解锁一张）
  "kitty_heart",
  "kitty_hug",
  "kitty_laptop",
  "kitty_bubble_tea",
  "kitty_nap",
  "kitty_costume",
  "kitty_umbrella",
  "kitty_pancake",
  "kitty_pillow",
  "linabell_wave",
  "linabell_cuddle",
  "linabell_detective",
  "linabell_nap",
  "linabell_butterfly",
  "linabell_tea_party",
  "linabell_kiss",
  "linabell_trip",
  "starry_stargazing",
  "starry_hug",
  "starry_sleep",
  "starry_star",
  "starry_box",
  "starry_ride",
  "starry_sunset",
  "starry_wish",
  "starry_cheer",
  // 樱桃小丸子 x 布偶猫
  "maruko_hug",
  "maruko_butterfly",
  "maruko_jump",
  "maruko_draw",
  "maruko_outing",
  "maruko_sleep",
  "maruko_icecream",
  "maruko_bush",
  "maruko_cake",
  // 星黛露 x 布偶猫
  "stellalou_hug",
  "stellalou_flowerbed",
  "stellalou_tea",
  "stellalou_cuddle",
  "stellalou_tent",
  "stellalou_walk",
  "stellalou_magic",
  "stellalou_cloud",
  "stellalou_basket",
  // 可琦安 x 布偶猫
  "cookieann_hug",
  "cookieann_cuddle",
  "cookieann_cookie",
  "cookieann_grass",
  "cookieann_icecream",
  "cookieann_picnic",
  "cookieann_nap",
  "cookieann_photo",
  "cookieann_petal",
  // 达菲 x 布偶猫
  "duffy_hug",
  "duffy_mat",
  "duffy_school",
  "duffy_sandcastle",
  "duffy_sleep",
  "duffy_flowers",
  "duffy_pounce",
  "duffy_sunset",
  "duffy_teacup",
  // 玲娜贝儿四季 x 布偶猫
  "linabell_sprout",
  "linabell_rain",
  "linabell_radish",
  "linabell_lotus",
  "linabell_watermelon",
  "linabell_lily",
  "linabell_maple",
  "linabell_snowball",
  "linabell_snowman",
] as const;

export type StickerName = (typeof ALL_STICKERS)[number];

/** 每个场景对应的候选贴纸池，弹出时随机取一个 */
const STICKER_POOLS: Record<StickerScene, StickerName[]> = {
  // 完成单项打卡：夸夸 + 鼓励为主
  checkin: [
    "you_are_the_best",
    "cheer_cheer",
    "shine_today",
    "super_brave",
    "pat_pat",
    "better_today",
  ],
  // 心情很好：一起开心
  GREAT: ["shine_today", "you_are_the_best", "better_today", "super_brave"],
  // 心情不错：轻鼓励
  GOOD: ["cheer_cheer", "pat_pat", "better_today", "eat_well"],
  // 一般：日常照顾类
  OK: ["take_it_slow", "eat_well", "drink_water", "rest_well", "sleep_well"],
  // 低落：陪伴安抚
  DOWN: ["with_you", "get_better", "wipe_sweat", "recover_together"],
  // 焦虑：安抚放松
  ANXIOUS: ["wipe_sweat", "take_it_slow", "with_you", "sleep_well"],
};

/** 派发一次贴纸弹出事件；非浏览器环境（SSR）下静默跳过 */
export function popSticker(scene: StickerScene): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STICKER_POP_EVENT, { detail: scene }));
}

/**
 * 从场景贴纸池里随机挑一张。
 * 传入 unlocked（已解锁贴纸集合）时实现"已解锁才进随机池"：
 * - 场景池与已解锁集合取交集后随机；
 * - 若该场景的贴纸一张都没解锁，则从全部已解锁里随机；
 * - unlocked 传 null（尚未取到解锁数据）时退回完整池，保证首次体验不空。
 */
export function pickSticker(
  scene: StickerScene,
  unlocked?: StickerName[] | null
): StickerName {
  const pool = STICKER_POOLS[scene];
  if (!unlocked) return pool[Math.floor(Math.random() * pool.length)];
  const filtered = pool.filter((s) => unlocked.includes(s));
  const source = filtered.length > 0 ? filtered : unlocked;
  return source[Math.floor(Math.random() * source.length)];
}

/**
 * 从场景贴纸池里确定性地挑一张：取池内（按情绪契合度排序）第一张已解锁的。
 * 用于心情档位按钮等需要"图随情绪固定"的位置，避免每次渲染随机跳变。
 */
export function pickStickerStable(
  scene: StickerScene,
  unlocked?: StickerName[] | null
): StickerName {
  const pool = STICKER_POOLS[scene];
  if (unlocked) {
    const first = pool.find((s) => unlocked.includes(s));
    if (first) return first;
  }
  return pool[0];
}

/** 贴纸的静态资源路径 */
export function stickerSrc(name: StickerName): string {
  return `/stickers/${name}.png`;
}

/**
 * 从已解锁集合里随机挑一张（不区分场景，用于装饰性位置）。
 * unlocked 为空或缺失时退回完整池，保证画面不空。
 */
export function pickAnyUnlocked(unlocked?: StickerName[] | null): StickerName {
  const source = unlocked && unlocked.length > 0 ? unlocked : [...ALL_STICKERS];
  return source[Math.floor(Math.random() * source.length)];
}
