"use client";
import { useState } from "react";
import { useConfetti, ConfettiOverlay } from "./ConfettiBurst";
import { popSticker } from "@/lib/stickerPop";
import { GuidedExerciseOverlay } from "./GuidedExerciseOverlay";

interface RehabCardProps {
  item: {
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
  };
  /** 陪伴者们为这条打卡点的赞数（>0 时显示 ❤️ 角标） */
  likeCount?: number;
  onToggle: (id: string) => void;
  /** 引导训练结束后把自动计出的次数落库；返回是否成功/是否刚好达成目标 */
  onRecordReps?: (
    id: string,
    reps: number
  ) => Promise<{ ok: boolean; newlyDone: boolean }>;
}

const CATEGORY_EMOJI: Record<string, string> = {
  exercise: "🐾",
  scar: "🌸",
  care: "💖",
};

export function RehabCard({
  item,
  likeCount = 0,
  onToggle,
  onRecordReps,
}: RehabCardProps) {
  const [tapping, setTapping] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { fire, burst } = useConfetti();

  /** 有目标"次"数的训练动作才提供引导训练入口 */
  const guideAvailable =
    !!onRecordReps &&
    item.category === "exercise" &&
    item.targetUnit === "次" &&
    !!item.targetValue &&
    !item.done;

  const target = [
    item.targetValue ? `${item.targetValue} ${item.targetUnit || ""}` : null,
    item.targetSets && item.targetSets > 1 ? `× ${item.targetSets} 组` : null,
  ]
    .filter(Boolean)
    .join(" ");

  /**
   * 多组语义：targetValue 是"一组几次"，targetSets 是这个时段要做几组。
   * 引导浮层每次只带你练满一组，练完回到卡片再开下一组，
   * 所以传给浮层的是组内进度而不是全天累计。
   */
  const setSize = item.targetValue ?? 0;
  const setsPlanned = Math.max(item.targetSets ?? 1, 1);
  const multiSet = setsPlanned > 1;
  /** 已练满的组数；整条已打卡即视作全部完成（手动打勾时库里没有组数明细） */
  const setsDone = item.done
    ? setsPlanned
    : Math.min(item.completedSets, setsPlanned);
  /** 接下来要练的是第几组（已全部练满时停在最后一组） */
  const nextSet = Math.min(setsDone + 1, setsPlanned);
  const setProgress =
    setSize > 0 ? item.completedValue % setSize : item.completedValue;

  function handleToggle() {
    if (!item.done) {
      setTapping(true);
      fire();
      popSticker("checkin"); // 完成打卡时弹一张鼓励贴纸
      setTimeout(() => setTapping(false), 600);
    }
    onToggle(item.id);
  }

  async function handleGuideFinish(reps: number) {
    setGuideOpen(false);
    if (reps <= 0 || !onRecordReps) return;
    const res = await onRecordReps(item.id, reps);
    // 引导练着练着刚好达到目标次数：像手动打勾一样庆祝一下
    if (res.ok && res.newlyDone) {
      fire();
      popSticker("checkin");
    }
  }

  return (
    <div
      className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all ${
        item.done
          ? "bg-mint/25 border-transparent"
          : "bg-white border-peach"
      }`}
    >
      <ConfettiOverlay burst={burst} />
      {/* 陪伴者点赞角标 */}
      {likeCount > 0 && (
        <span
          title={`收到 ${likeCount} 个陪伴者的鼓励赞`}
          className="absolute -top-2 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-500 text-[10px] font-bold animate-pop-in"
        >
          ❤️ {likeCount}
        </span>
      )}
      <span className="text-2xl shrink-0" aria-hidden="true">
        {CATEGORY_EMOJI[item.category] || "🐾"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className={`font-bold text-base ${
              item.done ? "text-cocoa/50" : ""
            }`}
          >
            {item.name}
          </h3>
          {target && (
            <span className="text-xs bg-peach text-ragdoll px-2 py-0.5 rounded-full whitespace-nowrap">
              {target}
            </span>
          )}
        </div>
        <p className="text-xs opacity-50 mt-0.5 truncate">{item.description}</p>
        {multiSet && (
          <p className="text-xs font-bold mt-0.5 text-ragdoll">
            组数 {setsDone} / {setsPlanned}
            {setsDone < setsPlanned ? ` · 还差 ${setsPlanned - setsDone} 组` : ""}
          </p>
        )}
        {guideAvailable && (
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-coral/15 text-coral border border-coral/30 active:scale-95 transition-all"
          >
            ▶ {multiSet ? `开始第 ${nextSet} 组训练` : "开始训练"}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={item.done ? "已打卡" : "完成打卡"}
        onClick={handleToggle}
        className={`shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${
          tapping ? "animate-tap" : ""
        } ${
          item.done
            ? "bg-mint border-mint text-cocoa shadow-[0_3px_0_rgba(92,64,51,0.12)]"
            : "bg-white border-ragdoll/40 text-ragdoll/60 shadow-[0_3px_0_rgba(201,136,107,0.2)] hover:border-ragdoll"
        }`}
      >
        <span key={item.done ? "done" : "todo"} className="animate-pop-in">
          {item.done ? "✓" : "🐾"}
        </span>
      </button>
      {guideOpen && (
        <GuidedExerciseOverlay
          name={item.name}
          target={item.targetValue}
          baseCount={setProgress}
          setLabel={multiSet ? `第 ${nextSet} 组` : "今日"}
          onFinish={handleGuideFinish}
        />
      )}
    </div>
  );
}
