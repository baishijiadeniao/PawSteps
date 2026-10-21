import { prismaClient } from "../lib/prisma";
import { getToday } from "../lib/date";

type SeedItem = {
  phase: string;
  name: string;
  description: string;
  category: string;
  timeOfDay?: string;
  targetValue: number | null;
  targetUnit: string | null;
  targetSets: number | null;
  frequencyPerDay: number;
  order: number;
  /** 该动作特有的停止条件；不写则用统一的 STOP */
  stop?: string;
};

/**
 * 医嘱训练动作（2026-09 版）：一张卡一个动作，
 * value = 每次（每组）个数，sets = 每天几组，全天分散完成、不必一次做完。
 * 引导浮层按名字匹配节拍（见 lib/guidedExercise.ts）。
 *   屈膝训练 20×6=120 · 侧抬腿(外) 15×3=45 · 侧抬腿(内) 15×3=45
 *   小燕飞 10×4=40 · 直腿抬高 5×4=20 · 踝泵 30×5=150 · 股内侧肌末端伸直 10×3=30
 */
const TRAINING_EXERCISES = [
  {
    base: "屈膝训练",
    value: 20,
    sets: 6,
    detail: "弯腿：屈膝到医生规定的角度，保持10秒后缓慢伸直",
    stop: "按医生/康复师规定的屈膝角度进行，不为了追角度强行压腿；出现明显疼痛、髌骨不稳或异常弹响应停止并咨询康复师",
  },
  {
    base: "侧抬腿（外侧）",
    value: 15,
    sets: 3,
    detail: "侧卧，肩·髋·膝·外踝一条直线，抬起保持10秒，腿不向前伸",
    stop: "臀中肌发力，身体不向后翻、骨盆不旋转代偿",
  },
  {
    base: "侧抬腿（内侧）",
    value: 15,
    sets: 3,
    detail: "好腿在下垫支撑物，患侧腿抬起保持10秒，腿不向前伸",
    stop: "以髋部肌群发力，避免骨盆旋转和躯干代偿",
  },
  {
    base: "小燕飞",
    value: 10,
    sets: 4,
    detail: "俯卧，幅度不宜过大，保持腰背平稳5秒",
    stop: "不憋气、不过度塌腰；腰部明显疼痛应停止训练",
  },
  {
    base: "直腿抬高",
    value: 5,
    sets: 4,
    detail: "好腿屈曲，患腿伸直缓慢抬高30°~45°，保持10秒后缓慢放下",
    stop: "有人辅助保护患侧脚跟；无法保持膝伸直就减小抬高幅度，继续加强股四头肌控制",
  },
  {
    base: "踝泵",
    value: 30,
    sets: 5,
    detail: "腿抬高接近心脏，脚尖勾起5秒 → 向下伸直5秒，算1次",
    stop: "小腿明显疼痛或肿胀加重时停止并联系医生",
  },
  {
    base: "股内侧肌末端伸直",
    value: 10,
    sets: 3,
    detail: "膝下垫圆轴/毛巾卷，髌骨朝上、脚尖勾起，收紧大腿前侧伸直保持5秒",
    stop: "配合小贴片低频电刺激，重点感受股内侧肌参与发力",
  },
];

/**
 * 生成某阶段的 7 条训练计划项（order 1~7，护理条目从 order 8 起）。
 * 开一次引导浮层算练完一组。
 */
function trainingItems(phase: string): SeedItem[] {
  return TRAINING_EXERCISES.map((act, i) => ({
    phase,
    name: act.base,
    description: act.detail,
    category: "exercise",
    targetValue: act.value,
    targetUnit: "次",
    targetSets: act.sets,
    frequencyPerDay: 1,
    order: i + 1,
    stop: act.stop,
  }));
}

async function main() {
  console.log("Seeding...");

  // 康复动作（DEMO ONLY - 以医生确认方案为准）
  const PREREQ = "以医生确认方案为准";
  const STOP = "如出现异常情况，停止并咨询专业人员";
  const NOTES = "DEMO ONLY";
  const WEEK1_PREREQ =
    "屈膝角度、负重、支具角度等以手术医生和康复治疗师的要求为准";

  const items: SeedItem[] = [
    // WEEK_1（术后第 1 周，POD 0~6）：7 个训练动作 + 冰敷（每天 4 次）
    ...trainingItems("WEEK_1"),
    {
      phase: "WEEK_1",
      name: "冰敷",
      description: "每次隔毛巾敷15～20分钟，一天共 4 次；冰袋不直接接触皮肤",
      category: "care",
      targetValue: 4,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 8,
    },
    // PRE_OP
    {
      phase: "PRE_OP",
      name: "术前心理准备",
      description: "了解手术流程，减少焦虑",
      category: "care",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 1,
    },
    {
      phase: "PRE_OP",
      name: "踝泵运动",
      description: "踝关节屈伸促循环防血栓",
      category: "exercise",
      targetValue: 50,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 2,
    },
    {
      phase: "PRE_OP",
      name: "股四头肌等长收缩",
      description: "维持大腿前侧肌力",
      category: "exercise",
      targetValue: 20,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 3,
    },
    // EARLY：同样是 7 个训练动作，只额外保留冰敷
    ...trainingItems("EARLY"),
    {
      phase: "EARLY",
      name: "冰敷",
      description: "每次隔毛巾敷15～20分钟，一天共 4 次；冰袋不直接接触皮肤",
      category: "care",
      targetValue: 4,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 8,
    },
    // MID / LATE：已无疤痕护理条目，只有 7 个训练动作
    ...trainingItems("MID"),
    // LATE
    ...trainingItems("LATE"),
  ];

  // 先清理不属于当前医嘱的旧 seed 条目；用户手动新增的条目（cuid id）不受影响，
  // 历史 RehabLog 带有 exerciseName / target 快照，也不会丢失。
  const seedIds = items.map((it) => `seed-${it.phase}-${it.order}`);
  await prismaClient.rehabPlanItem.deleteMany({
    where: { id: { startsWith: "seed-" }, NOT: { id: { in: seedIds } } },
  });

  for (const it of items) {
    const { phase, name, description, category, timeOfDay, targetValue, targetUnit, targetSets, frequencyPerDay, order, stop } = it;
    const data = {
      phase,
      name,
      description,
      category,
      // 训练卡不绑定时段（全天分散完成）；显式置 null 覆盖旧 seed 遗留的时段
      timeOfDay: timeOfDay ?? null,
      targetValue,
      targetUnit,
      targetSets,
      frequencyPerDay,
      order,
      prerequisites: phase === "WEEK_1" ? WEEK1_PREREQ : PREREQ,
      stopConditions: stop ?? STOP,
      notes: NOTES,
    };
    await prismaClient.rehabPlanItem.upsert({
      where: { id: `seed-${phase}-${order}` },
      // 医嘱调整时需要让已存在的 seed 条目同步为最新数值
      update: data,
      create: { ...data, id: `seed-${phase}-${order}` },
    });
  }

  // TimelineEvent: 手术日
  await prismaClient.timelineEvent.upsert({
    where: { id: "seed-surgery" },
    update: {},
    create: {
      id: "seed-surgery",
      date: process.env.SURGERY_DATE || "2026-09-16",
      type: "SURGERY",
      title: "🏥 手术日",
      description: "髌骨脱位手术",
    },
  });

  // 几条示例留言（检查是否已存在，避免重复）
  const existingMessages = await prismaClient.message.count();
  if (existingMessages === 0) {
    await prismaClient.message.createMany({
      data: [
        {
          name: "小明",
          content: "十一加油！手术后慢慢来，我们都在。",
          emoji: "❤️",
        },
        {
          name: "小红",
          content: "早日康复，小猫咪等你回家撸～",
          emoji: "🐱",
        },
      ],
    });
  }

  // AppSetting 默认
  await prismaClient.appSetting.upsert({
    where: { key: "publicMood" },
    update: {},
    create: { key: "publicMood", value: "true" },
  });

  console.log("Seed done at", getToday());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
