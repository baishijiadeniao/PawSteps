"use client";
import { useState } from "react";
import { useConfetti, ConfettiOverlay } from "./ConfettiBurst";
import { popSticker } from "@/lib/stickerPop";

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
  onToggle: (id: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  exercise: "🐾",
  scar: "🌸",
  care: "💖",
};

export function RehabCard({ item, onToggle }: RehabCardProps) {
  const [tapping, setTapping] = useState(false);
  const { fire, burst } = useConfetti();

  const target = [
    item.targetValue ? `${item.targetValue} ${item.targetUnit || ""}` : null,
    item.targetSets && item.targetSets > 1 ? `× ${item.targetSets} 组` : null,
  ]
    .filter(Boolean)
    .join(" ");

  function handleToggle() {
    if (!item.done) {
      setTapping(true);
      fire();
      popSticker("checkin"); // 完成打卡时弹一张鼓励贴纸
      setTimeout(() => setTapping(false), 600);
    }
    onToggle(item.id);
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
    </div>
  );
}
