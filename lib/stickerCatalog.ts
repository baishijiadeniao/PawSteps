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

/** 随机奖励池贴纸的统一文案：只区分所属系列 */
const randomHow = (series: string) =>
  `每天登录或完成康复任务，随机掉落 · ${series}`;

const HOW_KITTY = randomHow("Hello Kitty 联动");
const HOW_LINABELL = randomHow("玲娜贝儿联动");
const HOW_STARRY = randomHow("星星人联动");
const HOW_MARUKO = randomHow("樱桃小丸子联动");
const HOW_STELLALOU = randomHow("星黛露联动");
const HOW_COOKIEANN = randomHow("可琦安联动");
const HOW_DUFFY = randomHow("达菲联动");
const HOW_SEASONS = randomHow("玲娜贝儿四季联动");

/**
 * picture/2 四张表情表切出的 41 张日常贴纸。
 * 不参与解锁规则，初始即为解锁状态，只按展示顺序排在成长路线之后。
 */
const DAILY_STICKERS: StickerName[] = [
  // 首批表 A（3 x 3）
  "big_hug",
  "peace_yeah",
  "good_night",
  "so_happy",
  "kitty_kiss",
  "super_cool",
  "wow_surprised",
  "so_good",
  "together_you",
  // 首批表 B（3 列 x 5 行，末行 2 格）
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
  // 新增表 C（3 x 3，布偶猫单人表情）
  "good_day_stretch",
  "thumb_up_wink",
  "grumpy_stare",
  "fish_playmate",
  "loaf_sleep",
  "oh_really",
  "shades_cool",
  "fluffy_back",
  "my_box",
  // 新增表 D（3 x 3，女孩与布偶猫）
  "baby_kiss",
  "belly_nap",
  "yeah_good_day",
  "posh_sit",
  "blanket_peek",
  "king_home",
  "sleep_hugging",
  "question_ears",
  "always_together",
];

/**
 * picture/联动 八张 3x3 联动表，每张表一个系列
 * （玲娜贝儿表的"一起来自拍"一格已剔除，不切图）。
 * 每个系列的第 1 张是保底贴纸，开箱即用；
 * 其余全部进同一个随机奖励池，每天登录或完成康复任务时随机抽一张。
 * 数组顺序只决定收集册的展示顺序，不再决定解锁顺序。
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

export const MARUKO_SERIES: StickerName[] = [
  "maruko_hug",
  "maruko_butterfly",
  "maruko_jump",
  "maruko_draw",
  "maruko_outing",
  "maruko_sleep",
  "maruko_icecream",
  "maruko_bush",
  "maruko_cake",
];

export const STELLALOU_SERIES: StickerName[] = [
  "stellalou_hug",
  "stellalou_flowerbed",
  "stellalou_tea",
  "stellalou_cuddle",
  "stellalou_tent",
  "stellalou_walk",
  "stellalou_magic",
  "stellalou_cloud",
  "stellalou_basket",
];

export const COOKIEANN_SERIES: StickerName[] = [
  "cookieann_hug",
  "cookieann_cuddle",
  "cookieann_cookie",
  "cookieann_grass",
  "cookieann_icecream",
  "cookieann_picnic",
  "cookieann_nap",
  "cookieann_photo",
  "cookieann_petal",
];

export const DUFFY_SERIES: StickerName[] = [
  "duffy_hug",
  "duffy_mat",
  "duffy_school",
  "duffy_sandcastle",
  "duffy_sleep",
  "duffy_flowers",
  "duffy_pounce",
  "duffy_sunset",
  "duffy_teacup",
];

export const LINABELL_SEASONS_SERIES: StickerName[] = [
  "linabell_sprout",
  "linabell_rain",
  "linabell_radish",
  "linabell_lotus",
  "linabell_watermelon",
  "linabell_lily",
  "linabell_maple",
  "linabell_snowball",
  "linabell_snowman",
];

/** 全部联动系列，解锁规则按这个列表生成 */
export const LINK_SERIES: StickerName[][] = [
  KITTY_SERIES,
  LINABELL_SERIES,
  STARRY_SERIES,
  MARUKO_SERIES,
  STELLALOU_SERIES,
  COOKIEANN_SERIES,
  DUFFY_SERIES,
  LINABELL_SEASONS_SERIES,
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
  ...MARUKO_SERIES,
  ...STELLALOU_SERIES,
  ...COOKIEANN_SERIES,
  ...DUFFY_SERIES,
  ...LINABELL_SEASONS_SERIES,
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
  // picture/2 新增表 C：布偶猫单人表情（满版方卡）
  good_day_stretch: { label: "美好一天", how: "开箱即用" },
  thumb_up_wink: { label: "给你点个赞", how: "开箱即用" },
  grumpy_stare: { label: "不爽盯着你", how: "开箱即用" },
  fish_playmate: { label: "我的小鱼", how: "开箱即用" },
  loaf_sleep: { label: "呼呼大睡", how: "开箱即用" },
  oh_really: { label: "啊这？", how: "开箱即用" },
  shades_cool: { label: "墨镜酷猫", how: "开箱即用" },
  fluffy_back: { label: "毛茸茸背影", how: "开箱即用" },
  my_box: { label: "纸箱是我的", how: "开箱即用" },
  // picture/2 新增表 D：女孩与布偶猫
  baby_kiss: { label: "亲爱的小宝贝", how: "开箱即用" },
  belly_nap: { label: "肚皮朝上睡", how: "开箱即用" },
  yeah_good_day: { label: "耶，美好一天", how: "开箱即用" },
  posh_sit: { label: "端庄坐好", how: "开箱即用" },
  blanket_peek: { label: "被窝里探头", how: "开箱即用" },
  king_home: { label: "家中王者", how: "开箱即用" },
  sleep_hugging: { label: "抱着你入睡", how: "开箱即用" },
  question_ears: { label: "满头问号", how: "开箱即用" },
  always_together: { label: "永远在一起", how: "开箱即用" },
  // Hello Kitty x 布偶猫
  kitty_heart: { label: "一起捧爱心", how: "开箱即用 · Hello Kitty 联动" },
  kitty_hug: { label: "凯蒂抱抱", how: HOW_KITTY },
  kitty_laptop: { label: "一起上网", how: HOW_KITTY },
  kitty_bubble_tea: { label: "一起喝奶茶", how: HOW_KITTY },
  kitty_nap: { label: "一起打盹", how: HOW_KITTY },
  kitty_costume: { label: "穿上萌睡衣", how: HOW_KITTY },
  kitty_umbrella: { label: "共撑一把伞", how: HOW_KITTY },
  kitty_pancake: { label: "松饼时间", how: HOW_KITTY },
  kitty_pillow: { label: "趴在枕头上", how: HOW_KITTY },
  // 玲娜贝儿 x 布偶猫
  linabell_wave: { label: "挥手打招呼", how: "开箱即用 · 玲娜贝儿联动" },
  linabell_cuddle: { label: "贴贴抱抱", how: HOW_LINABELL },
  linabell_detective: { label: "小侦探出动", how: HOW_LINABELL },
  linabell_nap: { label: "云朵上打盹", how: HOW_LINABELL },
  linabell_butterfly: { label: "看蝴蝶", how: HOW_LINABELL },
  linabell_tea_party: { label: "蛋糕下午茶", how: HOW_LINABELL },
  linabell_kiss: { label: "飞吻给你", how: HOW_LINABELL },
  linabell_trip: { label: "出发去城堡", how: HOW_LINABELL },
  // 星星人 x 布偶猫
  starry_stargazing: { label: "一起看星星", how: "开箱即用 · 星星人联动" },
  starry_hug: { label: "抱住你", how: HOW_STARRY },
  starry_sleep: { label: "睡觉觉", how: HOW_STARRY },
  starry_star: { label: "送你一颗星", how: HOW_STARRY },
  starry_box: { label: "纸箱里探头", how: HOW_STARRY },
  starry_ride: { label: "骑上猫猫", how: HOW_STARRY },
  starry_sunset: { label: "一起看日落", how: HOW_STARRY },
  starry_wish: { label: "捧着星星许愿", how: HOW_STARRY },
  starry_cheer: { label: "开心举手", how: HOW_STARRY },
  // 樱桃小丸子 x 布偶猫
  maruko_hug: { label: "紧紧抱抱", how: "开箱即用 · 樱桃小丸子联动" },
  maruko_butterfly: { label: "看蝴蝶", how: HOW_MARUKO },
  maruko_jump: { label: "开心跳跳", how: HOW_MARUKO },
  maruko_draw: { label: "一起画画", how: HOW_MARUKO },
  maruko_outing: { label: "背书包出门", how: HOW_MARUKO },
  maruko_sleep: { label: "午睡时间", how: HOW_MARUKO },
  maruko_icecream: { label: "分享冰淇淋", how: HOW_MARUKO },
  maruko_bush: { label: "花丛探头", how: HOW_MARUKO },
  maruko_cake: { label: "糟糕是蛋糕", how: HOW_MARUKO },
  // 星黛露 x 布偶猫
  stellalou_hug: { label: "飞扑抱抱", how: "开箱即用 · 星黛露联动" },
  stellalou_flowerbed: { label: "花丛打盹", how: HOW_STELLALOU },
  stellalou_tea: { label: "草地下午茶", how: HOW_STELLALOU },
  stellalou_cuddle: { label: "贴贴脸颊", how: HOW_STELLALOU },
  stellalou_tent: { label: "星空帐篷读书", how: HOW_STELLALOU },
  stellalou_walk: { label: "戴草帽出发", how: HOW_STELLALOU },
  stellalou_magic: { label: "魔法表演", how: HOW_STELLALOU },
  stellalou_cloud: { label: "云朵上睡觉", how: HOW_STELLALOU },
  stellalou_basket: { label: "花篮里看花", how: HOW_STELLALOU },
  // 可琦安 x 布偶猫
  cookieann_hug: { label: "脸贴脸抱抱", how: "开箱即用 · 可琦安联动" },
  cookieann_cuddle: { label: "趴趴抱抱", how: HOW_COOKIEANN },
  cookieann_cookie: { label: "分享爪印饼干", how: HOW_COOKIEANN },
  cookieann_grass: { label: "草地上晒太阳", how: HOW_COOKIEANN },
  cookieann_icecream: { label: "一起吃雪糕", how: HOW_COOKIEANN },
  cookieann_picnic: { label: "提篮去野餐", how: HOW_COOKIEANN },
  cookieann_nap: { label: "甜甜午睡", how: HOW_COOKIEANN },
  cookieann_photo: { label: "拍张合影", how: HOW_COOKIEANN },
  cookieann_petal: { label: "花瓣雨", how: HOW_COOKIEANN },
  // 达菲 x 布偶猫
  duffy_hug: { label: "贴贴抱抱", how: "开箱即用 · 达菲联动" },
  duffy_mat: { label: "条纹毯上趴趴", how: HOW_DUFFY },
  duffy_school: { label: "一起上学去", how: HOW_DUFFY },
  duffy_sandcastle: { label: "沙滩堆城堡", how: HOW_DUFFY },
  duffy_sleep: { label: "月亮被窝睡", how: HOW_DUFFY },
  duffy_flowers: { label: "送你一束花", how: HOW_DUFFY },
  duffy_pounce: { label: "惊喜大扑击", how: HOW_DUFFY },
  duffy_sunset: { label: "并肩看日落", how: HOW_DUFFY },
  duffy_teacup: { label: "茶杯里挤挤", how: HOW_DUFFY },
  // 玲娜贝儿四季 x 布偶猫
  linabell_sprout: { label: "春芽装", how: "开箱即用 · 玲娜贝儿四季联动" },
  linabell_rain: { label: "撑伞过春雨", how: HOW_SEASONS },
  linabell_radish: { label: "收获小萝卜", how: HOW_SEASONS },
  linabell_lotus: { label: "荷花裙舞", how: HOW_SEASONS },
  linabell_watermelon: { label: "清凉西瓜", how: HOW_SEASONS },
  linabell_lily: { label: "百合花语", how: HOW_SEASONS },
  linabell_maple: { label: "枫叶围巾", how: HOW_SEASONS },
  linabell_snowball: { label: "雪夜斗篷", how: HOW_SEASONS },
  linabell_snowman: { label: "一起堆雪人", how: HOW_SEASONS },
};

/**
 * 初始即解锁的贴纸：4 张陪伴贴纸 + 41 张日常表情包
 * （联动系列各系列第 1 张是保底，开箱即用；其余贴纸在随机奖励池里，
 * 靠每天登录或完成康复任务逐张抽取解锁）。
 */
export const STARTER_STICKERS: StickerName[] = [
  "you_are_the_best",
  "cheer_cheer",
  "wipe_sweat",
  "with_you",
  ...DAILY_STICKERS,
];
