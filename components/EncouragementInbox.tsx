"use client";
import { useEffect, useRef, useState } from "react";
import { stickerSrc, type StickerName } from "@/lib/stickerPop";
import { announceNewLetter } from "@/lib/letterEvent";

/**
 * 病人侧的"鼓励信收件箱"：
 * - 常驻 💌 按钮 + 未读红点，每 30 秒轮询一次 /api/encouragements/unread；
 * - 发现新增未读时拉一次信件列表，把最新一封交给桌宠播"送信"动画；
 * - 点开抽屉 = 查看留言墙 + 全部标记已读。
 */

interface LetterItem {
  id: string;
  content: string;
  emoji: StickerName | null;
  createdAt: string;
  nickname: string;
}

/** 上海时区的"M月d日 HH:mm"时间标签 */
function letterTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function EncouragementInbox() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [letters, setLetters] = useState<LetterItem[] | null>(null);
  const openRef = useRef(false);
  openRef.current = open;

  /** 拉最新一封，交给桌宠演"送信" */
  async function announceLatest() {
    try {
      const res = await fetch("/api/encouragements", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const latest: LetterItem | undefined = data.items?.[0];
      if (latest) {
        announceNewLetter({
          nickname: latest.nickname,
          snippet: latest.content.slice(0, 20),
        });
      }
    } catch {
      // 轮询是锦上添花，失败静默
    }
  }

  // 轮询未读数：数量变多且收件箱没开着时触发送信动画
  useEffect(() => {
    let alive = true;
    let prev: number | null = null;
    async function poll() {
      try {
        const res = await fetch("/api/encouragements/unread", {
          cache: "no-store",
        });
        if (!res.ok || !alive) return;
        const data = await res.json();
        const count: number = data.count ?? 0;
        if (prev !== null && count > prev && !openRef.current) {
          void announceLatest();
        }
        prev = count;
        setUnread(count);
      } catch {
        // 网络抖动忽略，下一轮再试
      }
    }
    void poll();
    const id = setInterval(poll, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  /** 打开抽屉：加载留言墙并把全部标为已读 */
  async function handleOpen() {
    setOpen(true);
    try {
      const res = await fetch("/api/encouragements", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLetters(data.items ?? []);
      }
      await fetch("/api/encouragements/read", { method: "POST" });
      setUnread(0);
    } catch {
      setLetters([]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`鼓励信收件箱${unread > 0 ? `，${unread} 封未读` : ""}`}
        className="relative w-10 h-10 rounded-full bg-white border-2 border-peach flex items-center justify-center text-lg shadow-[0_3px_0_rgba(201,136,107,0.2)] active:scale-90 transition-transform"
      >
        💌
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pop-in">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-label="鼓励留言墙"
        >
          {/* 点遮罩关闭 */}
          <button
            type="button"
            aria-label="关闭收件箱"
            className="absolute inset-0 bg-cocoa/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-peach/40 rounded-t-3xl p-5 pb-10 max-h-[75vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">TA 们送来的鼓励</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="w-8 h-8 rounded-full bg-white border-2 border-peach text-cocoa/60"
              >
                ✕
              </button>
            </div>
            {letters === null ? (
              <p className="text-sm opacity-50 py-6 text-center">加载中…</p>
            ) : letters.length === 0 ? (
              <p className="text-sm opacity-50 py-6 text-center">
                还没有收到鼓励信。邀请亲友成为陪伴者，让他们为你打气吧。
              </p>
            ) : (
              <ul className="space-y-3">
                {letters.map((m) => (
                  <li
                    key={m.id}
                    className="bg-white rounded-2xl p-3 flex items-start gap-3"
                  >
                    {m.emoji && (
                      <img
                        src={stickerSrc(m.emoji)}
                        alt=""
                        width={48}
                        height={48}
                        draggable={false}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 select-none"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm break-words">{m.content}</p>
                      <p className="text-[10px] opacity-40 mt-1">
                        来自「{m.nickname}」 · {letterTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
