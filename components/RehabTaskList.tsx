"use client";
import { useState } from "react";
import { RehabCard } from "./RehabCard";
import { CatMascot } from "./CatMascot";
import { announceAllDone } from "@/lib/stickerPop";

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

function getTodayStr() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
}

export function RehabTaskList({ items }: { items: TaskWithLog[] }) {
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.done]))
  );
  const [errorId, setErrorId] = useState<string | null>(null);

  const completed = items.filter((i) => doneMap[i.id]).length;
  const total = items.length;
  const allDone = total > 0 && completed === total;

  async function onToggle(item: TaskWithLog) {
    const newDone = !doneMap[item.id];
    setDoneMap((m) => ({ ...m, [item.id]: newDone }));
    setErrorId(null);
    try {
      if (item.log) {
        const res = await fetch(`/api/rehab/${item.log.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: newDone }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/rehab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            planItemId: item.id,
            date: getTodayStr(),
            done: newDone,
          }),
        });
        if (!res.ok) throw new Error();
      }
      // 保存成功后：若这次打卡刚好补齐了今天全部任务，广播给桌宠跳庆祝舞
      if (newDone) {
        const remaining = items.filter(
          (i) => i.id !== item.id && !doneMap[i.id]
        ).length;
        if (remaining === 0) announceAllDone();
      }
    } catch {
      setDoneMap((m) => ({ ...m, [item.id]: !newDone })); // 回滚
      setErrorId(item.id);
      setTimeout(() => setErrorId(null), 3000);
    }
  }

  if (total === 0) {
    return (
      <div className="text-center py-12">
        <CatMascot mood="REST" size={64} />
        <p className="mt-4 text-sm opacity-70">今天暂无任务，好好休息。</p>
      </div>
    );
  }

  return (
    <div>
      {/* 爪印进度 */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="flex gap-1.5 text-lg" aria-hidden="true">
          {items.map((i) =>
            doneMap[i.id] ? (
              <span key={i.id} className="animate-pop-in">
                🐾
              </span>
            ) : (
              <span key={i.id} className="opacity-30">
                ○
              </span>
            )
          )}
        </div>
        <span className="text-base font-fun opacity-80">
          {completed} / {total}
        </span>
      </div>

      {/* 全部完成庆祝横幅 */}
      {allDone && (
        <div className="mb-5 p-5 bg-mint/40 rounded-2xl text-center animate-pop-in">
          <CatMascot mood="CELEBRATE" size={56} />
          <p className="font-bold mt-2">今天全部完成啦，小猫为你骄傲！</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <RehabCard
              item={{ ...item, done: !!doneMap[item.id] }}
              onToggle={() => onToggle(item)}
            />
            {errorId === item.id && (
              <p className="text-xs text-red-500 text-center mt-1">
                保存失败，请重试
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
