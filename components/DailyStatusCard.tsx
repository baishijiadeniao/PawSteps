"use client";
import { useState, useEffect } from "react";

const ENERGIES = [
  { value: "NORMAL", emoji: "🙂", label: "正常" },
  { value: "TIRED", emoji: "😴", label: "有点累" },
  { value: "PAINFUL", emoji: "😣", label: "疼痛明显" },
  { value: "REST", emoji: "🛌", label: "今天想休息" },
];

export function DailyStatusCard() {
  const [energy, setEnergy] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });

  useEffect(() => {
    fetch("/api/daily-status")
      .then((r) => r.json())
      .then((d: { status?: { energy?: string; painLevel?: number } | null }) => {
        if (d.status) {
          setEnergy(d.status.energy || null);
          setPainLevel(d.status.painLevel || 0);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setSaved(false);
    const res = await fetch("/api/daily-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, energy, painLevel }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!loaded) return null;

  return (
    <div className="bg-white card-soft rounded-3xl p-4 mb-4">
      <p className="text-base font-fun mb-3">今天感觉如何？</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {ENERGIES.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setEnergy(e.value)}
            className={`flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all active:scale-95 ${
              energy === e.value
                ? "bg-coral border-ragdoll scale-105 shadow-[0_4px_10px_rgba(201,136,107,0.3)]"
                : "bg-white border-peach hover:border-ragdoll/50"
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {e.emoji}
            </span>
            <span
              className={`text-xs mt-0.5 ${
                energy === e.value ? "font-bold" : "opacity-70"
              }`}
            >
              {e.label}
            </span>
          </button>
        ))}
      </div>
      <div className="mb-3">
        <p className="text-xs mb-1">疼痛：{painLevel}/10</p>
        <input
          type="range"
          min={0}
          max={10}
          value={painLevel}
          onChange={(e) => setPainLevel(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!energy}
        className="btn-candy w-full py-2 bg-ragdoll text-white text-sm"
      >
        {saved ? "🐱 已保存" : "保存今天的感觉"}
      </button>
    </div>
  );
}
