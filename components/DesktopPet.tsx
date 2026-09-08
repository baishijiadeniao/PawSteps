"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { CatMascot, type CatMood } from "./CatMascot";
import { useConfetti, ConfettiOverlay } from "./ConfettiBurst";
import { ENCORAGEMENTS } from "@/lib/encouragement";

const POS_KEY = "desktop-pet-pos";

const CLICK_REACTIONS: { mood: CatMood; phrase: string }[] = [
  { mood: "CHEER", phrase: "喵～" },
  { mood: "CHEER", phrase: "蹭蹭你～" },
  { mood: "GREAT", phrase: "喵嘿嘿！" },
  { mood: "CELEBRATE", phrase: "最喜欢你啦" },
  { mood: "COMFORT", phrase: "呼噜呼噜…" },
  { mood: "GREAT", phrase: "摸摸我嘛" },
];

const IDLE_PHRASES = [
  "喵？",
  "呼噜呼噜…",
  "在看什么呢？",
  "尾巴摇摇",
  "陪我待一会儿嘛",
  "喵呜～",
];

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clampPos(p: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp(p.x, 4, window.innerWidth - 90),
    y: clamp(p.y, 4, window.innerHeight - 120),
  };
}

/**
 * 右下角桌宠：坐姿布偶猫。
 * 单击=随机反应；双击=说一句鼓励话；可拖动到任意位置（记住位置）；
 * 空闲时会自己冒小气泡。
 */
export function DesktopPet() {
  const [mood, setMood] = useState<CatMood>("NORMAL");
  const [bubble, setBubble] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const { fire, burst } = useConfetti();

  const petRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);
  const wasDragged = useRef(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((text: string, ms = 2600) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  }, []);

  const setMoodTemporarily = useCallback((m: CatMood, ms = 3500) => {
    setMood(m);
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("NORMAL"), ms);
  }, []);

  // 卸载时清理计时器
  useEffect(() => {
    return () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (moodTimer.current) clearTimeout(moodTimer.current);
    };
  }, []);

  // 恢复上次保存的位置（限制在视口内）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (!saved) return;
      const { x, y } = JSON.parse(saved);
      if (typeof x !== "number" || typeof y !== "number") return;
      setPos(clampPos({ x, y }));
    } catch {
      // 忽略损坏的存储
    }
  }, []);

  // 视口变化时把猫收回屏幕内
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clampPos(p) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 空闲时自己冒泡（40~90 秒随机一次）
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      if (Math.random() < 0.25) {
        setMood("REST");
        showBubble("Zzz…", 5000);
        setTimeout(() => alive && setMood("NORMAL"), 5000);
      } else {
        showBubble(pick(IDLE_PHRASES));
      }
      timer = setTimeout(tick, 40000 + Math.random() * 50000);
    };
    timer = setTimeout(tick, 40000 + Math.random() * 50000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [showBubble]);

  function handleClick() {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    const r = pick(CLICK_REACTIONS);
    setMoodTemporarily(r.mood);
    fire();
    showBubble(r.phrase);
  }

  function handleDoubleClick() {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    setMoodTemporarily("CELEBRATE", 5000);
    fire();
    showBubble(pick(ENCORAGEMENTS), 5000);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = petRef.current?.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: rect?.left ?? 0,
      baseY: rect?.top ?? 0,
      moved: false,
    };
    // 捕获指针，拖出元素边界也能继续跟踪（jsdom 无此方法时静默跳过）
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < 6) return;
    ds.moved = true;
    const w = petRef.current?.offsetWidth ?? 80;
    const h = petRef.current?.offsetHeight ?? 104;
    setPos({
      x: clamp(ds.baseX + dx, 4, window.innerWidth - w - 4),
      y: clamp(ds.baseY + dy, 4, window.innerHeight - h - 4),
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragState.current;
    dragState.current = null;
    setDragging(false);
    if (!ds || !ds.moved) return;
    wasDragged.current = true;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    const w = petRef.current?.offsetWidth ?? 80;
    const h = petRef.current?.offsetHeight ?? 104;
    const final = {
      x: clamp(ds.baseX + dx, 4, window.innerWidth - w - 4),
      y: clamp(ds.baseY + dy, 4, window.innerHeight - h - 4),
    };
    setPos(final);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(final));
    } catch {
      // 存储不可用时忽略
    }
  }

  return (
    <div
      ref={petRef}
      role="button"
      tabIndex={0}
      aria-label="桌宠猫猫：点击互动，可拖动"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`fixed z-50 touch-none select-none cursor-grab active:cursor-grabbing rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ragdoll ${
        dragging ? "" : "transition-[left,top] duration-100"
      }`}
      style={
        pos
          ? { left: pos.x, top: pos.y }
          : { right: "1rem", bottom: "5.5rem" }
      }
    >
      <div className="relative">
        {bubble && (
          <div
            role="status"
            className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[180px] bg-white border border-peach rounded-2xl rounded-br-md px-3 py-2 text-xs text-cocoa shadow-sm animate-fade-in-up"
          >
            {bubble}
          </div>
        )}
        <ConfettiOverlay burst={burst} />
        <CatMascot mood={mood} size={72} />
      </div>
    </div>
  );
}
