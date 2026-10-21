"use client";
import { useState, useEffect } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { MoodSelector, type MoodValue } from "@/components/MoodSelector";
import { BottomNav } from "@/components/BottomNav";
import { StickerImage } from "@/components/StickerImage";
import { ConfettiOverlay, useConfetti } from "@/components/ConfettiBurst";
import { popSticker, stickerSrc, type StickerName } from "@/lib/stickerPop";
import type { WeatherIcon, WeatherInfo } from "@/lib/weather";

type Mood = MoodValue;

interface MoodLogEntry {
  date: string;
  mood: Mood;
  note: string | null;
}

/** 2026-09-14 → 9月14日。本地实现，避免把 lib/date 的 zod 依赖拖进客户端包 */
function toChineseDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

const MOOD_LABEL: Record<Mood, string> = {
  GREAT: "棒极了",
  GOOD: "还不错",
  OK: "还行",
  DOWN: "有点糟",
  ANXIOUS: "焦虑了",
};

const WEATHER_ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  storm: CloudLightning,
};

/** 暖心文案：按日期轮换，同一天固定，避免每次重渲染跳字 */
const CHEERS = [
  "今天也要好好爱自己呀～",
  "不管开心不开心，我都陪着你",
  "身体在慢慢好起来，慢慢来",
  "记录下来，就是最好的照顾",
  "今天的你也很了不起呀",
];

interface MoodBoardProps {
  /** 页面头部贴纸：服务端每次打开随机挑一张已解锁的 */
  headerSticker: StickerName;
  /** 五个心情档位的贴纸：服务端按场景池确定性挑选，图随情绪固定 */
  moodStickers: Record<Mood, StickerName>;
  /** 今天（Asia/Shanghai），服务端用 lib/date.getToday 算好 */
  today: string;
  /** 星期几中文标签 */
  weekday: string;
  /** 当前天气：服务端拉取失败为 null，页面降级成只显示日期 */
  weather: WeatherInfo | null;
}

export function MoodBoard({
  headerSticker,
  moodStickers,
  today,
  weekday,
  weather,
}: MoodBoardProps) {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cheerKey, setCheerKey] = useState(0);
  const [history, setHistory] = useState<MoodLogEntry[]>([]);
  const { fire, burst } = useConfetti();

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

  // 改心情 / 改备注都算重新编辑，把上一次的保存反馈收掉
  // cheerKey 自增让头部猫咪每次点选都重播一遍"被戳到"的动效
  function select(mood: Mood) {
    setSelected(mood);
    setSaved(false);
    setError("");
    setCheerKey((k) => k + 1);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: today,
          mood: selected,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error(`保存失败 ${res.status}`);
      setSaved(true);
      fire();
      popSticker(selected); // 按心情档位弹一张陪伴贴纸
      // 刷新历史
      const d = await fetch("/api/mood?days=7").then((r) => r.json());
      setHistory(d.logs || []);
    } catch {
      setError("网络好像不太稳定，再试一次吧");
    } finally {
      setSaving(false);
    }
  }

  const WeatherIconComponent = weather ? WEATHER_ICONS[weather.icon] : null;
  const cheer = CHEERS[Number(today.slice(8)) % CHEERS.length];

  return (
    <div className="min-h-screen bg-gradient-to-b from-butter/30 via-cream to-peach/40">
      <main className="pb-24 px-4 py-6 max-w-lg mx-auto">
        {/* 日期与天气 */}
        <div className="card-soft mb-4 flex items-center justify-between rounded-3xl bg-white px-4 py-3">
          <div className="flex flex-col leading-tight">
            <span className="font-fun text-lg">{today}</span>
            <span className="text-xs opacity-60">{weekday}</span>
          </div>
          {weather && WeatherIconComponent ? (
            <span className="flex items-center gap-2 text-honey">
              <WeatherIconComponent size={26} strokeWidth={1.75} aria-hidden />
              <span className="text-sm text-cocoa">
                {weather.label}
                {weather.temperature !== null && (
                  <span className="opacity-70">
                    {" "}
                    {Math.round(weather.temperature)}°
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-xs opacity-40">天气稍后再看</span>
          )}
        </div>

        {/* 猫咪 + 暖心文案 */}
        <header className="animate-fade-in-up mb-5 rounded-3xl bg-gradient-to-br from-peach via-cream to-butter px-4 py-5 text-center">
          <div key={cheerKey} className={cheerKey > 0 ? "animate-pet-squash" : ""}>
            <StickerImage name={headerSticker} size={56} />
          </div>
          <h1 className="mt-2 font-fun text-xl">今天感觉怎么样？</h1>
          <p className="mt-1 text-sm opacity-70">{cheer}</p>
        </header>

        <section className="card-soft rounded-3xl bg-white p-4">
          <MoodSelector
            selected={selected}
            onSelect={select}
            stickers={moodStickers}
          />

          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="想说点什么吗？（可选）"
            className="mt-4 w-full min-h-24 resize-none rounded-2xl border border-peach bg-cream p-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />

          <div className="relative">
            <ConfettiOverlay burst={burst} />
            <button
              type="button"
              onClick={save}
              disabled={!selected || saving}
              className="btn-candy mt-4 w-full bg-ragdoll py-3 text-base text-white"
            >
              {saving ? "保存中…" : "保存今天的心情"}
            </button>
          </div>

          {saved && (
            <p className="animate-pop-in mt-2 text-center text-sm text-cocoa">
              🐱 已记下今天的心情
            </p>
          )}
          {error && (
            <p className="animate-pop-in mt-2 text-center text-sm text-ragdoll">
              {error}
            </p>
          )}
        </section>

        <section className="card-soft mt-6 rounded-3xl bg-white p-4">
          <h2 className="mb-2 font-fun text-base">最近 7 天</h2>
          <div>
            {history.map((h) => (
              <div
                key={h.date}
                className="flex items-center justify-between border-b border-peach py-2.5 text-sm last:border-b-0"
              >
                <span className="opacity-70">{toChineseDate(h.date)}</span>
                <span className="flex items-center gap-2">
                  <img
                    src={stickerSrc(moodStickers[h.mood])}
                    alt=""
                    width={28}
                    height={28}
                    className="object-contain"
                    /* 同 MoodSelector：锁死盒子高度，避免文字随图片比例错位 */
                    style={{ width: 28, height: 28 }}
                  />
                  {MOOD_LABEL[h.mood] || h.mood}
                </span>
              </div>
            ))}
            {history.length === 0 && (
              <p className="py-4 text-center text-sm opacity-50">还没有记录</p>
            )}
          </div>
        </section>

        <BottomNav />
      </main>
    </div>
  );
}
