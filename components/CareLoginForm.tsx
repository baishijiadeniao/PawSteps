"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 陪伴者登录表单（客户端部分）：只需填病人给的 8 位邀请码。
 * 称呼由病人生成邀请码时指定，陪伴者不能自报身份。
 * 页面外壳保持服务端渲染，头部贴纸每次打开随机更换。
 */
export function CareLoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/care/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/care");
        router.refresh();
      } else {
        setError(data.error || "登录失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="8 位邀请码"
          autoComplete="off"
          autoCapitalize="characters"
          className="w-full px-5 py-3 rounded-full border-2 border-peach bg-white text-cocoa text-center tracking-[0.3em] font-bold uppercase placeholder:text-cocoa/35 placeholder:tracking-normal placeholder:font-normal placeholder:normal-case focus:outline-none focus:border-ragdoll transition-colors"
          autoFocus
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !code}
          className="w-full py-3 rounded-2xl bg-ragdoll text-white font-medium disabled:opacity-50"
        >
          {loading ? "登录中…" : "进入陪伴视角"}
        </button>
      </form>
      <p className="text-xs text-center opacity-50 mt-5">
        你只能查看近况和送出鼓励，不能修改任何记录
      </p>
    </>
  );
}
