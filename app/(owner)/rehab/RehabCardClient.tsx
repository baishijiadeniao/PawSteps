"use client";
import { RehabCard } from "@/components/RehabCard";
import { useState } from "react";

interface TaskWithLog {
  id: string;
  name: string;
  description: string;
  category: string;
  targetValue: number | null;
  targetUnit: string | null;
  targetSets: number | null;
  done: boolean;
  completedSets: number;
  completedValue: number;
  log: { id: string } | null;
}

export function RehabCardClient({ item }: { item: TaskWithLog }) {
  const [done, setDone] = useState(item.done);
  const [error, setError] = useState("");

  async function onToggle(id: string) {
    const newDone = !done;
    setDone(newDone);
    setError("");
    try {
      if (item.log) {
        // 更新现有 log
        const res = await fetch(`/api/rehab/${item.log.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: newDone }),
        });
        if (!res.ok) throw new Error();
      } else {
        // 创建新 log
        const res = await fetch("/api/rehab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            planItemId: id,
            date: new Date().toISOString().slice(0, 10),
            done: newDone,
          }),
        });
        if (!res.ok) throw new Error();
      }
    } catch {
      setDone(!newDone); // 回滚
      setError("保存失败，请重试");
      setTimeout(() => setError(""), 3000);
    }
  }

  return (
    <>
      <RehabCard item={{ ...item, done }} onToggle={onToggle} />
      {error && (
        <p className="text-xs text-red-500 text-center mt-1">{error}</p>
      )}
    </>
  );
}
