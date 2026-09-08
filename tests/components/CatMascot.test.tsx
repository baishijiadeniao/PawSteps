import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CatMascot } from "@/components/CatMascot";

const MOODS = ["NORMAL", "CHEER", "CELEBRATE", "COMFORT", "REST"] as const;

describe("CatMascot", () => {
  it("renders an svg cat with float animation for every mood", () => {
    for (const mood of MOODS) {
      const { unmount } = render(<CatMascot mood={mood} />);
      const el = screen.getByRole("img");
      expect(el).toHaveAttribute(
        "aria-label",
        expect.stringContaining("布偶猫")
      );
      expect(el.className).toContain("animate-float");
      expect(el.querySelector("svg")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders mood-specific details", () => {
    const { unmount } = render(<CatMascot mood="REST" />);
    expect(screen.getByText("Z")).toBeInTheDocument();
    unmount();

    render(<CatMascot mood="CELEBRATE" />);
    // 星星眼：两颗蓝色星星
    const stars = document.querySelectorAll("svg g[fill='#8FC9E8'] path");
    expect(stars.length).toBe(2);
  });

  it("scales via size prop", () => {
    render(<CatMascot size={96} />);
    expect(document.querySelector("svg")).toHaveAttribute("width", "96");
  });
});
