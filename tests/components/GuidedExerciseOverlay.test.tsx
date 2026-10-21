import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { GuidedExerciseOverlay } from "@/components/GuidedExerciseOverlay";

vi.useFakeTimers();

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

/** 踝泵运动：准备 5s → 勾脚 5s → 伸直 5s，走完一轮 10s 算 1 次 */
const READY = 5000;
const CYCLE = 10000;

function renderOverlay(
  props: Partial<React.ComponentProps<typeof GuidedExerciseOverlay>> = {}
) {
  const onFinish = vi.fn();
  render(
    <GuidedExerciseOverlay
      name="踝泵运动"
      target={50}
      baseCount={0}
      onFinish={onFinish}
      {...props}
    />
  );
  return { onFinish };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("GuidedExerciseOverlay 引导训练浮层", () => {
  it("开始训练先进入 5 秒准备倒计时", () => {
    renderOverlay();
    expect(screen.getByText("准备 ⏳")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    advance(1000);
    expect(screen.getByText("准备 ⏳")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("准备结束后进入动作口令：勾脚", () => {
    renderOverlay();
    advance(READY);
    expect(screen.getByText("勾脚 🔵")).toBeInTheDocument();
    expect(
      screen.getByText("腿抬到接近心脏高，脚尖向身体方向勾起到底，保持 5 秒")
    ).toBeInTheDocument();
  });

  it("勾脚 5 秒后切换到伸直", () => {
    renderOverlay();
    advance(READY + 5000);
    expect(screen.getByText("伸直 🟢")).toBeInTheDocument();
    expect(
      screen.getByText("脚尖向下伸、脚踝拉直，缓慢完成，保持 5 秒")
    ).toBeInTheDocument();
  });

  it("走完一整个循环自动计数 +1", () => {
    renderOverlay();
    advance(READY + CYCLE);
    expect(screen.getByText("勾脚 🔵")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "已完成 1 次" })
    ).toBeInTheDocument();
  });

  it("多轮循环持续累计", () => {
    renderOverlay();
    advance(READY + CYCLE * 4 + 1000); // 4 整轮 + 第 5 轮勾脚中
    expect(
      screen.getByRole("status", { name: "已完成 4 次" })
    ).toBeInTheDocument();
  });

  it("口令按动作定制：屈膝训练是屈膝/伸直，保持满 10 秒即计次", () => {
    renderOverlay({ name: "屈膝训练" });
    advance(READY);
    expect(screen.getByText("屈膝 🔵")).toBeInTheDocument();
    // 屈膝保持还差 1 秒，次数仍是 0
    advance(9000);
    expect(screen.getByRole("status", { name: "已完成 0 次" })).toBeInTheDocument();
    // 保持满 10 秒 → 缓慢伸直 5 秒，这一次已经记上了
    advance(1000);
    expect(screen.getByText("伸直 🟢")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "已完成 1 次" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/跟着口令做：准备 5 秒 → 屈膝 10 秒 → 伸直 5 秒/)
    ).toBeInTheDocument();
  });

  it("口令按动作定制：股四头肌是收紧/放松", () => {
    renderOverlay({ name: "股四头肌等长收缩" });
    advance(READY);
    expect(screen.getByText("收紧 🔵")).toBeInTheDocument();
    advance(5000);
    expect(screen.getByText("放松 🟢")).toBeInTheDocument();
    expect(screen.getByText(/跟着口令做：准备 5 秒 → 收紧 5 秒 → 放松 5 秒/)).toBeInTheDocument();
  });

  it("结束按钮把累计次数回传给调用方", () => {
    const { onFinish } = renderOverlay();
    advance(READY + CYCLE * 2);
    fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    expect(onFinish).toHaveBeenCalledWith(2);
  });

  it("一次没完成时按钮是关闭，回传 0", () => {
    const { onFinish } = renderOverlay();
    advance(1000);
    fireEvent.click(screen.getByRole("button", { name: /关闭/ }));
    expect(onFinish).toHaveBeenCalledWith(0);
  });

  it("暂停后节拍冻结，继续后恢复", () => {
    renderOverlay();
    advance(READY + 1000);
    fireEvent.click(screen.getByRole("button", { name: /暂停/ }));
    advance(30000);
    // 仍停在第一轮勾脚、0 次完成
    expect(screen.getByText("勾脚 🔵")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "已完成 0 次" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /继续/ }));
    advance(4000); // 勾脚 5s 走完 → 进入伸直（还剩 1 秒）
    expect(screen.getByText("伸直 🟢")).toBeInTheDocument();
  });

  it("达到今日目标自动停表庆祝", () => {
    const { onFinish } = renderOverlay({ target: 2 });
    advance(READY + CYCLE * 2);
    expect(screen.getByText(/目标达成/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /暂停/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    expect(onFinish).toHaveBeenCalledWith(2);
  });

  it("目标按剩余次数计算（已有完成量会扣减）", () => {
    renderOverlay({ target: 3, baseCount: 2 });
    advance(READY + CYCLE); // 再练 1 次即达成剩余目标
    expect(screen.getByText(/目标达成/)).toBeInTheDocument();
    expect(screen.getByText(/今日已完成 3 次/)).toBeInTheDocument();
  });

  it("展示今日累计进度徽标", () => {
    renderOverlay({ target: 10, baseCount: 4 });
    expect(screen.getByText("今日 4 / 10 次")).toBeInTheDocument();
    advance(READY + CYCLE);
    expect(screen.getByText("今日 5 / 10 次")).toBeInTheDocument();
  });

  it("多组动作徽标按组显示进度（setLabel 替换今日）", () => {
    renderOverlay({ target: 20, baseCount: 0, setLabel: "第 2 组" });
    expect(screen.getByText("第 2 组 0 / 20 次")).toBeInTheDocument();
    advance(READY + CYCLE * 3);
    expect(screen.getByText("第 2 组 3 / 20 次")).toBeInTheDocument();
  });

  it("练满本组后庆祝文案说的是本组，不是今日", () => {
    renderOverlay({ target: 2, baseCount: 0, setLabel: "第 1 组" });
    advance(READY + CYCLE * 2);
    expect(screen.getByText(/第 1 组已完成 2 次/)).toBeInTheDocument();
  });
});
