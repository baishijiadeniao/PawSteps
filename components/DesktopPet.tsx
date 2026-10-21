"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatedCat, PET_POSES, type PetPose, type PetShadow } from "./AnimatedCat";
import { useConfetti, ConfettiOverlay } from "./ConfettiBurst";
import { ENCORAGEMENTS } from "@/lib/encouragement";
import { PET_CLICK_REACTIONS } from "@/lib/petClickPhrases";
import { ALL_DONE_EVENT } from "@/lib/stickerPop";
import { NEW_LETTER_EVENT, type NewLetterDetail } from "@/lib/letterEvent";
import type { PetMood } from "@/lib/stickerService";

const POS_KEY = "desktop-pet-pos";

/** 待机时会随机切换的坐姿（平常态） */
const SIT_POSES: PetPose[] = ["sit", "tilt", "look", "sidesit", "groom", "loaf"];
/** 连胜活泼态：更调皮的小动作 */
const HYPER_SIT_POSES: PetPose[] = ["tilt", "look", "giggle", "content", "wave", "playbow"];
/** 没打卡的发蔫态：懒得动，趴着等 */
const DROOPY_SIT_POSES: PetPose[] = ["loaf", "sidesit", "sit"];
/** 走路时交替的两张站姿 */
const WALK_POSES: PetPose[] = ["standwave", "dance"];

const IDLE_PHRASES = [
  "喵？",
  "呼噜呼噜…",
  "在看什么呢？",
  "尾巴摇摇",
  "陪我待一会儿嘛",
  "喵呜～",
];

/** 发蔫等待中的小猫会嘀咕的话（提醒去打卡） */
const DROOPY_PHRASES = [
  "今天还没有打卡喵…",
  "呜呜…等你完成任务一起玩",
  "趴在这里等你哦",
  "做完康复我就精神了！",
];

/** 连胜活泼小猫的话 */
const HYPER_PHRASES = [
  "今天状态超好！",
  "连胜中，继续保持！",
  "你超厉害的喵！",
  "爪印盖章！🐾",
];

type Behavior = "idle" | "wander" | "sleep" | "carried" | "celebrate";

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
 * 右下角桌宠：贴纸布偶猫（public/pet/ 18 张姿势图）。
 * 待机呼吸+随机换姿势；偶尔蹦跳散步换位置；久不理它会蜷起来睡觉冒 Zzz；
 * 单击=随机反应姿势+气泡+彩带；双击=抱心+鼓励话；可拖动（拖动时四脚朝天被拎走）。
 *
 * 与康复打卡联动（GET /api/pet-status）：
 * - droopy（今天/昨天都没打卡）：发蔫趴着等、不散步、嘀咕催打卡；
 * - hyper（连续打卡 >=3 天）：动作更活泼、换姿势更勤快；
 * - 收到 "app:all-done" 事件（当天任务全部完成）：跳一段庆祝舞。
 */
export function DesktopPet() {
  const [pose, setPose] = useState<PetPose>("sit");
  const [anim, setAnim] = useState("animate-pet-breathe");
  const [shadow, setShadow] = useState<PetShadow>("normal");
  const [flip, setFlip] = useState(false);
  const [behavior, setBehavior] = useState<Behavior>("idle");
  const [wanderMs, setWanderMs] = useState(1800);
  const [bubble, setBubble] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** 打卡联动情绪：发蔫 / 平常 / 活泼 */
  const [mood, setMood] = useState<PetMood>("normal");
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
  const engineTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const behaviorRef = useRef<Behavior>("idle");
  const draggingRef = useRef(false);
  const lastInteract = useRef(Date.now());

  behaviorRef.current = behavior;
  draggingRef.current = dragging;

  /** 引擎计时器：行为切换时不清，只在卸载时清 */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    engineTimers.current.push(id);
    return id;
  }, []);

  const showBubble = useCallback((text: string, ms = 2600) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  }, []);

  const settle = useCallback(
    (ms = 2600) => {
      later(() => {
        if (behaviorRef.current === "idle") {
          setPose("sit");
          setAnim("animate-pet-breathe");
        }
      }, ms);
    },
    [later]
  );

  const wake = useCallback(() => {
    setBehavior("idle");
    setPose("sit");
    setAnim("animate-pet-breathe");
    setShadow("normal");
  }, []);

  /** 从服务器拉取打卡联动情绪（发蔫/平常/活泼） */
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pet-status");
      if (!res.ok) return;
      const data = (await res.json()) as { mood?: PetMood };
      if (data.mood) setMood(data.mood);
    } catch {
      // 网络不可用时保持当前情绪
    }
  }, []);

  /** 全部完成庆祝舞：cheer → dance → giggle → heart，全程撒彩带冒气泡 */
  const celebrate = useCallback(() => {
    if (behaviorRef.current === "carried") return; // 被拎着时不打断
    lastInteract.current = Date.now();
    setBehavior("celebrate");
    fire();
    const steps: { pose: PetPose; anim: string; bubble?: string; ms: number }[] =
      [
        { pose: "cheer", anim: "animate-pet-hop", bubble: "今天全部完成啦！🎉", ms: 1100 },
        { pose: "dance", anim: "animate-pet-wiggle", ms: 1100 },
        { pose: "giggle", anim: "animate-pet-hop", ms: 1000 },
        { pose: "heart", anim: "animate-pet-wiggle", bubble: "小猫为你骄傲！", ms: 1300 },
      ];
    let acc = 0;
    for (const step of steps) {
      const at = acc;
      later(() => {
        setPose(step.pose);
        setAnim(step.anim);
        if (step.bubble) showBubble(step.bubble, step.ms);
      }, at);
      acc += step.ms;
    }
    later(() => {
      setBehavior("idle");
      setPose("sit");
      setAnim("animate-pet-breathe");
      void refreshStatus(); // 庆祝完可能刚凑出新连胜，刷新情绪
    }, acc);
  }, [fire, later, refreshStatus, showBubble]);

  /** 收到"新来信"广播：比心姿势 + 冒泡报送信人（被拎走时只冒泡不变姿势） */
  const deliverLetter = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent<NewLetterDetail>).detail;
      lastInteract.current = Date.now();
      const message = `${detail?.nickname ?? "有人"} 送信来啦 💌`;
      if (behaviorRef.current !== "carried") {
        setPose("heart");
        setAnim("animate-pet-wiggle");
        fire();
        settle(3200);
      }
      showBubble(message, 3600);
    },
    [fire, settle, showBubble]
  );

  useEffect(() => {
    window.addEventListener(NEW_LETTER_EVENT, deliverLetter);
    return () => window.removeEventListener(NEW_LETTER_EVENT, deliverLetter);
  }, [deliverLetter]);

  // 卸载时清理所有计时器
  useEffect(() => {
    const timers = engineTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  // 预加载全部姿势图，切换时不闪
  useEffect(() => {
    PET_POSES.forEach((p) => {
      const img = new Image();
      img.src = `/pet/${p}.png`;
    });
  }, []);

  // 挂载时拉一次打卡联动情绪
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  // 收到"当天全部完成"广播 → 跳庆祝舞
  useEffect(() => {
    window.addEventListener(ALL_DONE_EVENT, celebrate);
    return () => window.removeEventListener(ALL_DONE_EVENT, celebrate);
  }, [celebrate]);

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

  // 待机小动作：每隔几秒换一个坐姿（姿势池与频率随情绪变化），换姿势时轻轻弹一下
  useEffect(() => {
    if (behavior !== "idle") return;
    const sitPool =
      mood === "hyper" ? HYPER_SIT_POSES : mood === "droopy" ? DROOPY_SIT_POSES : SIT_POSES;
    // 活泼时勤快换姿势，发蔫时半天不动一下
    const base = mood === "hyper" ? 2600 : mood === "droopy" ? 7000 : 3800;
    const spread = mood === "hyper" ? 3000 : mood === "droopy" ? 6000 : 4200;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        setPose(pick(sitPool));
        setAnim("animate-pet-squash");
        setTimeout(() => alive && setAnim("animate-pet-breathe"), 460);
        loop();
      }, base + Math.random() * spread);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [behavior, mood]);

  // 偶尔散步：蹦跳着走到屏幕另一个位置（发蔫时不散步，原地趴着等你打卡）
  useEffect(() => {
    if (behavior !== "idle" || mood === "droopy") return;
    const start = setTimeout(() => {
      if (draggingRef.current || behaviorRef.current !== "idle") return;
      const rect = petRef.current?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width || 96;
      const maxX = window.innerWidth - w - 8;
      if (maxX <= 8) return;
      const target = clamp(8 + Math.random() * (maxX - 8), 4, maxX);
      if (Math.abs(target - rect.left) < 48) return;
      const dur = 1500 + Math.random() * 1500;
      setWanderMs(dur);
      setFlip(target < rect.left);
      setBehavior("wander");
      setPose(pick(WALK_POSES));
      setAnim("animate-pet-walk");
      setShadow("walk");
      setPos({ x: target, y: rect.top });
      later(() => {
        setBehavior("idle");
        setAnim("animate-pet-hop");
        setShadow("normal");
        later(() => {
          if (behaviorRef.current === "idle") setAnim("animate-pet-breathe");
        }, 520);
      }, dur);
    }, 20000 + Math.random() * 20000);
    return () => clearTimeout(start);
  }, [behavior, later, mood]);

  // 超过一分钟没人理就蜷起来睡觉
  useEffect(() => {
    const id = setInterval(() => {
      if (
        behaviorRef.current === "idle" &&
        Date.now() - lastInteract.current > 60000
      ) {
        setBehavior("sleep");
        setPose("sleep");
        setAnim("animate-pet-breathe-slow");
        setShadow("normal");
      }
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // 空闲时自己冒泡（40~90 秒随机一次）
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      if (behaviorRef.current !== "sleep") {
        if (Math.random() < 0.25) {
          setBehavior("sleep");
          setPose("sleep");
          setAnim("animate-pet-breathe-slow");
          showBubble("Zzz…", 5000);
          setTimeout(() => {
            if (alive && behaviorRef.current === "sleep") wake();
          }, 5000);
        } else {
          // 冒泡文案随情绪变化：发蔫时顺便催打卡
          const phrases =
            mood === "droopy"
              ? DROOPY_PHRASES
              : mood === "hyper"
                ? HYPER_PHRASES
                : IDLE_PHRASES;
          showBubble(pick(phrases));
        }
      }
      timer = setTimeout(tick, 40000 + Math.random() * 50000);
    };
    timer = setTimeout(tick, 40000 + Math.random() * 50000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mood, showBubble, wake]);

  function handleClick() {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    lastInteract.current = Date.now();
    if (behaviorRef.current === "celebrate") return; // 庆祝舞不被打断
    if (behaviorRef.current === "sleep") {
      wake();
      showBubble("喵呜…刚睡着嘛");
      return;
    }
    const r = pick(PET_CLICK_REACTIONS);
    setPose(r.pose);
    setAnim(pick(["animate-pet-wiggle", "animate-pet-hop"]));
    fire();
    showBubble(pick(r.phrases));
    settle();
  }

  function handleDoubleClick() {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }
    lastInteract.current = Date.now();
    if (behaviorRef.current === "celebrate") return; // 庆祝舞不被打断
    if (behaviorRef.current === "sleep") wake();
    setPose("cheer");
    setAnim("animate-pet-wiggle");
    fire();
    showBubble(pick(ENCORAGEMENTS), 5000);
    settle(3200);
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
    lastInteract.current = Date.now();
    if (behaviorRef.current === "sleep") wake();
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < 6) return;
    if (!ds.moved) {
      // 被拎起来了：四脚朝天
      setBehavior("carried");
      setPose("roll");
      setAnim("animate-pet-dangle");
      setShadow("hidden");
    }
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
    // 落地弹一下
    setBehavior("idle");
    setPose("sit");
    setAnim("animate-pet-squash");
    setShadow("normal");
    later(() => {
      if (behaviorRef.current === "idle") setAnim("animate-pet-breathe");
    }, 460);
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
        dragging ? "" : "transition-[left,top] ease-in-out"
      }`}
      style={{
        ...(pos ? { left: pos.x, top: pos.y } : { right: "1rem", bottom: "5.5rem" }),
        transitionDuration: dragging ? "0ms" : behavior === "wander" ? `${wanderMs}ms` : "120ms",
      }}
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
        {behavior === "sleep" && (
          <span aria-hidden className="pointer-events-none absolute -top-4 right-1 font-fun text-cocoa/60">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute animate-pet-zzz"
                style={{
                  right: -i * 6,
                  fontSize: 10 + i * 3,
                  animationDelay: `${i * 0.8}s`,
                }}
              >
                z
              </span>
            ))}
          </span>
        )}
        <ConfettiOverlay burst={burst} />
        <AnimatedCat pose={pose} size={104} flip={flip} anim={anim} shadow={shadow} />
      </div>
    </div>
  );
}
