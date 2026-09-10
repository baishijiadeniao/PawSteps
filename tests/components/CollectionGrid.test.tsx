import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { CollectionGrid } from "@/components/CollectionGrid";
import type { CollectionItem } from "@/lib/stickerService";

const unlocked: CollectionItem = {
  sticker: "big_hug",
  label: "抱紧你",
  how: "开箱即用",
  unlocked: true,
  unlockedAt: "2026-09-10T00:00:00.000Z",
  reason: "初始贴纸",
};
const locked: CollectionItem = {
  sticker: "shine_today",
  label: "今天也很棒",
  how: "当天全部动作完成",
  unlocked: false,
  unlockedAt: null,
  reason: null,
};

beforeEach(() => {
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
  (URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (URL as any).revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("x", { status: 200 }))
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CollectionGrid", () => {
  it("格子里没有文字", () => {
    render(<CollectionGrid items={[unlocked, locked]} />);
    const cells = screen.getAllByRole("button");
    expect(cells).toHaveLength(2);
    // 已解锁格子完全无文字，未解锁只有一个占位问号
    expect(cells[0].textContent).toBe("");
    expect(cells[1].textContent).toBe("？");
  });

  it("点已解锁贴纸弹出预览并可下载", async () => {
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<CollectionGrid items={[unlocked, locked]} />);
    fireEvent.click(screen.getByLabelText("查看并下载贴纸「抱紧你」"));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("抱紧你");
    expect(dialog).toHaveTextContent("9月10日");

    fireEvent.click(within(dialog).getByRole("button", { name: "下载贴纸" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/stickers/big_hug.png")
    );
    expect(anchorClick).toHaveBeenCalledTimes(1);
    const a = anchorClick.mock.instances[0] as HTMLAnchorElement;
    expect(a.download).toBe("big_hug.png");
    anchorClick.mockRestore();
  });

  it("未解锁只提示解锁条件，不给下载", () => {
    render(<CollectionGrid items={[unlocked, locked]} />);
    fireEvent.click(
      screen.getByLabelText("未解锁贴纸，解锁条件：当天全部动作完成")
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("还没有解锁");
    expect(dialog).toHaveTextContent("当天全部动作完成");
    expect(
      within(dialog).queryByRole("button", { name: "下载贴纸" })
    ).not.toBeInTheDocument();
  });
});
