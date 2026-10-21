import { describe, it, expect } from "vitest";
import { pickStickerStable, type StickerName } from "@/lib/stickerPop";

describe("pickStickerStable", () => {
  it("同一输入多次调用结果一致（不随机跳变）", () => {
    const unlocked: StickerName[] = ["eat_well", "with_you", "take_it_slow"];
    const first = pickStickerStable("OK", unlocked);
    for (let i = 0; i < 5; i++) {
      expect(pickStickerStable("OK", unlocked)).toBe(first);
    }
  });

  it("取场景池内按顺序第一张已解锁的贴纸", () => {
    // OK 池顺序：take_it_slow, eat_well, drink_water, rest_well, sleep_well
    expect(pickStickerStable("OK", ["eat_well", "drink_water"])).toBe("eat_well");
    expect(pickStickerStable("OK", ["drink_water", "take_it_slow"])).toBe(
      "take_it_slow"
    );
  });

  it("场景池一张都没解锁时退回池首", () => {
    expect(pickStickerStable("OK", ["shine_today"])).toBe("take_it_slow");
    expect(pickStickerStable("GREAT", [])).toBe("shine_today");
  });

  it("unlocked 缺失（未取到解锁数据）时退回池首", () => {
    expect(pickStickerStable("DOWN")).toBe("with_you");
    expect(pickStickerStable("DOWN", null)).toBe("with_you");
  });
});
