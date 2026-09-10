/**
 * 贴纸图鉴目录：每张布偶猫表情包贴纸的中文名 + 解锁方式文案。
 *
 * 收集册页面用它渲染格子：
 * - 已解锁：显示彩色贴纸 + label + 解锁日期
 * - 未解锁：显示灰剪影 + "？" + how（解锁条件提示）
 */

import type { StickerName } from "./stickerPop";

export interface StickerCatalogEntry {
  /** 中文名字（收集册展示用） */
  label: string;
  /** 解锁方式文案（未解锁时展示的提示） */
  how: string;
}

/** 收集册的展示顺序（按解锁的"成长路线"排列） */
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
};

/** 初始即解锁的 4 张陪伴贴纸 */
export const STARTER_STICKERS: StickerName[] = [
  "you_are_the_best",
  "cheer_cheer",
  "wipe_sweat",
  "with_you",
];
