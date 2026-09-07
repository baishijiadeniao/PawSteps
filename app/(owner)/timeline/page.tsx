"use client";
import { useState, useEffect } from "react";
import { TimelineForm } from "@/components/TimelineForm";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";

interface Event {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string | null;
}

const TYPE_EMOJI: Record<string, string> = {
  SURGERY: "🏥",
  FOLLOW_UP: "📋",
  PLAN_CHANGE: "📝",
  MILESTONE: "🎉",
  NOTE: "📝",
};

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/timeline");
    const data = await res.json();
    setEvents(data.events || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-xl font-bold mt-2">康复时间线</h1>
      </header>

      <div className="space-y-3 mb-4">
        {events.map((e) => (
          <div key={e.id} className="bg-peach rounded-2xl p-4 flex gap-3">
            <span className="text-2xl" aria-hidden="true">
              {TYPE_EMOJI[e.type] || "📝"}
            </span>
            <div className="flex-1">
              <p className="text-xs opacity-60">{e.date}</p>
              <p className="font-bold">{e.title}</p>
              {e.description && (
                <p className="text-sm opacity-80 mt-1">{e.description}</p>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-center opacity-50 py-8">还没有事件</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-xl bg-coral text-cocoa text-sm"
      >
        {showForm ? "取消" : "+ 添加事件"}
      </button>

      {showForm && (
        <div className="mt-4">
          <TimelineForm
            onAdded={() => {
              load();
              setShowForm(false);
            }}
          />
        </div>
      )}

      <BottomNav />
    </main>
  );
}
