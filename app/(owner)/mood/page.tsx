"use client";
import { useState, useEffect } from "react";
import { MoodSelector } from "@/components/MoodSelector";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot, type CatMood } from "@/components/CatMascot";
import { useConfetti, ConfettiOverlay } from "@/components/ConfettiBurst";

type Mood = "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS";

interface MoodLogEntry {
  date: string;
  mood: Mood;
  note: string | null;
}

const MOOD_LABEL: Record<Mood, string> = {
  GREAT: "棒极了",
  GOOD: "还不错",
  OK: "还行",
  DOWN: "有点糟",
  ANXIOUS: "焦虑了",
};

const MOOD_CAT: Record<Mood, CatMood> = {
  GREAT: "GREAT",
  GOOD: "GOOD",
  OK: "OKAY",
  DOWN: "DOWN",
  ANXIOUS: "ANXIOUS",
};

export default function MoodPage() {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<MoodLogEntry[]>([]);
  const { fire, burst } = useConfetti();

  // 今天日期（与 lib/date.getToday 一致：Shanghai tz）
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mood?days=7")
      .then((r) => r.json())
      .then((d: { logs?: MoodLogEntry[] }) => {
        if (cancelled) return;
        const logs = d.logs || [];
        setHistory(logs);
        const todayLog = logs.find((l) => l.date === today);
        if (todayLog) {
          setSelected(todayLog.mood);
          setNote(todayLog.note || "");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [today]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: today,
        mood: selected,
        note: note || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      fire();
      // 刷新历史
      const d = await fetch("/api/mood?days=7").then((r) => r.json());
      setHistory(d.logs || []);
    }
  }

  return (
    <main className="min-h-screen pb-24 px-4 py-6">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-xl font-bold mt-2">今天感觉怎么样？</h1>
      </header>

      <MoodSelector selected={selected} onSelect={setSelected} />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="想说点什么吗？（可选）"
        className="w-full mt-4 p-3 rounded-2xl bg-peach border-none focus:outline-none min-h-24 resize-none"
      />

      <div className="relative">
        <ConfettiOverlay burst={burst} />
        <button
          type="button"
          onClick={save}
          disabled={!selected || saving}
          className="w-full mt-4 py-3 rounded-2xl bg-ragdoll text-white disabled:opacity-50 transition-transform active:scale-95"
        >
          {saving ? "保存中…" : "保存今天的心情"}
        </button>
      </div>

      {saved && (
        <p className="text-center mt-2 text-sm text-mint animate-pop-in">
          🐱 已保存
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold mb-3">最近 7 天</h2>
        <div className="space-y-1">
          {history.map((h) => (
            <div
              key={h.date}
              className="flex justify-between items-center py-2 border-b border-peach text-sm"
            >
              <span>{h.date}</span>
              <span className="flex items-center gap-2">
                <CatMascot mood={MOOD_CAT[h.mood] || "NORMAL"} size={28} />
                {MOOD_LABEL[h.mood] || h.mood}
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-center text-sm opacity-50 py-4">还没有记录</p>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
