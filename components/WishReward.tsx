"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WishDTO } from "@/lib/wishService";

/**
 * "连续打卡赢小愿望"卡片（病人端 rehab 页）：
 * - 有已赢得未填写的愿望 → 庆祝横幅 + 写下愿望（提交后陪伴者可见）；
 * - 等待实现的愿望 → 列表 + "已实现"按钮；
 * - 其余情况 → 展示当前连胜与距下个愿望还差几天。
 * 数据由服务端直渲传入，操作成功后 router.refresh() 重新拉取。
 */

interface WishRewardProps {
  wishes: WishDTO[];
  /** 当前这段连续打卡天数 */
  streak: number;
  /** 距下一个愿望还差几天 */
  daysToNext: number;
  /** 赢得 1 个愿望所需的连续天数（7） */
  milestone: number;
}

export function WishReward({
  wishes,
  streak,
  daysToNext,
  milestone,
}: WishRewardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const earned = wishes.filter((w) => w.status === "EARNED");
  const waiting = wishes.filter((w) => w.status === "WAITING");
  const doneCount = wishes.filter((w) => w.status === "DONE").length;
  const targetEarned = earned[0];

  async function submitWish(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !targetEarned || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: targetEarned.id, content: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function markDone(id: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "done" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-soft bg-white rounded-2xl p-4 mt-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-sm">⭐ 小愿望</h2>
        <span className="text-xs opacity-50">
          {earned.length > 0
            ? "已赢得愿望，快写下吧"
            : streak > 0
              ? `已连续 ${streak} 天 · 再坚持 ${daysToNext} 天得 1 个`
              : `连续打卡 ${milestone} 天可赢得 1 个`}
        </span>
      </div>

      {/* 庆祝 + 写下愿望 */}
      {targetEarned && (
        <div className="p-4 bg-mint/40 rounded-2xl text-center animate-pop-in mb-3">
          <p className="font-bold text-sm">
            🎉 连续打卡 {targetEarned.streakDays} 天，赢得一个小愿望！
          </p>
          <p className="text-xs opacity-60 mt-1">
            写下你的小心愿，陪伴者在 TA 的页面看得到哦
          </p>
          <form onSubmit={submitWish} className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 100))}
              placeholder="想去哪里玩？想吃什么？"
              maxLength={100}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-peach bg-white text-cocoa text-sm placeholder:text-cocoa/35 focus:outline-none focus:border-ragdoll transition-colors"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="shrink-0 px-4 py-2 rounded-xl bg-ragdoll text-white text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
            >
              许下 ✨
            </button>
          </form>
        </div>
      )}

      {/* 等待实现的愿望 */}
      {waiting.length > 0 && (
        <ul className="space-y-2">
          {waiting.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 bg-peach/15 border-2 border-peach/50"
            >
              <span className="text-lg shrink-0" aria-hidden="true">
                🎈
              </span>
              <p className="flex-1 min-w-0 text-sm break-words">{w.content}</p>
              <button
                type="button"
                onClick={() => markDone(w.id)}
                disabled={busy}
                className="shrink-0 px-3 py-1.5 rounded-full bg-white border-2 border-mint text-cocoa/70 text-xs font-bold active:scale-95 disabled:opacity-50 transition-transform"
              >
                已实现 ✅
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 已实现计数 */}
      {doneCount > 0 && (
        <p className="text-[11px] opacity-45 mt-2">
          已经实现过 {doneCount} 个小愿望啦
        </p>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </section>
  );
}
