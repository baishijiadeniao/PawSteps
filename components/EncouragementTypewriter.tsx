"use client";
import { useTypewriter } from "@/lib/useTypewriter";

/**
 * 鼓励语打字机：逐字显示当天鼓励语，末尾带闪烁光标。
 */
export function EncouragementTypewriter({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text);
  return (
    <p className="text-sm mt-3 italic text-ragdoll min-h-10">
      &ldquo;{displayed}
      <span
        className={`inline-block w-[2px] h-4 bg-ragdoll ml-0.5 align-[-2px] ${
          done ? "animate-caret" : ""
        }`}
        aria-hidden="true"
      />
      &rdquo;
    </p>
  );
}
