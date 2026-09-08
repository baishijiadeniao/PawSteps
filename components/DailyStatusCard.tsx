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
    <div className="bg-white rounded-2xl p-4 mb-4">
      <p className="text-sm font-bold mb-3">今天状态</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {ENERGIES.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => setEnergy(e.value)}
            className={`flex flex-col items-center py-2 rounded-lg border ${
              energy === e.value
                ? "bg-coral ring-2 ring-ragdoll border-transparent"
                : "bg-white border-peach"
            }`}
          >
            <span className="text-xl" aria-hidden="true">
              {e.emoji}
            </span>
            <span className="text-xs">{e.label}</span>
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
        className="w-full py-2 rounded-xl bg-ragdoll text-white text-sm disabled:opacity-50"
      >
        {saved ? "🐱 已保存" : "保存"}
      </button>
    </div>
  );
}
