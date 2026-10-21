"use client";
import { useState } from "react";

/**
 * 陪伴者管理（病人侧）：
 * - 新增：填称呼 → POST /api/companions 拿 8 位邀请码，发给亲友即可；
 * - 复制：一键复制邀请码（clipboard 不可用时支持手动长按选择）；
 * - 移除：DELETE /api/companions/{id}，对方登录立即失效、留言一并删除。
 */

interface CompanionRow {
  id: string;
  nickname: string;
  inviteCode: string;
  messageCount: number;
  lastSeenLabel: string;
}

export function CompanionManager({ initial }: { initial: CompanionRow[] }) {
  const [rows, setRows] = useState<CompanionRow[]>(initial);
  const [nickname, setNickname] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  /** 刚复制过的陪伴者 id（按钮文案反馈） */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function addCompanion(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !nickname.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/companions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((prev) => [
          {
            id: data.id,
            nickname: data.nickname,
            inviteCode: data.inviteCode,
            messageCount: 0,
            lastSeenLabel: "尚未访问",
          },
          ...prev,
        ]);
        setNickname("");
      } else {
        setError(data.error || "创建失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setCreating(false);
    }
  }

  async function copyCode(row: CompanionRow) {
    try {
      await navigator.clipboard.writeText(row.inviteCode);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard 不可用（如非 https）时不报错，邀请码本来就显示在卡片上
    }
  }

  async function removeCompanion(row: CompanionRow) {
    const ok = window.confirm(
      `确定移除「${row.nickname}」吗？\nTA 的登录会立即失效，送出过的鼓励也会一并删除。`
    );
    if (!ok) return;
    const res = await fetch(`/api/companions/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "移除失败，请重试");
    }
  }

  return (
    <>
      {/* 新增陪伴者 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-2">邀请新的陪伴者</h2>
        <form onSubmit={addCompanion} className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="TA 的称呼（如：妈妈）"
            maxLength={20}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-full border-2 border-peach bg-white text-cocoa text-sm placeholder:text-cocoa/35 focus:outline-none focus:border-ragdoll transition-colors"
          />
          <button
            type="submit"
            disabled={creating || !nickname.trim()}
            className="shrink-0 px-4 py-2.5 rounded-full bg-ragdoll text-white text-sm font-medium disabled:opacity-50"
          >
            {creating ? "生成中…" : "生成邀请码"}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </section>

      {/* 陪伴者列表 */}
      {rows.length === 0 ? (
        <p className="text-sm opacity-50 text-center py-8">
          还没有邀请过陪伴者，生成一个邀请码试试吧
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="card-soft bg-white rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm">「{row.nickname}」</p>
                  <p className="text-[11px] opacity-50 mt-0.5">
                    最近：{row.lastSeenLabel} · 送出 {row.messageCount} 条鼓励
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeCompanion(row)}
                  className="shrink-0 text-xs text-red-400 underline underline-offset-4 hover:text-red-500"
                >
                  移除
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 bg-peach/50 rounded-xl px-3 py-2">
                <p className="font-mono font-bold tracking-[0.25em] text-ragdoll select-all">
                  {row.inviteCode}
                </p>
                <button
                  type="button"
                  onClick={() => copyCode(row)}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-ragdoll/40 text-ragdoll"
                >
                  {copiedId === row.id ? "已复制 ✓" : "复制"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] opacity-40 mt-4 text-center">
        邀请码即身份：拿到码的人可查看近况并送出鼓励，但无法修改任何记录
      </p>
    </>
  );
}
