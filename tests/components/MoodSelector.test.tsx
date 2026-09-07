import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoodSelector } from "@/components/MoodSelector";

describe("MoodSelector", () => {
  it("renders 5 mood buttons", () => {
    render(<MoodSelector selected={null} onSelect={() => {}} />);
    expect(screen.getByText("棒极了")).toBeInTheDocument();
    expect(screen.getByText("还不错")).toBeInTheDocument();
    expect(screen.getByText("还行")).toBeInTheDocument();
    expect(screen.getByText("有点糟")).toBeInTheDocument();
    expect(screen.getByText("焦虑了")).toBeInTheDocument();
  });

  it("calls onSelect with mood value when clicked", () => {
    const onSelect = vi.fn();
    render(<MoodSelector selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("棒极了"));
    expect(onSelect).toHaveBeenCalledWith("GREAT");
  });

  it("highlights selected mood", () => {
    render(<MoodSelector selected="GOOD" onSelect={() => {}} />);
    const btn = screen.getByText("还不错").closest("button");
    expect(btn?.className).toContain("ring-2");
  });
});
