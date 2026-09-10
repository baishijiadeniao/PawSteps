"use client";

/**
 * 全局表情包贴纸弹窗。
 *
 * 监听 lib/stickerPop.ts 派发的 "app:sticker-pop" 事件，
 * 在屏幕中上方短暂弹出一张随机贴纸（约 2.2s），带动画后自动消失。
 *
 * 收集册联动：
 * - 只弹"已解锁"的贴纸（挂载时拉取 /api/stickers，之后每次弹出动画结束后再刷新一次）；
 * - 刷新时若发现新解锁的贴纸，会在本次动画结束后接力播放"✨ 解锁新表情"庆祝弹窗。
 * 纯装饰层：pointer-events-none + aria-hidden，不拦截任何操作。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_STICKERS,
  pickSticker,
  STICKER_POP_EVENT,
  stickerSrc,
  type StickerName,
  type StickerScene,
} from "@/lib/stickerPop";
import { STICKER_CATALOG } from "@/lib/stickerCatalog";

/** 与 CSS 动画 sticker-pop（2.2s）对齐，略留余量 */
const POP_DURATION_MS = 2300;
/** 贴纸动画播完后，隔一小段时间再去服务器刷新解锁状态 */
const REFRESH_DELAY_MS = POP_DURATION_MS + 300;

interface PopItem {
  src: string;
  /** 解锁庆祝弹窗的文案（普通场景弹窗为空） */
  unlockLabel?: string;
}

type PopState = PopItem & { id: number; rotate: string };

interface StickersResponse {
  items: { sticker: StickerName; unlocked: boolean }[];
  newlyUnlocked: { sticker: StickerName; reason: string }[];
}

export function StickerPopup() {
  const [pop, setPop] = useState<PopState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  /** 待播放队列（场景弹窗与解锁庆祝弹窗按先后接力播放） */
  const queueRef = useRef<PopItem[]>([]);
  /** 是否有弹窗正在播放（避免队列重复启动） */
  const showingRef = useRef(false);
  /** 已解锁贴纸集合；null 表示尚未从服务器取到（临时退回完整池） */
  const unlockedRef = useRef<StickerName[] | null>(null);

  // 预加载全部贴纸，弹出时不闪白
  useEffect(() => {
    ALL_STICKERS.forEach((name) => {
      const img = new Image();
      img.src = stickerSrc(name);
    });
  }, []);

  /** 播放队列里的下一个；队列空则收起 */
  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      showingRef.current = false;
      setPop(null);
      return;
    }
    showingRef.current = true;
    seq.current += 1;
    // 随机 -7deg ~ 7deg 倾斜，让每次弹出的姿态不同
    const rotate = `${(Math.random() * 14 - 7).toFixed(1)}deg`;
    setPop({ id: seq.current, rotate, ...next });
    timer.current = setTimeout(showNext, POP_DURATION_MS);
  }, []);

  /** 入队一张贴纸；当前没在播就立刻开播 */
  const enqueue = useCallback(
    (item: PopItem) => {
      queueRef.current.push(item);
      if (!showingRef.current) showNext();
    },
    [showNext]
  );

  /** 向服务器拉取收集册数据（顺带触发解锁评估与落库） */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/stickers");
      if (!res.ok) return;
      const data = (await res.json()) as StickersResponse;
      unlockedRef.current = data.items
        .filter((i) => i.unlocked)
        .map((i) => i.sticker);
      if (data.newlyUnlocked.length > 0) {
        for (const u of data.newlyUnlocked) {
          const label = STICKER_CATALOG[u.sticker]?.label ?? "";
          enqueue({
            src: stickerSrc(u.sticker),
            unlockLabel: `✨ 解锁新表情「${label}」`,
          });
        }
      }
    } catch {
      // 网络失败静默忽略，下次弹出时会再试
    }
  }, [enqueue]);

  // 挂载时拉一次解锁状态
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onPop(e: Event) {
      const scene = (e as CustomEvent<StickerScene>).detail;
      const name = pickSticker(scene, unlockedRef.current);
      enqueue({ src: stickerSrc(name) });
      // 打卡/保存的写库请求早已发出，动画播完后刷新即可拿到新解锁
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refresh(), REFRESH_DELAY_MS);
    }

    window.addEventListener(STICKER_POP_EVENT, onPop);
    return () => {
      window.removeEventListener(STICKER_POP_EVENT, onPop);
      if (timer.current) clearTimeout(timer.current);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [enqueue, refresh]);

  if (!pop) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center"
      aria-hidden
    >
      <div
        key={pop.id}
        className="animate-sticker-pop mt-[18vh] flex flex-col items-center"
        style={{ ["--sticker-rotate" as string]: pop.rotate }}
      >
        <div
          className="h-[168px] w-[168px] bg-contain bg-center bg-no-repeat drop-shadow-[0_10px_24px_rgba(92,64,51,0.25)] sm:h-[196px] sm:w-[196px]"
          style={{ backgroundImage: `url(${pop.src})` }}
        />
        {pop.unlockLabel && (
          <div className="mt-1 rounded-full bg-white/95 px-4 py-1.5 text-sm font-bold text-cocoa shadow-[0_4px_12px_rgba(92,64,51,0.18)]">
            {pop.unlockLabel}
          </div>
        )}
      </div>
    </div>
  );
}
