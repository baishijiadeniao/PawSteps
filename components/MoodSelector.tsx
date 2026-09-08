"use client";
import { CatMascot } from "./CatMascot";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (mood: "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS") => void;
}

const MOODS = [
  { value: "GREAT", catMood: "GREAT", label: "棒极了" },
  { value: "GOOD", catMood: "GOOD", label: "还不错" },
  { value: "OK", catMood: "OKAY", label: "还行" },
  { value: "DOWN", catMood: "DOWN", label: "有点糟" },
  { value: "ANXIOUS", catMood: "ANXIOUS", label: "焦虑了" },
] as const;

export function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onSelect(m.value)}
          aria-pressed={selected === m.value}
          className={`flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${
            selected === m.value
              ? "bg-coral ring-2 ring-ragdoll border-transparent"
              : "bg-white border-peach"
          }`}
        >
          <span className={selected === m.value ? "animate-tap" : ""}>
            <CatMascot mood={m.catMood} size={44} />
          </span>
          <span className="text-xs mt-1">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
