"use client";
import { useState } from "react";

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
  const [bouncing, setBouncing] = useState(false);

  const target = `目标：${item.targetValue || 0} ${item.targetUnit || ""}${
    item.targetSets && item.targetSets > 1 ? ` × ${item.targetSets} 组` : ""
  }`;

  function handleToggle() {
    if (!item.done) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }
    onToggle(item.id);
  }

  return (
    <div
      className={`rounded-2xl p-4 border-2 transition-all ${
        item.done
          ? "bg-mint/40 border-mint"
          : "bg-peach border-transparent"
      } ${bouncing ? "animate-bounce" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          {CATEGORY_EMOJI[item.category] || "🐾"}
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-base">{item.name}</h3>
          <p className="text-sm opacity-70 mt-1">{item.description}</p>
          <p className="text-xs mt-2 text-ragdoll">{target}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        className={`mt-3 w-full py-2 rounded-xl text-sm font-medium ${
          item.done ? "bg-mint text-cocoa" : "bg-ragdoll text-white"
        }`}
      >
        {item.done ? "✓ 已打卡" : "完成打卡"}
      </button>
    </div>
  );
}
