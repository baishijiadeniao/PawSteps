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
});
