/**
 * 贴纸图鉴目录：每张布偶猫表情包贴纸的中文名 + 解锁方式文案。
 *
 * 收集册格子里不放文字，label / how 用在预览层：
 * - 已解锁：贴纸名 + 解锁日期，可下载；
 * - 未解锁：灰剪影 + "？"，只提示 how（解锁条件）。
 */

import type { StickerName } from "./stickerPop";

export interface StickerCatalogEntry {
  /** 中文名字（收集册展示用） */
  label: string;
  /** 解锁方式文案（未解锁时展示的提示） */
  how: string;
}

/**
 * picture/2 两张表情表切出的 23 张日常贴纸。
 * 不参与解锁规则，初始即为解锁状态，只按展示顺序排在成长路线之后。
 */
const DAILY_STICKERS: StickerName[] = [
  // 表 A（3 x 3）
  "big_hug",
  "peace_yeah",
  "good_night",
  "so_happy",
  "kitty_kiss",
  "super_cool",
  "wow_surprised",
  "so_good",
  "together_you",
  // 表 B（3 列 x 5 行，末行 2 格）
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
];

/**
 * picture/联动 三张 3x3 联动表，每张表一个系列
 * （玲娜贝儿表的"一起来自拍"一格已剔除，不切图）。
 * 数组顺序 = 解锁顺序：术后第 N 天解锁该系列的第 N 张。
 */
export const KITTY_SERIES: StickerName[] = [
  "kitty_heart",
  "kitty_hug",
  "kitty_laptop",
  "kitty_bubble_tea",
  "kitty_nap",
  "kitty_costume",
  "kitty_umbrella",
  "kitty_pancake",
  "kitty_pillow",
];

export const LINABELL_SERIES: StickerName[] = [
  "linabell_wave",
  "linabell_cuddle",
  "linabell_detective",
  "linabell_nap",
  "linabell_butterfly",
  "linabell_tea_party",
  "linabell_kiss",
  "linabell_trip",
];

export const STARRY_SERIES: StickerName[] = [
  "starry_stargazing",
  "starry_hug",
  "starry_sleep",
  "starry_star",
  "starry_box",
  "starry_ride",
  "starry_sunset",
  "starry_wish",
  "starry_cheer",
];

/** 全部联动系列，解锁规则按这个列表生成 */
export const LINK_SERIES: StickerName[][] = [
  KITTY_SERIES,
  LINABELL_SERIES,
  STARRY_SERIES,
];

/** 收集册的展示顺序（先康复成长路线，再接日常表情包，最后是联动系列） */
export const STICKER_CATALOG_ORDER: StickerName[] = [
  "you_are_the_best",
  "cheer_cheer",
  "wipe_sweat",
  "with_you",
  "pat_pat",
  "take_it_slow",
  "drink_water",
  "shine_today",
  "rest_well",
  "get_better",
  "take_medicine",
  "eat_well",
  "sleep_well",
  "recover_together",
  "super_brave",
  "better_today",
  ...DAILY_STICKERS,
  ...KITTY_SERIES,
  ...LINABELL_SERIES,
  ...STARRY_SERIES,
];

export const STICKER_CATALOG: Record<StickerName, StickerCatalogEntry> = {
  you_are_the_best: { label: "你是最棒的", how: "开箱即用" },
  cheer_cheer: { label: "加油加油", how: "开箱即用" },
  wipe_sweat: { label: "擦擦汗", how: "开箱即用" },
  with_you: { label: "陪着你", how: "开箱即用" },
  pat_pat: { label: "摸摸头", how: "完成第一次康复打卡" },
  take_it_slow: { label: "慢慢来", how: "第一次保存今天的心情" },
  drink_water: { label: "多喝水", how: "完成第一次每日状态打卡" },
  shine_today: { label: "今日闪耀", how: "第一次完成当天全部康复任务" },
  rest_well: { label: "好好休息", how: "累计 3 天完成全部任务" },
  get_better: { label: "会好起来的", how: "到达术后第 7 天" },
  take_medicine: { label: "记得吃药", how: "连续打卡 7 天" },
  eat_well: { label: "好好吃饭", how: "连续打卡 14 天" },
  sleep_well: { label: "好好睡觉", how: "连续记录心情 7 天" },
  recover_together: { label: "一起康复", how: "到达术后第 30 天" },
  super_brave: { label: "超级勇敢", how: "到达术后第 60 天" },
  better_today: { label: "今天更好了", how: "到达术后第 90 天" },
  big_hug: { label: "抱紧你", how: "开箱即用" },
  peace_yeah: { label: "比个耶", how: "开箱即用" },
  good_night: { label: "晚安", how: "开箱即用" },
  so_happy: { label: "好开心", how: "开箱即用" },
  kitty_kiss: { label: "亲亲你", how: "开箱即用" },
  super_cool: { label: "超酷", how: "开箱即用" },
  wow_surprised: { label: "哇哦", how: "开箱即用" },
  so_good: { label: "真乖", how: "开箱即用" },
  together_you: { label: "和你在一起", how: "开箱即用" },
  good_morning: { label: "早安呀", how: "开箱即用" },
  what_cry: { label: "啥啊啊", how: "开箱即用" },
  huh_really: { label: "哈？", how: "开箱即用" },
  remind_you: { label: "提醒你哦", how: "开箱即用" },
  so_sleepy: { label: "好困哦", how: "开箱即用" },
  amazed: { label: "哇", how: "开箱即用" },
  passed_it: { label: "通过啦", how: "开箱即用" },
  not_bad: { label: "不错耶", how: "开箱即用" },
  bless_choo: { label: "喂你，阿嚏", how: "开箱即用" },
  angry_pout: { label: "生气啦", how: "开箱即用" },
  huh_confused: { label: "哈？？？", how: "开箱即用" },
  night_cuddle: { label: "晚安啦", how: "开箱即用" },
  too_cute: { label: "可爱爆了", how: "开箱即用" },
  cool_enough: { label: "我够酷了吗", how: "开箱即用" },
  // Hello Kitty x 布偶猫
  kitty_heart: { label: "一起捧爱心", how: "术后第 1 天解锁 · Hello Kitty 联动" },
  kitty_hug: { label: "凯蒂抱抱", how: "术后第 2 天解锁 · Hello Kitty 联动" },
  kitty_laptop: { label: "一起上网", how: "术后第 3 天解锁 · Hello Kitty 联动" },
  kitty_bubble_tea: { label: "一起喝奶茶", how: "术后第 4 天解锁 · Hello Kitty 联动" },
  kitty_nap: { label: "一起打盹", how: "术后第 5 天解锁 · Hello Kitty 联动" },
  kitty_costume: { label: "穿上萌睡衣", how: "术后第 6 天解锁 · Hello Kitty 联动" },
  kitty_umbrella: { label: "共撑一把伞", how: "术后第 7 天解锁 · Hello Kitty 联动" },
  kitty_pancake: { label: "松饼时间", how: "术后第 8 天解锁 · Hello Kitty 联动" },
  kitty_pillow: { label: "趴在枕头上", how: "术后第 9 天解锁 · Hello Kitty 联动" },
  // 玲娜贝儿 x 布偶猫
  linabell_wave: { label: "挥手打招呼", how: "术后第 1 天解锁 · 玲娜贝儿联动" },
  linabell_cuddle: { label: "贴贴抱抱", how: "术后第 2 天解锁 · 玲娜贝儿联动" },
  linabell_detective: { label: "小侦探出动", how: "术后第 3 天解锁 · 玲娜贝儿联动" },
  linabell_nap: { label: "云朵上打盹", how: "术后第 4 天解锁 · 玲娜贝儿联动" },
  linabell_butterfly: { label: "看蝴蝶", how: "术后第 5 天解锁 · 玲娜贝儿联动" },
  linabell_tea_party: { label: "蛋糕下午茶", how: "术后第 6 天解锁 · 玲娜贝儿联动" },
  linabell_kiss: { label: "飞吻给你", how: "术后第 7 天解锁 · 玲娜贝儿联动" },
  linabell_trip: { label: "出发去城堡", how: "术后第 8 天解锁 · 玲娜贝儿联动" },
  // 星星人 x 布偶猫
  starry_stargazing: { label: "一起看星星", how: "术后第 1 天解锁 · 星星人联动" },
  starry_hug: { label: "抱住你", how: "术后第 2 天解锁 · 星星人联动" },
  starry_sleep: { label: "睡觉觉", how: "术后第 3 天解锁 · 星星人联动" },
  starry_star: { label: "送你一颗星", how: "术后第 4 天解锁 · 星星人联动" },
  starry_box: { label: "纸箱里探头", how: "术后第 5 天解锁 · 星星人联动" },
  starry_ride: { label: "骑上猫猫", how: "术后第 6 天解锁 · 星星人联动" },
  starry_sunset: { label: "一起看日落", how: "术后第 7 天解锁 · 星星人联动" },
  starry_wish: { label: "捧着星星许愿", how: "术后第 8 天解锁 · 星星人联动" },
  starry_cheer: { label: "开心举手", how: "术后第 9 天解锁 · 星星人联动" },
};

/** 初始即解锁的贴纸：4 张陪伴贴纸 + 23 张日常表情包（联动系列按术后天数逐日解锁） */
export const STARTER_STICKERS: StickerName[] = [
  "you_are_the_best",
  "cheer_cheer",
  "wipe_sweat",
  "with_you",
  ...DAILY_STICKERS,
];
