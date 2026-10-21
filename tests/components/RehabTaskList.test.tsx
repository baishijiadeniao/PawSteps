import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { RehabTaskList } from "@/components/RehabTaskList";
import { ALL_DONE_EVENT } from "@/lib/stickerPop";

vi.useFakeTimers();

type Item = React.ComponentProps<typeof RehabTaskList>["items"][number];

function makeItem(over: Partial<Item> = {}): Item {
  return {
    id: "p1",
    name: "踝泵运动",
    description: "踝关节屈伸促循环防血栓",
    category: "exercise",
    targetValue: 50,
    targetUnit: "次",
    targetSets: 1,
    done: false,
    completedSets: 0,
    completedValue: 0,
    log: null,
    ...over,
  };
}

/** 推进训练节拍（踝泵：准备 5s + 一轮循环 10s，走完一整轮算 1 次） */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** 直接推进到完成 reps 次 */
function advanceReps(reps: number) {
  advance(5000 + 10000 * reps);
}

/** 屈膝训练：准备 5s + 每轮 15s（屈膝保持满 10 秒即计次，末尾还有 5s 伸直） */
function advanceBendReps(reps: number) {
  advance(5000 + 15000 * (reps - 1) + 10000);
}

/** 解析某次 fetch 调用的请求体 */
function bodyOfCall(n: number) {
  return JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[n][1].body);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: "log-new" }),
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

describe("RehabTaskList 引导训练落库", () => {
  it("次数类训练卡片提供开始训练入口，非次数类没有", () => {
    render(
      <RehabTaskList
        items={[makeItem(), makeItem({ id: "p2", name: "患肢抬高", category: "care", targetUnit: "分钟" })]}
      />
    );
    expect(screen.getAllByRole("button", { name: /开始训练/ })).toHaveLength(1);
  });

  it("已结束的任务不再显示开始训练", () => {
    render(<RehabTaskList items={[makeItem({ done: true, log: { id: "l0" } })]} />);
    expect(screen.queryByRole("button", { name: /开始训练/ })).toBeNull();
  });

  it("练完 N 轮后点结束：POST 创建打卡并带上自动计出的次数", async () => {
    render(<RehabTaskList items={[makeItem()]} />);
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advanceReps(3); // 完成 3 次
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/rehab");
    const body = bodyOfCall(0);
    expect(body.planItemId).toBe("p1");
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.completedValue).toBe(3);
    expect(body.done).toBe(false); // 3 < 目标 50
  });

  it("达到目标次数时自动打勾，并广播全部完成事件", async () => {
    const onAllDone = vi.fn();
    window.addEventListener(ALL_DONE_EVENT, onAllDone);
    render(<RehabTaskList items={[makeItem({ targetValue: 2 })]} />);
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advanceReps(2); // 恰好达成目标 2 次
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    const body = bodyOfCall(0);
    expect(body.completedValue).toBe(2);
    expect(body.done).toBe(true);
    expect(onAllDone).toHaveBeenCalledTimes(1); // 唯一任务被补齐
    window.removeEventListener(ALL_DONE_EVENT, onAllDone);
  });

  it("已有今日打卡时走 PATCH 累加次数", async () => {
    render(
      <RehabTaskList
        items={[makeItem({ completedValue: 10, log: { id: "lg9" } })]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advanceReps(2);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/rehab/lg9");
    const body = bodyOfCall(0);
    expect(body.completedValue).toBe(12); // 10 + 2
    expect(body.done).toBeUndefined(); // 未达标不动 done
  });

  it("第二轮训练基于已记次数继续累加，且不再重复建 log", async () => {
    render(<RehabTaskList items={[makeItem()]} />);
    // 第一轮：2 次
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advanceReps(2);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    // 第二轮：1 次（浮层应显示今日已累计 2 次）
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    expect(screen.getByText("今日 2 / 50 次")).toBeInTheDocument();
    advanceReps(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 第二次走 PATCH（复用第一轮 POST 返回的 log id），总量累加
    expect(fetchMock.mock.calls[1][0]).toBe("/api/rehab/log-new");
    expect(bodyOfCall(1).completedValue).toBe(3);
  });

  it("一次没练成时关闭浮层不发起请求", async () => {
    render(<RehabTaskList items={[makeItem()]} />);
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advance(1000);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /关闭/ }));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("多组动作：练满一组不算完成，卡片给出第二组入口", async () => {
    // 屈膝训练：一组 2 次 × 2 组（一轮 15 秒太长，测试里只把次数当组内目标）
    render(
      <RehabTaskList
        items={[makeItem({ name: "屈膝训练", targetValue: 2, targetSets: 2 })]}
      />
    );
    expect(screen.getByText("组数 0 / 2 · 还差 2 组")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /开始第 1 组训练/ })).toBeInTheDocument();

    // 第一组：练满 2 次（准备 5s + 两轮屈膝保持）
    fireEvent.click(screen.getByRole("button", { name: /开始第 1 组训练/ }));
    expect(screen.getByText("第 1 组 0 / 2 次")).toBeInTheDocument();
    advanceBendReps(2);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    const first = bodyOfCall(0);
    expect(first.completedValue).toBe(2);
    expect(first.completedSets).toBe(1);
    expect(first.done).toBe(false); // 还有第二组，整条不能算完成

    // 回到卡片：第一组已练满，按钮变成第二组
    expect(screen.getByText("组数 1 / 2 · 还差 1 组")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /开始第 2 组训练/ })).toBeInTheDocument();

    // 第二组：浮层从 0 开始重新数（组内进度，不是全天累计）
    fireEvent.click(screen.getByRole("button", { name: /开始第 2 组训练/ }));
    expect(screen.getByText("第 2 组 0 / 2 次")).toBeInTheDocument();
    advanceBendReps(2);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    const second = bodyOfCall(1);
    expect(second.completedValue).toBe(4); // 2 组 × 2 次
    expect(second.completedSets).toBe(2);
    expect(second.done).toBe(true); // 组数练满才自动打卡
  });

  it("保存失败时提示重试", async () => {
    fetchMock.mockImplementation(async () => ({ ok: false, json: async () => ({}) }));
    render(<RehabTaskList items={[makeItem()]} />);
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    advanceReps(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /结束并记录/ }));
    });
    expect(screen.getByText("保存失败，请重试")).toBeInTheDocument();
  });
});
