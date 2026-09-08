import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DesktopPet } from "@/components/DesktopPet";
import { ENCORAGEMENTS } from "@/lib/encouragement";

vi.useFakeTimers();

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllTimers();
});

function getPet() {
  return screen.getByRole("button", { name: /桌宠猫猫/ });
}

describe("DesktopPet", () => {
  it("renders a sitting cat in the corner by default", () => {
    render(<DesktopPet />);
    const pet = getPet();
    expect(pet.className).toContain("fixed");
    expect(pet.querySelector("svg")).toBeInTheDocument();
    // 默认贴右下角
    expect(pet.style.right).toBe("1rem");
  });

  it("shows a reaction bubble on click", () => {
    render(<DesktopPet />);
    const pet = getPet();
    fireEvent.pointerDown(pet, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(pet, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.click(pet);
    const phrases = [
      "喵～",
      "蹭蹭你～",
      "喵嘿嘿！",
      "最喜欢你啦",
      "呼噜呼噜…",
      "摸摸我嘛",
    ];
    const bubble = screen.getByRole("status");
    expect(phrases).toContain(bubble.textContent);
  });

  it("says an encouragement on double click", () => {
    render(<DesktopPet />);
    const pet = getPet();
    fireEvent.pointerDown(pet, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(pet, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.doubleClick(pet);
    const bubble = screen.getByRole("status");
    expect(ENCORAGEMENTS).toContain(bubble.textContent);
  });

  it("moves and saves position after dragging", () => {
    render(<DesktopPet />);
    const pet = getPet();
    fireEvent.pointerDown(pet, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(pet, { clientX: 200, clientY: 250, pointerId: 1 });
    fireEvent.pointerUp(pet, { clientX: 200, clientY: 250, pointerId: 1 });
    // 拖拽后切换为 left/top 定位
    expect(pet.style.left).toBeTruthy();
    expect(pet.style.right).toBe("");
    // 位置存进了 localStorage
    const saved = JSON.parse(localStorage.getItem("desktop-pet-pos") || "{}");
    expect(saved).toHaveProperty("x");
    expect(saved).toHaveProperty("y");
  });

  it("ignores click right after a drag", () => {
    render(<DesktopPet />);
    const pet = getPet();
    fireEvent.pointerDown(pet, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(pet, { clientX: 180, clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(pet, { clientX: 180, clientY: 160, pointerId: 1 });
    fireEvent.click(pet); // 拖拽后的 click 不应触发反应
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("restores saved position on mount", () => {
    localStorage.setItem(
      "desktop-pet-pos",
      JSON.stringify({ x: 120, y: 240 })
    );
    render(<DesktopPet />);
    const pet = getPet();
    expect(pet.style.left).toBe("120px");
    expect(pet.style.top).toBe("240px");
  });

  it("bubbles on its own when idle", () => {
    // 固定随机数：空闲间隔 = 40000 + 0.5 * 50000 = 65000ms
    const rand = vi.spyOn(Math, "random").mockReturnValue(0.5);
    render(<DesktopPet />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(65001);
    });
    expect(screen.queryByRole("status")).not.toBeNull();
    rand.mockRestore();
  });
});
