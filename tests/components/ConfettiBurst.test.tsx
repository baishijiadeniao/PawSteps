import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  useConfetti,
  ConfettiOverlay,
} from "@/components/ConfettiBurst";
import { useTypewriter } from "@/lib/useTypewriter";
import { EncouragementTypewriter } from "@/components/EncouragementTypewriter";

vi.useFakeTimers();

afterEach(() => {
  vi.clearAllTimers();
});

function ConfettiHarness() {
  const { fire, burst } = useConfetti();
  return (
    <div>
      <button type="button" onClick={fire}>
        fire
      </button>
      <ConfettiOverlay burst={burst} />
    </div>
  );
}

describe("ConfettiBurst", () => {
  it("renders particles after fire() and clears them after animation", () => {
    render(<ConfettiHarness />);
    expect(screen.queryByText(/🐾|❤️|✿|🌸|⭐|💜/)).not.toBeInTheDocument();

    act(() => {
      screen.getByText("fire").click();
    });
    const particles = screen.getAllByText(/🐾|❤️|✿|🌸|⭐|💜/);
    expect(particles.length).toBeGreaterThan(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText(/🐾|❤️|✿|🌸|⭐|💜/)).not.toBeInTheDocument();
  });
});

describe("useTypewriter", () => {
  it("displays text progressively and completes", () => {
    function Harness() {
      const { displayed, done } = useTypewriter("小猫", 10);
      return (
        <p>
          {displayed}|{done ? "done" : "typing"}
        </p>
      );
    }
    render(<Harness />);
    expect(screen.getByText("|typing")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30);
    });
    expect(screen.getByText("小猫|done")).toBeInTheDocument();
  });
});

describe("EncouragementTypewriter", () => {
  it("starts empty and shows full text after typing", () => {
    render(<EncouragementTypewriter text="慢慢来" />);
    expect(screen.queryByText(/慢慢来/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText(/慢慢来/)).toBeInTheDocument();
  });
});
