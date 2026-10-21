"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stickerSrc, type StickerName } from "@/lib/stickerPop";
import type { CareTaskCard } from "@/lib/companionService";

/**
 * 陪伴者视图的交互区（只读展示 + 两个动作）：
 * 1. 今日任务清单：不能打卡，但可以给完成的项目点 ❤️ 鼓励；
 * 2. 写鼓励：文字 + 可选贴纸，送出后进入下方"送出历史"。
 * 病人近况（连胜、心情、7 天概览）由服务端直渲，本组件不请求。
 */

/** 留言可携带的鼓励贴纸池（从全部贴纸里挑语义最贴切的 8 张） */
const EMOJI_CHOICES: StickerName[] = [
  "you_are_the_best",
  "cheer_cheer",
  "get_better",
  "with_you",
  "super_brave",
  "big_hug",
  "pat_pat",
  "better_today",
];

/** 与病人端 RehabCard 一致的分类图标 */
const CATEGORY_EMOJI: Record<string, string> = {
  exercise: "🐾",
  scar: "🌸",
  care: "💖",
};

interface MessageItem {
  id: string;
  content: string;
  emoji: StickerName | null;
  timeLabel: string;
  read: boolean;
}

interface CarePanelProps {
  nickname: string;
  tasks: CareTaskCard[];
  messages: MessageItem[];
}

/** 点赞状态：logId -> { liked, count } */
type LikeState = Record<string, { liked: boolean; count: number }>;

export function CarePanel({ nickname, tasks, messages }: CarePanelProps) {
  const router = useRouter();

  // 点赞状态本地化：初始值来自服务端渲染数据
  const [likes, setLikes] = useState<LikeState>(() => {
    const init: LikeState = {};
    for (const t of tasks) {
      if (t.logId) init[t.logId] = { liked: t.likedByMe, count: t.likeCount };
    }
    return init;
  });
  const [likingId, setLikingId] = useState<string | null>(null);

  // 送出历史：新留言会插到最前
  const [history, setHistory] = useState<MessageItem[]>(messages);
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState<StickerName | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  async function toggleLike(logId: string) {
    if (likingId) return;
    setLikingId(logId);
    try {
      const res = await fetch(`/api/care/rehab/${logId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLikes((prev) => ({
          ...prev,
          [logId]: { liked: data.liked, count: data.count },
        }));
      }
    } catch {
      // 网络错误时保持原状，静默即可（陪伴者侧无关键操作）
    } finally {
      setLikingId(null);
    }
  }

  async function sendEncouragement(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !content.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/care/encouragements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        // 插到自己的送出历史顶部，"刚刚" + 未读
        setHistory((prev) => [
          { id: data.id, content: content.trim(), emoji, timeLabel: "刚刚", read: false },
          ...prev,
        ]);
        setContent("");
        setEmoji(null);
      } else {
        setSendError(data.error || "送出失败，请重试");
      }
    } catch {
      setSendError("网络错误，请重试");
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await fetch("/api/care/logout", { method: "POST" });
    router.push("/care/login");
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      {/* 今日任务（只读 + 点赞） */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">今日康复任务</h2>
          <span className="text-xs opacity-50">
            已完成 {doneCount} / {tasks.length}
          </span>
        </div>
        <ul className="space-y-2">
          {tasks.map((t) => {
            const like = t.logId ? likes[t.logId] : undefined;
            return (
              <li
                key={t.name}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border-2 ${
                  t.done ? "bg-mint/25 border-transparent" : "bg-white/60 border-peach/50"
                }`}
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  {CATEGORY_EMOJI[t.category] || "🐾"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${t.done ? "text-cocoa/50" : ""}`}>
                    {t.name}
                  </p>
                  <p className="text-[11px] opacity-50 truncate">
                    {t.description}
                    {t.targetSets && t.targetSets > 1
                      ? ` · ${t.completedSets}/${t.targetSets} 组`
                      : ""}
                  </p>
                </div>
                {t.done ? (
                  <span className="shrink-0 text-cocoa/40 text-lg" aria-label="已完成">
                    ✓
                  </span>
                ) : (
                  <span
                    className="shrink-0 w-7 h-7 rounded-full border-2 border-ragdoll/25 inline-block"
                    aria-label="未完成"
                  />
                )}
                {/* 有点卡记录才能收赞 */}
                {t.logId && (
                  <button
                    type="button"
                    onClick={() => toggleLike(t.logId as string)}
                    disabled={likingId !== null}
                    aria-label={like?.liked ? "取消点赞" : "为这条打卡点赞"}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all active:scale-90 border-2 ${
                      like?.liked
                        ? "bg-rose-100 border-rose-300 text-rose-500"
                        : "bg-white border-peach text-cocoa/50 hover:border-ragdoll/50"
                    }`}
                  >
                    ❤️{like && like.count > 0 ? ` ${like.count}` : ""}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] opacity-40 mt-2">
          你可以为完成的打卡点 ❤️，TA 会在小窝里看到你们的心意
        </p>
      </section>

      {/* 写鼓励 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-2">给 TA 写句鼓励</h2>
        <form onSubmit={sendEncouragement}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder={`以「${nickname}」的身份说点什么…`}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border-2 border-peach bg-white text-cocoa text-sm resize-none placeholder:text-cocoa/35 focus:outline-none focus:border-ragdoll transition-colors"
          />
          <div className="flex items-center justify-between mt-1 mb-3">
            <p className="text-[10px] opacity-40">带上一张贴纸，让鼓励更具体</p>
            <p className="text-[10px] opacity-50">{content.length}/200</p>
          </div>
          {/* 贴纸单选 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {EMOJI_CHOICES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setEmoji(emoji === name ? null : name)}
                aria-label={`贴纸 ${name}`}
                aria-pressed={emoji === name}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all active:scale-90 ${
                  emoji === name
                    ? "border-ragdoll shadow-[0_0_0_2px_rgba(201,136,107,0.3)]"
                    : "border-peach/60 opacity-80 hover:opacity-100"
                }`}
              >
                <img
                  src={stickerSrc(name)}
                  alt={name}
                  width={44}
                  height={44}
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
              </button>
            ))}
          </div>
          {sendError && <p className="text-sm text-red-500 mb-2">{sendError}</p>}
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="w-full py-3 rounded-2xl bg-ragdoll text-white font-medium disabled:opacity-50"
          >
            {sending ? "送出中…" : "送出鼓励 💌"}
          </button>
        </form>
      </section>

      {/* 送出历史 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-3">我送出的鼓励</h2>
        {history.length === 0 ? (
          <p className="text-sm opacity-50">还没有送出过鼓励，写第一条吧</p>
        ) : (
          <ul className="space-y-3">
            {history.map((m) => (
              <li key={m.id} className="flex items-start gap-2">
                {m.emoji ? (
                  <img
                    src={stickerSrc(m.emoji)}
                    alt=""
                    width={40}
                    height={40}
                    draggable={false}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 select-none"
                  />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{m.content}</p>
                  <p className="text-[10px] opacity-40 mt-0.5">
                    {m.timeLabel}
                    {m.read ? " · TA 已读" : " · 等待送达"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 退出 */}
      <div className="text-center">
        <button
          type="button"
          onClick={logout}
          className="text-xs opacity-50 underline underline-offset-4 hover:opacity-80"
        >
          退出陪伴视角
        </button>
      </div>
    </>
  );
}
