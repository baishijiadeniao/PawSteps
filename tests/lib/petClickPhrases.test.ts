import { describe, it, expect } from "vitest";
import {
  PET_CLICK_REACTIONS,
  ALL_CLICK_PHRASES,
} from "@/lib/petClickPhrases";

describe("petClickPhrases 单击语录池", () => {
  it("语录总数至少 100 条", () => {
    expect(ALL_CLICK_PHRASES.length).toBeGreaterThanOrEqual(100);
  });

  it("每个姿势组都有语录", () => {
    for (const group of PET_CLICK_REACTIONS) {
      expect(group.phrases.length, `姿势 ${group.pose} 的语录为空`).toBeGreaterThan(0);
    }
  });

  it("语录不重复", () => {
    const set = new Set(ALL_CLICK_PHRASES);
    expect(set.size).toBe(ALL_CLICK_PHRASES.length);
  });

  it("语录长度适合气泡展示（不超过 20 字）", () => {
    for (const phrase of ALL_CLICK_PHRASES) {
      expect(phrase.length, `过长：${phrase}`).toBeLessThanOrEqual(20);
    }
  });
});
