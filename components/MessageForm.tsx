"use client";
import { useState } from "react";

const EMOJIS = ["❤️", "🫶", "🐱", "🌷", "🌈", "💪", "🎉"];

export function MessageForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState("❤️");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, content, emoji }),
    });
    setLoading(false);
    if (res.ok) {
      setName("");
      setContent("");
      onSubmitted();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "提交失败");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="昵称"
        maxLength={20}
        className="w-full px-4 py-3 rounded-2xl bg-white border border-peach"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="给十一留句话…"
        maxLength={300}
        className="w-full px-4 py-3 rounded-2xl bg-white border border-peach min-h-24 resize-none"
      />
      <div className="flex gap-2 flex-wrap">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`text-2xl px-3 py-1 rounded-lg ${
              emoji === e ? "bg-coral" : "bg-peach"
            }`}
            aria-label={`表情 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name || !content}
        className="w-full py-3 rounded-2xl bg-ragdoll text-white disabled:opacity-50"
      >
        {loading ? "发送中…" : "发送鼓励"}
      </button>
    </form>
  );
}
