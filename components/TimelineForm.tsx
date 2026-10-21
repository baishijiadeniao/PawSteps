"use client";
import { useState } from "react";

const TYPES = [
  { value: "SURGERY", label: "🏥 手术" },
  { value: "FOLLOW_UP", label: "📋 复诊" },
  { value: "PLAN_CHANGE", label: "📝 计划调整" },
  { value: "MILESTONE", label: "🎉 里程碑" },
  { value: "NOTE", label: "📝 备注" },
];

export function TimelineForm({
  defaultDate,
  onAdded,
}: {
  defaultDate: string;
  onAdded: () => void;
}) {
  // 日期框默认填入日历选中的那天（无选中则为今天），避免打开表单是一片空白
  const [date, setDate] = useState(defaultDate);
  const [type, setType] = useState("FOLLOW_UP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/timeline", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        type,
        title,
        description: description || null,
      }),
    });
    if (res.ok) {
      setDate(defaultDate);
      setTitle("");
      setDescription("");
      onAdded();
    } else {
      setError("添加失败");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-peach p-4 rounded-2xl">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        className="w-full px-4 py-3 rounded-xl bg-white"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        required
        maxLength={50}
        className="w-full px-4 py-3 rounded-xl bg-white"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="内容（可选）"
        maxLength={500}
        className="w-full px-4 py-3 rounded-xl bg-white min-h-20 resize-none"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        className="btn-candy w-full py-3 bg-ragdoll text-white"
      >
        🐾 添加
      </button>
    </form>
  );
}
