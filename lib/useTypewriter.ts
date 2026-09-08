"use client";
import { useEffect, useState } from "react";

/**
 * 打字机效果：逐字显示 text，返回已显示的部分与是否完成。
 */
export function useTypewriter(text: string, speed = 45) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed: text.slice(0, count), done: count >= text.length };
}
