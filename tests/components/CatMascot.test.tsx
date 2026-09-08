import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CatMascot } from "@/components/CatMascot";

const MOODS = [
  "NORMAL",
  "CHEER",
  "CELEBRATE",
  "COMFORT",
  "REST",
  "GREAT",
  "GOOD",
  "OKAY",
  "DOWN",
  "ANXIOUS",
] as const;

describe("CatMascot", () => {
  it("renders a photo cat with float animation for every mood", () => {
    for (const mood of MOODS) {
      const { unmount } = render(<CatMascot mood={mood} />);
      const el = screen.getByRole("img");
      expect(el).toHaveAttribute(
        "aria-label",
        expect.stringContaining("布偶猫")
      );
      expect(el.className).toContain("animate-float");
      expect(el.querySelector("img")).toBeInTheDocument();
      unmount();
    }
  });

  it("maps moods to the matching photo", () => {
    const { unmount } = render(<CatMascot mood="REST" />);
    expect(screen.getByRole("img").querySelector("img")).toHaveAttribute(
      "src",
      "/cats/lazy.png"
    );
    unmount();

    render(<CatMascot mood="CELEBRATE" />);
    expect(screen.getByRole("img").querySelector("img")).toHaveAttribute(
      "src",
      "/cats/roar.png"
    );
  });

  it("scales via size prop", () => {
    render(<CatMascot size={96} />);
    const img = screen.getByRole("img").querySelector("img");
    expect(img).toHaveAttribute("width", "96");
    expect(img).toHaveStyle({ width: "96px", height: "96px" });
  });
});
