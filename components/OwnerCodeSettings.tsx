"use client";
import { useState } from "react";

/**
 * 访问码设置（病人侧）：
 * - 修改：填当前码 + 新码 + 确认新码 → POST /api/owner-code（库里只存哈希）；
 * - 恢复默认：custom=true 时展示，填当前码 → DELETE /api/owner-code，回到环境变量 OWNER_CODE；
 * - 已登录的会话在改码后依然有效，下次登录才用新码。
 */

const INPUT_CLS =
  "w-full px-4 py-2.5 rounded-full border-2 border-peach bg-white text-cocoa text-sm placeholder:text-cocoa/35 focus:outline-none focus:border-ragdoll transition-colors";

export function OwnerCodeSettings({ initialCustom }: { initialCustom: boolean }) {
  const [custom, setCustom] = useState(initialCustom);
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // 恢复默认区独立状态
  const [resetCode, setResetCode] = useState("");
  const [resetting, setResetting] = useState(false);

  async function refreshCustom() {
    try {
      const res = await fetch("/api/owner-code");
      if (res.ok) {
        const data = await res.json();
        setCustom(Boolean(data.custom));
      }
    } catch {
      // 状态刷新失败不影响主流程，下次进页会重新查
    }
  }

  async function changeCode(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/owner-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentCode, newCode, confirmCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentCode("");
        setNewCode("");
        setConfirmCode("");
        setNotice("访问码已更新，下次登录请用新码");
        await refreshCustom();
      } else {
        setError(data.error || "修改失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    if (resetting) return;
    const ok = window.confirm(
      "确定恢复默认访问码吗？\n自定义的访问码将立即失效，改用初始访问码登录。"
    );
    if (!ok) return;
    setResetting(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/owner-code", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentCode: resetCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetCode("");
        setNotice("已恢复默认访问码");
        await refreshCustom();
      } else {
        setError(data.error || "恢复失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      {/* 当前状态 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-sm">登录访问码</h2>
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full ${
              custom ? "bg-amber-100 text-amber-700" : "bg-peach/60 text-ragdoll"
            }`}
          >
            {custom ? "已自定义" : "默认"}
          </span>
        </div>
        <p className="text-xs opacity-60 mt-2 leading-relaxed">
          访问码是登录小窝的唯一凭证，只有你知道。修改后当前设备不会被踢出，下次登录时生效。
        </p>
        {notice && (
          <p className="text-sm text-emerald-600 mt-2">{notice}</p>
        )}
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </section>

      {/* 修改访问码 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-3">修改访问码</h2>
        <form onSubmit={changeCode} className="space-y-3">
          <input
            type="password"
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            placeholder="当前访问码"
            autoComplete="current-password"
            className={INPUT_CLS}
          />
          <input
            type="password"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="新访问码（4~32 位，不含空格）"
            autoComplete="new-password"
            className={INPUT_CLS}
          />
          <input
            type="password"
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value)}
            placeholder="再次输入新访问码"
            autoComplete="new-password"
            className={INPUT_CLS}
          />
          <button
            type="submit"
            disabled={saving || !currentCode || !newCode || !confirmCode}
            className="w-full px-4 py-2.5 rounded-full bg-ragdoll text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "保存中…" : "更新访问码"}
          </button>
        </form>
      </section>

      {/* 恢复默认（仅自定义过时可见） */}
      {custom && (
        <section className="card-soft bg-white rounded-2xl p-4">
          <h2 className="font-bold text-sm mb-1">恢复默认访问码</h2>
          <p className="text-xs opacity-60 mb-3">
            清除自定义码，回到初始的默认访问码
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="当前访问码"
              autoComplete="current-password"
              className={`flex-1 min-w-0 ${INPUT_CLS}`}
            />
            <button
              type="button"
              onClick={resetToDefault}
              disabled={resetting || !resetCode}
              className="shrink-0 px-4 py-2.5 rounded-full bg-rose-100 text-rose-700 text-sm font-medium disabled:opacity-50"
            >
              {resetting ? "恢复中…" : "恢复默认"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
