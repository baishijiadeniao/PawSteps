import { redirect } from "next/navigation";
import { requireCompanion } from "@/lib/auth";
import {
  getPatientSummary,
  touchLastSeen,
  listMyEncouragements,
} from "@/lib/companionService";
import { getToday } from "@/lib/date";
import { listWaitingWishes } from "@/lib/wishService";
import { CarePanel } from "@/components/CarePanel";

/** 心情档位 → 中文文案（与病人端 MoodSelector 保持一致） */
const MOOD_LABELS: Record<string, string> = {
  GREAT: "棒极了",
  GOOD: "还不错",
  OK: "还行",
  DOWN: "有点糟",
  ANXIOUS: "焦虑了",
};

/** 上海时区的"今天/月日 + 时分"标签 */
function timeLabel(d: Date): string {
  const tz = "Asia/Shanghai";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const hm = new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  if (day === getToday()) return `今天 ${hm}`;
  const md = new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    month: "numeric",
    day: "numeric",
  }).format(d);
  return `${md} ${hm}`;
}

/**
 * 陪伴者总览（服务端直渲，无独立 overview API）：
 * 病人近况全部可见（含备注），交互部分（点赞/写鼓励）交给 <CarePanel />。
 */
export default async function CarePage() {
  const auth = await requireCompanion();
  // middleware 只查 cookie 存在性；陪伴者被移除后会话即刻失效，这里兜底跳登录页
  if ("redirect" in auth) redirect("/care/login");

  await touchLastSeen(auth.companion.id);
  const [summary, myMessages, waitingWishes] = await Promise.all([
    getPatientSummary(auth.companion.id),
    listMyEncouragements(auth.companion.id),
    listWaitingWishes(),
  ]);

  const doneCount = summary.todayTasks.filter((t) => t.done).length;
  const total = summary.todayTasks.length;

  return (
    <main className="min-h-screen pb-16 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-fun">十一的康复近况</h1>
        <p className="text-sm opacity-70 mt-1">
          {summary.postOpDay < 0
            ? `距离手术还有 ${Math.abs(summary.postOpDay)} 天`
            : `术后第 ${summary.postOpDay} 天`}
          {" · "}
          以「{auth.companion.nickname}」的身份陪伴中
        </p>
      </header>

      {/* 概览三格 */}
      <section className="grid grid-cols-3 gap-3 mb-5">
        <div className="card-soft bg-white rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-ragdoll">
            {summary.streak}
            <span className="text-sm font-normal"> 天</span>
          </p>
          <p className="text-xs opacity-60 mt-1">连续打卡</p>
        </div>
        <div className="card-soft bg-white rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-ragdoll">
            {doneCount}
            <span className="text-sm font-normal"> / {total}</span>
          </p>
          <p className="text-xs opacity-60 mt-1">今日任务</p>
        </div>
        <div className="card-soft bg-white rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-ragdoll">
            {summary.collection.unlocked}
            <span className="text-sm font-normal"> / {summary.collection.total}</span>
          </p>
          <p className="text-xs opacity-60 mt-1">贴纸收集</p>
        </div>
      </section>

      {/* 今日心情与状态 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-2">今天的心情</h2>
        {summary.todayMood ? (
          <p className="text-sm">
            {MOOD_LABELS[summary.todayMood] ?? summary.todayMood}
          </p>
        ) : (
          <p className="text-sm opacity-50">还没有记录心情</p>
        )}
        {summary.todayStatusNote && (
          <p className="text-xs opacity-70 mt-2">
            状态备注：{summary.todayStatusNote}
          </p>
        )}
      </section>

      {/* TA 的小愿望（连续打卡 7 天赢得，等待实现） */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-2">TA 的小愿望</h2>
        {waitingWishes.length > 0 ? (
          <ul className="space-y-2">
            {waitingWishes.map((w) => (
              <li
                key={w.id}
                className="flex items-start gap-2 rounded-2xl px-3 py-2.5 bg-peach/15 border-2 border-peach/50"
              >
                <span className="text-lg shrink-0" aria-hidden="true">
                  🎈
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{w.content}</p>
                  <p className="text-[10px] opacity-40 mt-0.5">
                    连续打卡 {w.streakDays} 天赢得 · 等 TA 确认你实现啦
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-50">
            暂无待实现的愿望。连续打卡 7 天可赢得一个小愿望，帮 TA 实现吧
          </p>
        )}
      </section>

      {/* 近 7 天概览 */}
      <section className="card-soft bg-white rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-sm mb-3">最近 7 天</h2>
        <div className="flex justify-between gap-1">
          {summary.recentDays.map((d) => (
            <div key={d.date} className="text-center flex-1">
              <p className="text-[10px] opacity-50">
                {new Intl.DateTimeFormat("zh-CN", {
                  timeZone: "Asia/Shanghai",
                  weekday: "short",
                }).format(new Date(`${d.date}T12:00:00+08:00`))}
              </p>
              <p
                className={`mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  d.doneCount > 0 ? "bg-mint text-cocoa" : "bg-peach/40 text-cocoa/40"
                }`}
                title={`${d.date} 完成 ${d.doneCount} 项`}
              >
                {d.doneCount > 0 ? d.doneCount : "·"}
              </p>
              <p className="text-[10px] mt-1 h-4">
                {d.mood ? "😊" : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-40 mt-2 text-center">
          圆点数字 = 当天完成的康复项数，😊 = 当天记录过心情
        </p>
      </section>

      {/* 今日任务 + 点赞 + 鼓励表单 */}
      <CarePanel
        nickname={auth.companion.nickname}
        tasks={summary.todayTasks}
        messages={myMessages.map((m) => ({
          id: m.id,
          content: m.content,
          emoji: m.emoji,
          timeLabel: timeLabel(m.createdAt),
          read: m.readAt !== null,
        }))}
      />
    </main>
  );
}
