import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RehabCard } from "@/components/RehabCard";

const mockItem = {
  id: "test-1",
  phase: "EARLY",
  name: "股四头肌等长收缩",
  description: "维持肌力",
  category: "exercise",
  targetValue: 30,
  targetUnit: "次",
  targetSets: 3,
  frequencyPerDay: 1,
  prerequisites: null,
  stopConditions: null,
  notes: null,
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  log: null,
  completedSets: 0,
  completedValue: 0,
  done: false,
};

describe("RehabCard", () => {
  it("renders exercise name and target chip", () => {
    render(<RehabCard item={mockItem as any} onToggle={() => {}} />);
    expect(screen.getByText("股四头肌等长收缩")).toBeInTheDocument();
    expect(screen.getByText("30 次 × 3 组")).toBeInTheDocument();
  });

  it("renders light description text", () => {
    render(<RehabCard item={mockItem as any} onToggle={() => {}} />);
    expect(screen.getByText("维持肌力")).toBeInTheDocument();
  });

  it("shows check-in circle button when not done", () => {
    render(<RehabCard item={mockItem as any} onToggle={() => {}} />);
    expect(
      screen.getByRole("button", { name: /完成打卡/ })
    ).toBeInTheDocument();
  });

  it("calls onToggle with item id when clicked", () => {
    const onToggle = vi.fn();
    render(<RehabCard item={mockItem as any} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /完成打卡/ }));
    expect(onToggle).toHaveBeenCalledWith(mockItem.id);
  });

  it("shows done state when completed", () => {
    render(
      <RehabCard
        item={{ ...mockItem, done: true } as any}
        onToggle={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: /已打卡/ })
    ).toBeInTheDocument();
  });

  it("多组任务显示组数进度，浮层目标是一组的次数", () => {
    render(
      <RehabCard
        item={
          {
            ...mockItem,
            targetSets: 2,
            completedSets: 1,
            completedValue: 30, // 第一组 30 次已练满
          } as any
        }
        onToggle={() => {}}
        onRecordReps={vi.fn()}
      />
    );
    expect(screen.getByText("组数 1 / 2 · 还差 1 组")).toBeInTheDocument();
    // 第二组入口
    fireEvent.click(screen.getByRole("button", { name: /开始第 2 组训练/ }));
    // 浮层从本组 0 开始数，目标 30 次而不是今日 60 次
    expect(screen.getByText("第 2 组 0 / 30 次")).toBeInTheDocument();
  });

  it("单组任务不显示组数行，按钮仍是开始训练", () => {
    render(
      <RehabCard
        item={{ ...mockItem, targetSets: 1 } as any}
        onToggle={() => {}}
        onRecordReps={vi.fn()}
      />
    );
    expect(screen.queryByText(/组数/)).toBeNull();
    expect(screen.getByRole("button", { name: /开始训练/ })).toBeInTheDocument();
  });

  it("手动打勾的多组任务不再显示\"还差 N 组\"", () => {
    render(
      <RehabCard
        item={{ ...mockItem, targetSets: 2, done: true, completedSets: 0 } as any}
        onToggle={() => {}}
        onRecordReps={vi.fn()}
      />
    );
    expect(screen.getByText("组数 2 / 2")).toBeInTheDocument();
    // 已完成的任务不再提供训练入口
    expect(screen.queryByRole("button", { name: /组训练/ })).toBeNull();
  });
});
