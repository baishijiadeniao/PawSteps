"use client";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (mood: "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS") => void;
}

// 十一的 5 张手绘贴纸（裁剪自 picture/5.jpg），与心情档位一一对应
export const MOOD_STICKERS: Record<"GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS", string> = {
  GREAT: "/cats/moods/great.png",
  GOOD: "/cats/moods/good.png",
  OK: "/cats/moods/okay.png",
  DOWN: "/cats/moods/down.png",
  ANXIOUS: "/cats/moods/anxious.png",
};

const MOODS = [
  { value: "GREAT", label: "棒极了" },
  { value: "GOOD", label: "还不错" },
  { value: "OK", label: "还行" },
  { value: "DOWN", label: "有点糟" },
  { value: "ANXIOUS", label: "焦虑了" },
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
            <img src={MOOD_STICKERS[m.value]} alt="" width={44} height={44} className="object-contain" draggable={false} />
          </span>
          <span className="text-xs mt-1">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
