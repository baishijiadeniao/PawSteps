"use client";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (mood: "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS") => void;
}

const MOODS = [
  { value: "GREAT", emoji: "😻", label: "棒极了" },
  { value: "GOOD", emoji: "😺", label: "还不错" },
  { value: "OK", emoji: "😸", label: "还行" },
  { value: "DOWN", emoji: "🙀", label: "有点糟" },
  { value: "ANXIOUS", emoji: "😿", label: "焦虑了" },
] as const;

export function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onSelect(m.value)}
          className={`flex flex-col items-center py-3 rounded-xl ${
            selected === m.value ? "bg-coral ring-2 ring-ragdoll" : "bg-peach"
          }`}
        >
          <span className="text-2xl" aria-hidden="true">
            {m.emoji}
          </span>
          <span className="text-xs mt-1">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
