"use client";
import { useState, useEffect, useCallback } from "react";
import { TimelineForm } from "./TimelineForm";
import { formatDate, getPostOpDay } from "@/lib/date";

type Mood = "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS";

interface MoodLogEntry {
  date: string;
  mood: Mood;
  note: string | null;
}

interface StatusEntry {
  date: string;
  energy: string | null;
  painLevel: number | null;
  swelling: number | null;
  note: string | null;
}

interface RehabCount {
  date: string;
  doneCount: number;
}

interface EventEntry {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string | null;
}

interface CalendarData {
  month: string;
  moods: MoodLogEntry[];
  statuses: StatusEntry[];
  rehabByDate: RehabCount[];
  events: EventEntry[];
}

const MOOD_LABEL: Record<Mood, { emoji: string; label: string }> = {
  GREAT: { emoji: "😻", label: "棒极了" },
  GOOD: { emoji: "😺", label: "还不错" },
  OK: { emoji: "😸", label: "还行" },
  DOWN: { emoji: "🙀", label: "有点糟" },
  ANXIOUS: { emoji: "😿", label: "焦虑了" },
};

const ENERGY_LABEL: Record<string, string> = {
  NORMAL: "🙂 正常",
  TIRED: "😴 有点累",
  PAINFUL: "😣 疼痛明显",
  REST: "🛌 想休息",
};

const TYPE_EMOJI: Record<string, string> = {
  SURGERY: "🏥",
  FOLLOW_UP: "📋",
  PLAN_CHANGE: "📝",
  MILESTONE: "🎉",
  NOTE: "📝",
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 周一起始的偏移量（周一=0 … 周日=6）
function firstWeekdayOffset(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
}

function weekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// 术后天数文案（与康复页口径一致）
function dayLabel(pod: number): string {
  if (pod < 0) return `术前 ${Math.abs(pod)} 天`;
  if (pod === 0) return "手术当天";
  return `术后第 ${pod} 天`;
}

export function CalendarView({ surgeryDate }: { surgeryDate: string }) {
  const [today] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
  );
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [data, setData] = useState<CalendarData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (m: string) => {
    const res = await fetch(`/api/calendar?month=${m}`);
    if (res.ok) {
      setData(await res.json());
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  function changeMonth(delta: number) {
    setSelected(null);
    setMonth((m) => shiftMonth(m, delta));
  }

  const moodByDate = new Map((data?.moods || []).map((m) => [m.date, m]));
  const statusByDate = new Map((data?.statuses || []).map((s) => [s.date, s]));
  const rehabByDate = new Map(
    (data?.rehabByDate || []).map((r) => [r.date, r.doneCount])
  );
  const eventsByDate = new Map<string, EventEntry[]>();
  for (const e of data?.events || []) {
    const list = eventsByDate.get(e.date) || [];
    list.push(e);
    eventsByDate.set(e.date, list);
  }

  const cells: (string | null)[] = [];
  const offset = firstWeekdayOffset(month);
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth(month); d++) {
    cells.push(`${month}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const selMood = selected ? moodByDate.get(selected) : undefined;
  const selStatus = selected ? statusByDate.get(selected) : undefined;
  const selRehab = selected ? rehabByDate.get(selected) : undefined;
  const selEvents = selected ? eventsByDate.get(selected) : undefined;

  // 今天是康复的第几天；选中日期对应的术后天数
  const todayPod = getPostOpDay(today, surgeryDate);
  const selPod = selected ? getPostOpDay(selected, surgeryDate) : null;

  return (
    <div>
      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="上个月"
          className="w-10 h-10 rounded-xl bg-peach"
        >
          ←
        </button>
        <p className="font-bold text-lg">{monthLabel(month)}</p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="下个月"
          className="w-10 h-10 rounded-xl bg-peach"
        >
          →
        </button>
      </div>

      {/* 今天是康复的第几天 */}
      <div className="text-center mb-2">
        <span className="inline-block text-xs bg-coral/40 rounded-full px-3 py-1">
          🐾 今天是{dayLabel(todayPod)}
        </span>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs opacity-50 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className="aspect-square" />;
          const day = Number(dateStr.slice(8));
          const mood = moodByDate.get(dateStr);
          const hasStatus = statusByDate.has(dateStr);
          const rehabCount = rehabByDate.get(dateStr);
          const events = eventsByDate.get(dateStr);
          const isToday = dateStr === today;
          const isSurgery = dateStr === surgeryDate;
          const isSelected = dateStr === selected;
          const isFuture = dateStr > today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelected(isSelected ? null : dateStr)}
              style={{ animationDelay: `${Math.min(i, 35) * 12}ms` }}
              className={`
                animate-fade-in-up aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 p-1 transition-colors
                ${isSelected ? "bg-peach ring-2 ring-ragdoll" : isSurgery ? "bg-coral" : "bg-white"}
                ${isToday ? "ring-1 ring-ragdoll" : ""}
                ${isFuture ? "opacity-40" : ""}
              `}
            >
              <span
                className={`text-xs leading-none ${
                  isToday ? "font-bold animate-breathe" : ""
                }`}
              >
                {day}
              </span>
              <span className="text-base leading-none" aria-hidden="true">
                {mood ? MOOD_LABEL[mood.mood].emoji : ""}
              </span>
              <span className="flex items-center gap-0.5 h-2" aria-hidden="true">
                {hasStatus && (
                  <span className="w-1.5 h-1.5 rounded-full bg-mint ring-1 ring-ragdoll/40" />
                )}
                {rehabCount && (
                  <span className="w-1.5 h-1.5 rounded-full bg-ragdoll" />
                )}
                {events && <span className="text-[10px] leading-none">{TYPE_EMOJI[events[0].type] || "📝"}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 justify-center mt-3 text-xs opacity-60">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-mint ring-1 ring-ragdoll/40" />
          状态打卡
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ragdoll" />
          训练打卡
        </span>
        <span>🏥 大事件</span>
      </div>

      {/* 选中日期的详情 */}
      {selected && (
        <div
          key={selected}
          className="animate-fade-in-up bg-white card-soft rounded-3xl p-4 mt-4"
        >
          <p className="font-bold mb-3">
            {formatDate(selected)} {weekdayName(selected)}
            {selected === surgeryDate && (
              <span className="ml-2 text-xs bg-coral px-2 py-0.5 rounded-full">
                手术日
              </span>
            )}
            {selPod != null && selPod > 0 && (
              <span className="ml-2 text-xs opacity-60">{dayLabel(selPod)}</span>
            )}
          </p>

          {!selMood && !selStatus && !selRehab && !selEvents?.length && (
            <p className="text-sm opacity-50 text-center py-4">
              这天还没有打卡记录
            </p>
          )}

          {selMood && (
            <div className="mb-3">
              <p className="text-xs opacity-50 mb-1">心情</p>
              <p className="text-sm">
                {MOOD_LABEL[selMood.mood].emoji} {MOOD_LABEL[selMood.mood].label}
              </p>
              {selMood.note && (
                <p className="text-sm opacity-70 mt-1">{selMood.note}</p>
              )}
            </div>
          )}

          {selStatus && (
            <div className="mb-3">
              <p className="text-xs opacity-50 mb-1">身体状态</p>
              <p className="text-sm">
                {selStatus.energy ? ENERGY_LABEL[selStatus.energy] || selStatus.energy : ""}
                {selStatus.painLevel != null && ` · 疼痛 ${selStatus.painLevel}/10`}
                {selStatus.swelling != null && ` · 肿胀 ${selStatus.swelling}/10`}
              </p>
              {selStatus.note && (
                <p className="text-sm opacity-70 mt-1">{selStatus.note}</p>
              )}
            </div>
          )}

          {selRehab != null && selRehab > 0 && (
            <div className="mb-3">
              <p className="text-xs opacity-50 mb-1">康复训练</p>
              <p className="text-sm">🐾 完成 {selRehab} 项</p>
            </div>
          )}

          {selEvents?.length ? (
            <div>
              <p className="text-xs opacity-50 mb-1">事件</p>
              <div className="space-y-2">
                {selEvents.map((e) => (
                  <div key={e.id} className="text-sm">
                    <p className="font-bold">
                      <span aria-hidden="true">{TYPE_EMOJI[e.type] || "📝"}</span>{" "}
                      {e.title}
                    </p>
                    {e.description && (
                      <p className="opacity-70 mt-0.5">{e.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 添加事件 */}
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="btn-candy w-full py-3 mt-4 bg-coral text-cocoa text-sm"
      >
        {showForm ? "取消" : "+ 添加事件"}
      </button>

      {showForm && (
        <div className="mt-4">
          <TimelineForm
            defaultDate={selected ?? today}
            onAdded={() => {
              load(month);
              setShowForm(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
