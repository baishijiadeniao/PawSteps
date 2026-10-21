"use client";
import { Check } from "lucide-react";
import { stickerSrc, type StickerName } from "@/lib/stickerPop";

export type MoodValue = "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (mood: MoodValue) => void;
  /** 每个心情档位对应的贴纸：由服务端按场景池确定性挑选（图随情绪固定） */
  stickers: Record<MoodValue, StickerName>;
}

/**
 * label 是主文案，hint 是一行小字补充。
 * 两者必须分属不同元素：测试用 getByText(label) 精确定位，合并写会让断言匹配不到。
 */
const MOODS = [
  { value: "GREAT", label: "棒极了", hint: "心情超好" },
  { value: "GOOD", label: "还不错", hint: "挺舒服" },
  { value: "OK", label: "还行", hint: "平平淡淡" },
  { value: "DOWN", label: "有点糟", hint: "不太开心" },
  { value: "ANXIOUS", label: "焦虑了", hint: "有点紧张" },
] as const;

export function MoodSelector({ selected, onSelect, stickers }: MoodSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {MOODS.map((m) => {
        const isSelected = selected === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onSelect(m.value)}
            aria-pressed={isSelected}
            className={`relative flex flex-col items-center gap-1 px-1 py-4 rounded-3xl border transition-all duration-150 active:scale-95 ${
              isSelected
                ? "bg-coral ring-2 ring-ragdoll border-transparent shadow-lg -translate-y-0.5"
                : "bg-white border-peach hover:border-coral"
            } w-[calc((100%-1rem)/3)]`}
          >
            <span className={isSelected ? "animate-tap" : ""}>
              <img
                src={stickerSrc(stickers[m.value])}
                alt=""
                width={52}
                height={52}
                className="object-contain"
                draggable={false}
                /* 贴纸原图宽高比各异，preflight 的 img{height:auto} 会按图缩放，
                   必须用内联样式锁死盒子，文字才不会跟着图片高低错位 */
                style={{ width: 52, height: 52 }}
              />
            </span>
            <span className="text-sm font-fun leading-none">{m.label}</span>
            <span
              className={`text-[11px] leading-none ${
                isSelected ? "text-cocoa/70" : "text-cocoa/45"
              }`}
            >
              {m.hint}
            </span>
            {isSelected && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ragdoll text-white">
                <Check size={13} strokeWidth={3} aria-hidden />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
