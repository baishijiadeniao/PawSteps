import { prismaClient } from "../lib/prisma";
import { getToday } from "../lib/date";

async function main() {
  console.log("Seeding...");

  // 康复动作（DEMO ONLY - 以医生确认方案为准）
  const PREREQ = "以医生确认方案为准";
  const STOP = "如出现异常情况，停止并咨询专业人员";
  const NOTES = "DEMO ONLY";

  const items: Array<{
    phase: string;
    name: string;
    description: string;
    category: string;
    targetValue: number | null;
    targetUnit: string | null;
    targetSets: number | null;
    frequencyPerDay: number;
    order: number;
  }> = [
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
    {
      phase: "PRE_OP",
      name: "患肢抬高",
      description: "高于心脏减轻肿胀",
      category: "care",
      targetValue: 15,
      targetUnit: "分钟",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 4,
    },
    // EARLY
    {
      phase: "EARLY",
      name: "踝泵运动",
      description: "防血栓消肿胀",
      category: "exercise",
      targetValue: 100,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 1,
    },
    {
      phase: "EARLY",
      name: "股四头肌等长收缩",
      description: "维持肌力",
      category: "exercise",
      targetValue: 30,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 2,
    },
    {
      phase: "EARLY",
      name: "腘绳肌等长收缩",
      description: "后侧肌群维持",
      category: "exercise",
      targetValue: 20,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 3,
    },
    {
      phase: "EARLY",
      name: "直腿抬高 SLR",
      description: "不负重练肌力",
      category: "exercise",
      targetValue: 15,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 4,
    },
    {
      phase: "EARLY",
      name: "冰敷",
      description: "15-20 分钟消肿",
      category: "care",
      targetValue: 3,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 5,
    },
    {
      phase: "EARLY",
      name: "患肢抬高",
      description: "高于心脏",
      category: "care",
      targetValue: 4,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 6,
    },
    {
      phase: "EARLY",
      name: "疤痕护理 - 硅酮凝胶",
      description: "伤口愈合后开始涂抹",
      category: "scar",
      targetValue: 2,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 7,
    },
    {
      phase: "EARLY",
      name: "疤痕护理 - 减张胶带",
      description: "减小张力防疤痕增生",
      category: "scar",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 8,
    },
    // MID
    {
      phase: "MID",
      name: "屈膝活动度训练",
      description: "坐位/卧位屈膝，90° 起渐进",
      category: "exercise",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 1,
    },
    {
      phase: "MID",
      name: "主动直腿抬高",
      description: "强化股四头肌",
      category: "exercise",
      targetValue: 20,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 2,
    },
    {
      phase: "MID",
      name: "侧抬腿",
      description: "臀中肌训练",
      category: "exercise",
      targetValue: 15,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 3,
    },
    {
      phase: "MID",
      name: "靠墙静蹲",
      description: "渐进负重",
      category: "exercise",
      targetValue: 30,
      targetUnit: "秒",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 4,
    },
    {
      phase: "MID",
      name: "单脚站立平衡",
      description: "本体感觉训练",
      category: "exercise",
      targetValue: 30,
      targetUnit: "秒",
      targetSets: 2,
      frequencyPerDay: 1,
      order: 5,
    },
    {
      phase: "MID",
      name: "疤痕按摩",
      description: "促进疤痕软化",
      category: "scar",
      targetValue: 5,
      targetUnit: "分钟",
      targetSets: 2,
      frequencyPerDay: 1,
      order: 6,
    },
    {
      phase: "MID",
      name: "持续减张护理",
      description: "全天胶带或减张器",
      category: "scar",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 7,
    },
    // LATE
    {
      phase: "LATE",
      name: "全屈膝训练",
      description: "跪坐等至正常范围",
      category: "exercise",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 1,
    },
    {
      phase: "LATE",
      name: "弓步训练",
      description: "功能性训练",
      category: "exercise",
      targetValue: 10,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 2,
    },
    {
      phase: "LATE",
      name: "上下台阶",
      description: "日常生活功能",
      category: "exercise",
      targetValue: 15,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 3,
    },
    {
      phase: "LATE",
      name: "坐姿伸膝（无重量）",
      description: "坐椅子缓慢伸直膝盖",
      category: "exercise",
      targetValue: 15,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 4,
    },
    {
      phase: "LATE",
      name: "卧位屈膝滑动",
      description: "床上滑动屈膝改善活动度",
      category: "exercise",
      targetValue: 15,
      targetUnit: "次",
      targetSets: 3,
      frequencyPerDay: 1,
      order: 5,
    },
    {
      phase: "LATE",
      name: "平衡板训练",
      description: "进阶本体感觉",
      category: "exercise",
      targetValue: 5,
      targetUnit: "分钟",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 6,
    },
    {
      phase: "LATE",
      name: "疤痕修复评估",
      description: "每周观察恢复情况",
      category: "scar",
      targetValue: 1,
      targetUnit: "次",
      targetSets: 1,
      frequencyPerDay: 1,
      order: 7,
    },
  ];

  for (const it of items) {
    await prismaClient.rehabPlanItem.upsert({
      where: { id: `seed-${it.phase}-${it.order}` },
      update: {},
      create: {
        ...it,
        id: `seed-${it.phase}-${it.order}`,
        prerequisites: PREREQ,
        stopConditions: STOP,
        notes: NOTES,
      },
    });
  }

  // TimelineEvent: 手术日
  await prismaClient.timelineEvent.upsert({
    where: { id: "seed-surgery" },
    update: {},
    create: {
      id: "seed-surgery",
      date: "2026-09-09",
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
