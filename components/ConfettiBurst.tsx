"use client";
import { useCallback, useEffect, useState } from "react";

const EMOJIS = ["🐾", "❤️", "✿", "🌸", "⭐", "💜"];

interface Particle {
  id: number;
  emoji: string;
  cx: string;
  cy: string;
  cr: string;
  delay: string;
}

interface Burst {
  id: number;
  particles: Particle[];
}

function makeParticles(count = 10): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    cx: `${Math.round((Math.random() - 0.5) * 150)}px`,
    cy: `${Math.round(-30 - Math.random() * 80)}px`,
    cr: `${Math.round((Math.random() - 0.5) * 360)}deg`,
    delay: `${(Math.random() * 0.12).toFixed(2)}s`,
  }));
}

/**
 * 撒粒子动画：调用 fire() 在挂载了 <ConfettiOverlay/> 的容器里
 * 冒出一簇小爪印/爱心，约 0.8s 后自动消失。
 */
export function useConfetti() {
  const [burst, setBurst] = useState<Burst | null>(null);

  const fire = useCallback(() => {
    setBurst({ id: Date.now(), particles: makeParticles() });
  }, []);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), 900);
    return () => clearTimeout(timer);
  }, [burst]);

  return { fire, burst };
}

export function ConfettiOverlay({ burst }: { burst: Burst | null }) {
  if (!burst) return null;
  return (
    <div
      key={burst.id}
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
      aria-hidden="true"
    >
      {burst.particles.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute text-lg"
          style={
            {
              "--cx": p.cx,
              "--cy": p.cy,
              "--cr": p.cr,
              animationDelay: p.delay,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
