/**
 * 引导式训练的节拍逻辑：纯函数状态推导，方便单测与复用。
 *
 * 一次训练的时间线固定为：
 *   准备倒计时（默认 5 秒）→ 循环[阶段一 → 阶段二 …]，走完一整个循环算 1 次。
 * 每个动作有自己的口令、动作要领和时长（见 GUIDE_MATCHERS），
 * 命名匹配不到时用 DEFAULT_GUIDE，保证任何动作都有节奏可跟。
 */

export interface GuidePhase {
  /** 大字口令，如"勾脚尖" */
  cue: string;
  /** 一句话动作要领 */
  hint: string;
  /** 该阶段保持时长（毫秒） */
  ms: number;
  /** 是否用力阶段（true 用珊瑚色强调，false 用薄荷绿表示松开） */
  emph: boolean;
  /**
   * 计数点：本阶段结束时算走完 1 次。
   * 用于"循环末尾还有一段组间放松"的动作（如屈膝训练保持满之后的缓慢伸直），
   * 保证动作做完立即计数，休息中提前结束也不会丢掉这一次。
   * 整张节拍表都不标记时，默认走完整个循环才算 1 次。
   */
  counts?: boolean;
}

export interface ExerciseGuide {
  /** 开始循环前的准备倒计时时长（毫秒），0 表示不展示准备阶段 */
  readyMs: number;
  /** 一个循环按顺序播放的阶段，至少 1 个 */
  phases: GuidePhase[];
}

/** 准备阶段的统一口令 */
export const READY_CUE = "准备";
export const READY_HINT = "摆好姿势，放松呼吸，马上开始";

/** 所有动作共用的准备倒计时：5 秒 */
export const READY_MS = 5000;

/**
 * 按动作名匹配的节拍表。顺序即优先级，取第一条命中的规则，
 * 所以"侧抬腿（内侧）""股内侧肌末端伸直"这类更具体的名字必须排在
 * "侧抬腿""直腿抬高""屈膝|滑动"之前。
 */
const GUIDE_MATCHERS: Array<{ test: RegExp; guide: ExerciseGuide }> = [
  {
    // 当前医嘱：勾脚 5 秒 → 伸直 5 秒，一个周期 10 秒
    test: /踝泵/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "勾脚",
          hint: "腿抬到接近心脏高，脚尖向身体方向勾起到底，保持 5 秒",
          ms: 5000,
          emph: true,
        },
        {
          cue: "伸直",
          hint: "脚尖向下伸、脚踝拉直，缓慢完成，保持 5 秒",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    // 当前医嘱：膝下垫圆轴/毛巾卷，收紧大腿把小腿伸直并保持 5 秒
    test: /股内侧肌|末端伸直/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "伸直",
          hint: "髌骨朝上、脚尖勾起，收紧大腿前侧把小腿压直，保持 5 秒",
          ms: 5000,
          emph: true,
          counts: true,
        },
        {
          cue: "放松",
          hint: "慢慢松开大腿，让小腿落回垫上的位置",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    test: /侧抬腿.*内侧/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "抬起",
          hint: "好腿在下垫高，患侧腿向侧上方抬起保持 10 秒，腿不要向前伸",
          ms: 10000,
          emph: true,
          counts: true,
        },
        {
          cue: "放下",
          hint: "缓慢回到床面，用髋部发力，不转骨盆、不借腰上的力",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    test: /侧抬腿/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "抬起",
          hint: "侧卧，肩·髋·膝·外踝一条直线，向侧上方抬起保持 10 秒",
          ms: 10000,
          emph: true,
          counts: true,
        },
        {
          cue: "放下",
          hint: "缓慢放回床面，身体不向后翻、骨盆不旋转，感受臀中肌发力",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    test: /小燕飞|燕飞/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "抬起",
          hint: "俯卧，头和上身微微抬离床面，幅度不要大，保持 5 秒不憋气",
          ms: 5000,
          emph: true,
          counts: true,
        },
        {
          cue: "放下",
          hint: "缓慢回落，腰背保持平稳，不要过度塌腰",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    // 当前医嘱：患腿抬到约 30°～45°，保持 10 秒后缓慢放下
    test: /直腿抬高/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "抬高",
          hint: "好腿屈膝踩床，患腿膝盖锁直，缓慢抬到约 30°～45° 保持 10 秒",
          ms: 10000,
          emph: true,
          counts: true,
        },
        {
          cue: "放下",
          hint: "慢慢放回床面，全程不弯膝、不突然落下",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    // 当前医嘱的"弯腿/屈膝训练"：屈膝保持 10 秒，膝盖保持不住时不要硬压
    test: /屈膝|弯腿|足跟滑动|滑动/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "屈膝",
          hint: "脚跟缓慢收向臀部，到医生规定的角度停住，保持 10 秒不压腿",
          ms: 10000,
          emph: true,
          counts: true,
        },
        {
          cue: "伸直",
          hint: "再花几秒把腿缓慢伸直，全程不硬压、不追求更大角度",
          ms: 5000,
          emph: false,
        },
      ],
    },
  },
  {
    test: /股四头肌/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "收紧",
          hint: "大腿前侧用力绷紧，膝盖向下压平贴床",
          ms: 5000,
          emph: true,
        },
        { cue: "放松", hint: "完全松开，让大腿回到柔软状态", ms: 5000, emph: false },
      ],
    },
  },
  {
    test: /腘绳肌/,
    guide: {
      readyMs: READY_MS,
      phases: [
        {
          cue: "下压",
          hint: "脚跟往臀部方向轻压，大腿后侧绷紧",
          ms: 5000,
          emph: true,
        },
        { cue: "放松", hint: "松开腿，回到完全放松的状态", ms: 5000, emph: false },
      ],
    },
  },
  {
    test: /靠墙静蹲/,
    guide: {
      readyMs: READY_MS,
      phases: [
        { cue: "下蹲", hint: "背靠墙缓慢下滑，膝盖不超过脚尖", ms: 5000, emph: true },
        { cue: "站起", hint: "慢慢蹬地回到站立，放松一下", ms: 5000, emph: false },
      ],
    },
  },
  {
    test: /坐姿伸膝/,
    guide: {
      readyMs: READY_MS,
      phases: [
        { cue: "伸直", hint: "小腿缓慢抬起直到膝盖完全伸直", ms: 5000, emph: true },
        { cue: "收回", hint: "控制速度放下来，不要自由落体", ms: 5000, emph: false },
      ],
    },
  },
  {
    test: /弓步/,
    guide: {
      readyMs: READY_MS,
      phases: [
        { cue: "下蹲", hint: "重心垂直下沉，后膝接近地面", ms: 5000, emph: true },
        { cue: "站起", hint: "前腿蹬地把身体推回原位", ms: 5000, emph: false },
      ],
    },
  },
  {
    test: /台阶/,
    guide: {
      readyMs: READY_MS,
      phases: [
        { cue: "踏上", hint: "整只脚踩上台阶，患腿用力蹬起", ms: 5000, emph: true },
        { cue: "踏下", hint: "控制速度后退下台阶", ms: 5000, emph: false },
      ],
    },
  },
];

/** 匹配不到动作时的兜底节拍：用力 5 秒 → 放松 5 秒 */
export const DEFAULT_GUIDE: ExerciseGuide = {
  readyMs: READY_MS,
  phases: [
    { cue: "用力", hint: "按动作要领缓慢发力，保持住", ms: 5000, emph: true },
    { cue: "放松", hint: "完全松开，回到自然状态", ms: 5000, emph: false },
  ],
};

/** 由动作名取出对应的节拍配置 */
export function getGuideFor(name: string): ExerciseGuide {
  return GUIDE_MATCHERS.find((m) => m.test.test(name))?.guide ?? DEFAULT_GUIDE;
}

export interface GuideState {
  /** 是否还在开始前的准备倒计时阶段 */
  ready: boolean;
  /** 当前口令大字 */
  cue: string;
  /** 当前动作要领 */
  hint: string;
  /** 当前阶段是否用力（决定配色） */
  emph: boolean;
  /** 当前阶段剩余毫秒（用于倒计时数字） */
  remainingMs: number;
  /** 已完成的次数（走完一整个循环算 1 次） */
  reps: number;
}

function cycleMs(guide: ExerciseGuide): number {
  return guide.phases.reduce((sum, p) => sum + p.ms, 0);
}

/**
 * 计数点在循环内的时刻：标记 counts 的阶段结束那一刻。
 * 没有任何标记时返回循环末尾，等价于"走完一整轮才算 1 次"。
 */
function countPointMs(guide: ExerciseGuide): number {
  let acc = 0;
  for (const p of guide.phases) {
    acc += p.ms;
    if (p.counts) return acc;
  }
  return acc;
}

/**
 * 由"训练开始后的累计毫秒数"推导出当前引导状态。
 * 纯函数、可暂停（暂停时停止累计 elapsed 即可），对时间抖动免疫。
 */
export function deriveGuideState(elapsedMs: number, guide: ExerciseGuide): GuideState {
  const t = Math.max(0, elapsedMs);
  const full = cycleMs(guide);

  if (t < guide.readyMs) {
    return {
      ready: true,
      cue: READY_CUE,
      hint: READY_HINT,
      emph: true,
      remainingMs: guide.readyMs - t,
      reps: 0,
    };
  }

  const active = t - guide.readyMs;
  const cycles = full === 0 ? 0 : Math.floor(active / full);
  const inCycle = full === 0 ? 0 : active - cycles * full;
  // 过了计数点，本轮就提前计满（未标记时计数点等于循环末尾，永远不会提前）
  const reps =
    full === 0 ? 0 : cycles + (inCycle >= countPointMs(guide) ? 1 : 0);

  let acc = 0;
  for (const p of guide.phases) {
    if (inCycle < acc + p.ms) {
      return {
        ready: false,
        cue: p.cue,
        hint: p.hint,
        emph: p.emph,
        remainingMs: acc + p.ms - inCycle,
        reps,
      };
    }
    acc += p.ms;
  }

  // 浮点误差兜底：刚好落在周期末尾，算作已完成一次
  const last = guide.phases[guide.phases.length - 1];
  return {
    ready: false,
    cue: last.cue,
    hint: last.hint,
    emph: last.emph,
    remainingMs: 0,
    reps: cycles + 1,
  };
}
