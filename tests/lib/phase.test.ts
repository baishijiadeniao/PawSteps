import { describe, it, expect } from "vitest";
import { getRehabPhase } from "@/lib/phase";

describe("phase lib", () => {
  it("POD -1 (术前) → PRE_OP", () => {
    expect(getRehabPhase(-1)).toBe("PRE_OP");
  });

  it("POD 0 → WEEK_1 (术后第 1 周)", () => {
    expect(getRehabPhase(0)).toBe("WEEK_1");
  });

  it("POD 6 → WEEK_1 (第 1 周上界)", () => {
    expect(getRehabPhase(6)).toBe("WEEK_1");
  });

  it("POD 7 → EARLY (第 2 周下界)", () => {
    expect(getRehabPhase(7)).toBe("EARLY");
  });

  it("POD 14 → EARLY (上界)", () => {
    expect(getRehabPhase(14)).toBe("EARLY");
  });

  it("POD 15 → MID (下界)", () => {
    expect(getRehabPhase(15)).toBe("MID");
  });

  it("POD 42 → MID (上界)", () => {
    expect(getRehabPhase(42)).toBe("MID");
  });

  it("POD 43 → LATE (下界)", () => {
    expect(getRehabPhase(43)).toBe("LATE");
  });

  it("POD 365 → LATE", () => {
    expect(getRehabPhase(365)).toBe("LATE");
  });
});
