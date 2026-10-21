"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 主人登录表单（客户端部分）。
 * 登录成功后的回跳地址由服务端页面读取 searchParams 后以 props 传入，
 * 页面本身保持服务端渲染，头部贴纸才能每次打开都随机更换。
 */
export function LoginForm({ from }: { from: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(from);
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
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="访问码"
        className="w-full px-5 py-3 rounded-full border-2 border-peach bg-white text-cocoa placeholder:text-cocoa/35 focus:outline-none focus:border-ragdoll transition-colors"
        autoFocus
      />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={loading || !code}
        className="w-full py-3 rounded-2xl bg-ragdoll text-white font-medium disabled:opacity-50"
      >
        {loading ? "登录中…" : "进入小窝"}
      </button>
    </form>
  );
}
