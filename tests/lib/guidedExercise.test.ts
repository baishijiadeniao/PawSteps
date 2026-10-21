import { describe, it, expect } from "vitest";
import {
  DEFAULT_GUIDE,
  READY_CUE,
  READY_HINT,
  READY_MS,
  deriveGuideState,
  getGuideFor,
} from "@/lib/guidedExercise";

describe("getGuideFor 按动作匹配节拍", () => {
  it("踝泵：勾脚 5 秒 → 伸直 5 秒", () => {
    const guide = getGuideFor("踝泵");
    expect(guide.readyMs).toBe(READY_MS);
    expect(guide.phases.map((p) => [p.cue, p.ms])).toEqual([
      ["勾脚", 5000],
      ["伸直", 5000],
    ]);
  });

  it("屈膝训练：屈膝保持 10 秒 → 伸直 5 秒，计数点标在屈膝末尾", () => {
    const guide = getGuideFor("屈膝训练");
    expect(guide.readyMs).toBe(READY_MS);
    expect(guide.phases.map((p) => [p.cue, p.ms])).toEqual([
      ["屈膝", 10000],
      ["伸直", 5000],
    ]);
    expect(guide.phases.map((p) => p.emph)).toEqual([true, false]);
    expect(guide.phases.map((p) => p.counts ?? false)).toEqual([true, false]);
  });

  it("股内侧肌末端伸直：伸直 5 秒（计次）→ 放松 5 秒", () => {
    const guide = getGuideFor("股内侧肌末端伸直");
    expect(guide.phases.map((p) => [p.cue, p.ms, p.counts ?? false])).toEqual([
      ["伸直", 5000, true],
      ["放松", 5000, false],
    ]);
  });

  it("侧抬腿（内侧/外侧）：抬起保持 10 秒（计次）→ 放下 5 秒", () => {
    for (const name of ["侧抬腿（内侧）", "侧抬腿（外侧）"]) {
      const guide = getGuideFor(name);
      expect(guide.phases.map((p) => [p.cue, p.ms, p.counts ?? false])).toEqual([
        ["抬起", 10000, true],
        ["放下", 5000, false],
      ]);
    }
    // 内侧节拍要领提到"好腿在下垫高"，外侧强调臀中肌
    expect(getGuideFor("侧抬腿（内侧）").phases[0].hint).toContain("好腿");
    expect(getGuideFor("侧抬腿（外侧）").phases[1].hint).toContain("臀中肌");
  });

  it("小燕飞：抬起 5 秒（计次）→ 放下 5 秒", () => {
    const guide = getGuideFor("小燕飞");
    expect(guide.phases.map((p) => [p.cue, p.ms, p.counts ?? false])).toEqual([
      ["抬起", 5000, true],
      ["放下", 5000, false],
    ]);
  });

  it("直腿抬高：抬高保持 10 秒（计次）→ 放下 5 秒，要领含 30°～45°", () => {
    const guide = getGuideFor("直腿抬高");
    expect(guide.phases.map((p) => [p.cue, p.ms, p.counts ?? false])).toEqual([
      ["抬高", 10000, true],
      ["放下", 5000, false],
    ]);
    expect(guide.phases[0].hint).toContain("30°～45°");
  });

  it("股四头肌：收紧 5 秒 → 放松 5 秒", () => {
    const guide = getGuideFor("股四头肌等长收缩");
    expect(guide.phases.map((p) => p.cue)).toEqual(["收紧", "放松"]);
    expect(guide.phases.every((p) => p.ms === 5000)).toBe(true);
  });

  it("更具体的名字优先命中：内侧侧抬腿、股内侧肌不被泛化规则抢走", () => {
    expect(getGuideFor("侧抬腿（内侧）").phases[0].hint).toContain("好腿");
    expect(getGuideFor("股内侧肌末端伸直").phases[0].cue).toBe("伸直");
    expect(getGuideFor("弯腿训练").phases[0].cue).toBe("屈膝");
    expect(getGuideFor("足跟滑动").phases[0].cue).toBe("屈膝");
  });

  it("匹配不到时退回默认节拍：用力 5 秒 → 放松 5 秒", () => {
    expect(getGuideFor("未知的新动作")).toBe(DEFAULT_GUIDE);
    expect(DEFAULT_GUIDE.readyMs).toBe(READY_MS);
    expect(DEFAULT_GUIDE.phases.map((p) => p.cue)).toEqual(["用力", "放松"]);
  });
});

describe("deriveGuideState 引导训练节拍", () => {
  const guide = getGuideFor("踝泵"); // 准备 5s + 勾脚 5s + 伸直 5s，一轮 10s

  it("起点处于准备倒计时，还没开始计数", () => {
    expect(deriveGuideState(0, guide)).toEqual({
      ready: true,
      cue: READY_CUE,
      hint: READY_HINT,
      emph: true,
      remainingMs: 5000,
      reps: 0,
    });
  });

  it("准备倒计时中段：剩余时间递减", () => {
    const s = deriveGuideState(3000, guide);
    expect(s.ready).toBe(true);
    expect(s.remainingMs).toBe(2000);
    expect(s.reps).toBe(0);
  });

  it("准备结束瞬间进入第一个口令，仍是 0 次", () => {
    const s = deriveGuideState(5000, guide);
    expect(s.ready).toBe(false);
    expect(s.cue).toBe("勾脚");
    expect(s.emph).toBe(true);
    expect(s.remainingMs).toBe(5000);
    expect(s.reps).toBe(0);
  });

  it("第一个口令结束切换到第二个口令，颜色变松", () => {
    const s = deriveGuideState(10000, guide);
    expect(s.ready).toBe(false);
    expect(s.cue).toBe("伸直");
    expect(s.emph).toBe(false);
    expect(s.remainingMs).toBe(5000);
    expect(s.reps).toBe(0);
  });

  it("走完一整个循环计数 +1", () => {
    const s = deriveGuideState(15000, guide);
    expect(s.cue).toBe("勾脚");
    expect(s.reps).toBe(1);
    expect(s.remainingMs).toBe(5000);
  });

  it("多轮循环累计次数正确", () => {
    // 一轮 = 10s；25s = 准备 5s + 2 整轮 → 第 3 轮刚开始
    expect(deriveGuideState(25000, guide)).toMatchObject({
      cue: "勾脚",
      reps: 2,
      remainingMs: 5000,
    });
    // 21s = 准备 5s + 1 整轮 + 11s → 第 2 轮"伸直"口令还剩 4 秒
    expect(deriveGuideState(21000, guide)).toMatchObject({
      cue: "伸直",
      reps: 1,
      remainingMs: 4000,
    });
  });

  it("屈膝训练一个循环 15 秒：保持满 10 秒即计次，伸直只是间歇", () => {
    const bend = getGuideFor("屈膝训练");
    expect(deriveGuideState(5000, bend)).toMatchObject({
      cue: "屈膝",
      reps: 0,
      remainingMs: 10000,
    });
    // 屈膝还差 1 毫秒才算保持满，次数仍是 0
    expect(deriveGuideState(14999, bend)).toMatchObject({
      cue: "屈膝",
      reps: 0,
      remainingMs: 1,
    });
    // 保持满 10 秒 → 进入缓慢伸直，此时已计满 1 次
    expect(deriveGuideState(15000, bend)).toMatchObject({
      cue: "伸直",
      emph: false,
      reps: 1,
      remainingMs: 5000,
    });
    // 伸直期间提前结束也不会丢掉刚做完的那一次
    expect(deriveGuideState(18000, bend)).toMatchObject({ cue: "伸直", reps: 1 });
    // 准备 5s + 一整轮 15s → 第二次屈膝，次数停在 1
    expect(deriveGuideState(20000, bend)).toMatchObject({
      cue: "屈膝",
      reps: 1,
      remainingMs: 10000,
    });
    // 第二轮屈膝保持满（5s + 15s + 10s）→ 累计 2 次
    expect(deriveGuideState(30000, bend)).toMatchObject({
      cue: "伸直",
      reps: 2,
      remainingMs: 5000,
    });
  });

  it("未标计数点的动作仍要走完整个循环才计次", () => {
    // 踝泵：准备 5s + 一轮 10s，第 10 秒起进入"伸直"，此时不该提前计次
    expect(deriveGuideState(10000, guide)).toMatchObject({ cue: "伸直", reps: 0 });
    expect(deriveGuideState(15000, guide)).toMatchObject({ cue: "勾脚", reps: 1 });
  });

  it("自定义节拍：三段各 1 秒也能按顺序播放", () => {
    const custom = {
      readyMs: 1000,
      phases: [
        { cue: "一", hint: "", ms: 1000, emph: true },
        { cue: "二", hint: "", ms: 2000, emph: false },
        { cue: "三", hint: "", ms: 1000, emph: false },
      ],
    };
    expect(deriveGuideState(1000, custom).cue).toBe("一");
    expect(deriveGuideState(2500, custom).cue).toBe("二");
    expect(deriveGuideState(4500, custom).cue).toBe("三");
    expect(deriveGuideState(5000, custom)).toMatchObject({ cue: "一", reps: 1 });
  });

  it("无准备倒计时时直接进入口令", () => {
    const noReady = { readyMs: 0, phases: [{ cue: "抬", hint: "", ms: 2000, emph: true }] };
    const s = deriveGuideState(0, noReady);
    expect(s.ready).toBe(false);
    expect(s.cue).toBe("抬");
    expect(s.remainingMs).toBe(2000);
  });

  it("负数时间按 0 处理", () => {
    expect(deriveGuideState(-1000, guide).reps).toBe(0);
    expect(deriveGuideState(-1000, guide).ready).toBe(true);
  });
});
