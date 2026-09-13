import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoodSelector, type MoodValue } from "@/components/MoodSelector";
import type { StickerName } from "@/lib/stickerPop";

// 服务端页面会按心情场景随机传入贴纸，测试里固定一份用于断言
const stickers: Record<MoodValue, StickerName> = {
  GREAT: "shine_today",
  GOOD: "cheer_cheer",
  OK: "eat_well",
  DOWN: "with_you",
  ANXIOUS: "sleep_well",
};

describe("MoodSelector", () => {
  it("renders 5 mood buttons", () => {
    render(<MoodSelector selected={null} onSelect={() => {}} stickers={stickers} />);
    expect(screen.getByText("棒极了")).toBeInTheDocument();
    expect(screen.getByText("还不错")).toBeInTheDocument();
    expect(screen.getByText("还行")).toBeInTheDocument();
    expect(screen.getByText("有点糟")).toBeInTheDocument();
    expect(screen.getByText("焦虑了")).toBeInTheDocument();
  });

  it("renders the sticker images passed in props", () => {
    const { container } = render(
      <MoodSelector selected={null} onSelect={() => {}} stickers={stickers} />
    );
    const imgs = container.querySelectorAll("img");
    expect(imgs[0].getAttribute("src")).toBe("/stickers/shine_today.png");
    expect(imgs[4].getAttribute("src")).toBe("/stickers/sleep_well.png");
  });

  it("calls onSelect with mood value when clicked", () => {
    const onSelect = vi.fn();
    render(<MoodSelector selected={null} onSelect={onSelect} stickers={stickers} />);
    fireEvent.click(screen.getByText("棒极了"));
    expect(onSelect).toHaveBeenCalledWith("GREAT");
  });

  it("highlights selected mood", () => {
    render(<MoodSelector selected="GOOD" onSelect={() => {}} stickers={stickers} />);
    const btn = screen.getByText("还不错").closest("button");
    expect(btn?.className).toContain("ring-2");
  });

  it("每档补一行小字说明", () => {
    render(<MoodSelector selected={null} onSelect={() => {}} stickers={stickers} />);
    expect(screen.getByText("心情超好")).toBeInTheDocument();
    expect(screen.getByText("有点紧张")).toBeInTheDocument();
  });

  // 勾选徽标用 svg，不能改成 <img>：上一条断言依赖"5 个 img 全是贴纸"
  it("只有选中的那一档出现勾选徽标", () => {
    const { container } = render(
      <MoodSelector selected="GOOD" onSelect={() => {}} stickers={stickers} />
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
