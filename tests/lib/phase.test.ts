import { describe, it, expect } from "vitest";
import { getRehabPhase } from "@/lib/phase";

describe("phase lib", () => {
  it("POD -1 (术前) → PRE_OP", () => {
    expect(getRehabPhase(-1)).toBe("PRE_OP");
  });

  it("POD 0 → EARLY", () => {
    expect(getRehabPhase(0)).toBe("EARLY");
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
