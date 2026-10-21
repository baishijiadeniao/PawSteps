"use client";
import { useRef, useState } from "react";
import { RehabCard } from "./RehabCard";
import { CatMascot } from "./CatMascot";
import { announceAllDone } from "@/lib/stickerPop";

interface TaskWithLog {
  id: string;
  name: string;
  description: string;
  category: string;
  timeOfDay?: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  targetSets: number | null;
  done: boolean;
  completedSets: number;
  completedValue: number;
  log: { id: string } | null;
}

/** 时段分组展示顺序与图标（来自术后第 1 周康复计划） */
const TIME_SLOT_ORDER = ["早晨", "上午", "中午", "下午", "晚上"] as const;
const TIME_SLOT_ICONS: Record<string, string> = {
  早晨: "🌅",
  上午: "☀️",
  中午: "🕛",
  下午: "🌤️",
  晚上: "🌙",
};

function getTodayStr() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });
}

/** 计划组数；没写组数的条目按 1 组处理 */
function setsPlanned(item: TaskWithLog) {
  return Math.max(item.targetSets ?? 1, 1);
}

/** 由累计完成次数折算已练满的组数，封顶在计划组数 */
function setsDone(item: TaskWithLog, completedValue: number) {
  const size = item.targetValue ?? 0;
  if (size <= 0) return setsPlanned(item);
  return Math.min(Math.floor(completedValue / size), setsPlanned(item));
}

export function RehabTaskList({
  items,
  likeCounts,
}: {
  items: TaskWithLog[];
  /** 今日各条打卡收到的点赞数（key = 打卡记录 id） */
  likeCounts?: Record<string, number>;
}) {
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.done]))
  );
  const [errorId, setErrorId] = useState<string | null>(null);
  /** 引导训练刚记入的次数还没走服务端刷新，先在本地累加展示 */
  const [extraMap, setExtraMap] = useState<Record<string, number>>({});
  /** 本轮页面内新建过的打卡记录 id（引导训练/打勾 POST 之后记住它，避免重复建 log） */
  const logIdMapRef = useRef<Record<string, string>>({});

  const completed = items.filter((i) => doneMap[i.id]).length;
  const total = items.length;
  const allDone = total > 0 && completed === total;

  async function onToggle(item: TaskWithLog) {
    const newDone = !doneMap[item.id];
    setDoneMap((m) => ({ ...m, [item.id]: newDone }));
    setErrorId(null);
    const logId = item.log?.id ?? logIdMapRef.current[item.id];
    try {
      if (logId) {
        const res = await fetch(`/api/rehab/${logId}`, {
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
        const created = await res.json().catch(() => null);
        if (created?.id) logIdMapRef.current[item.id] = created.id;
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

  /** 引导训练结束：把自动计出的次数累加进今日完成量，练满全部组数自动打卡 */
  async function recordReps(
    id: string,
    reps: number
  ): Promise<{ ok: boolean; newlyDone: boolean }> {
    const item = items.find((i) => i.id === id);
    if (!item) return { ok: false, newlyDone: false };
    const base = item.completedValue + (extraMap[id] ?? 0);
    const newTotal = base + reps;
    const newSets = setsDone(item, newTotal);
    const wasDone = !!doneMap[id];
    // 练满计划组数才算这条完成；只有一组时等价于旧的"练满 targetValue 次"
    const newDone =
      wasDone || (item.targetValue != null && newSets >= setsPlanned(item));
    const logId = item.log?.id ?? logIdMapRef.current[id];
    try {
      if (logId) {
        const res = await fetch(`/api/rehab/${logId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            completedValue: newTotal,
            completedSets: newSets,
            ...(newDone && !wasDone ? { done: true } : {}),
          }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/rehab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            planItemId: id,
            date: getTodayStr(),
            completedValue: newTotal,
            completedSets: newSets,
            done: newDone,
          }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json().catch(() => null);
        if (created?.id) logIdMapRef.current[id] = created.id;
      }
      setExtraMap((m) => ({ ...m, [id]: (m[id] ?? 0) + reps }));
      if (newDone && !wasDone) {
        setDoneMap((m) => ({ ...m, [id]: true }));
        // 与手动打卡一致：刚好补齐今天全部任务时广播桌宠庆祝
        const remaining = items.filter(
          (i) => i.id !== id && !doneMap[i.id]
        ).length;
        if (remaining === 0) announceAllDone();
      }
      return { ok: true, newlyDone: newDone && !wasDone };
    } catch {
      setErrorId(id);
      setTimeout(() => setErrorId(null), 3000);
      return { ok: false, newlyDone: false };
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

  const renderCard = (item: TaskWithLog) => {
    const completedValue = item.completedValue + (extraMap[item.id] ?? 0);
    const done = !!doneMap[item.id];
    return (
      <div key={item.id}>
        <RehabCard
          item={{
            ...item,
            done,
            completedValue,
            completedSets: setsDone(item, completedValue),
          }}
          likeCount={item.log ? likeCounts?.[item.log.id] ?? 0 : 0}
          onToggle={() => onToggle(item)}
          onRecordReps={recordReps}
        />
        {errorId === item.id && (
          <p className="text-xs text-red-500 text-center mt-1">
            保存失败，请重试
          </p>
        )}
      </div>
    );
  };

  // 有时段字段时按 早晨→晚上 分组展示，否则保持平铺
  const slots = TIME_SLOT_ORDER.filter((s) =>
    items.some((i) => i.timeOfDay === s)
  );
  const plainItems = items.filter((i) => !i.timeOfDay);

  return (
    <div>
      {/* 爪印进度 */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="flex flex-wrap justify-center gap-1.5 text-lg" aria-hidden="true">
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

      {slots.length > 0 ? (
        <div className="space-y-6">
          {plainItems.length > 0 && (
            <div className="space-y-3">{plainItems.map(renderCard)}</div>
          )}
          {slots.map((slot) => {
            const slotItems = items.filter((i) => i.timeOfDay === slot);
            const slotDone = slotItems.filter((i) => doneMap[i.id]).length;
            return (
              <section key={slot}>
                <h3 className="flex items-center gap-2 mb-2.5 px-1">
                  <span aria-hidden="true">{TIME_SLOT_ICONS[slot]}</span>
                  <span className="font-fun font-bold text-cocoa">{slot}</span>
                  <span className="text-xs opacity-50">
                    {slotDone} / {slotItems.length}
                  </span>
                </h3>
                <div className="space-y-3">{slotItems.map(renderCard)}</div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">{items.map(renderCard)}</div>
      )}
    </div>
  );
}
