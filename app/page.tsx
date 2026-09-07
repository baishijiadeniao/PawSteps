import Link from "next/link";
import { prismaClient } from "@/lib/prisma";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase, PHASE_LABELS } from "@/lib/phase";
import { getEncouragement } from "@/lib/encouragement";
import { CatMascot } from "@/components/CatMascot";

const MOOD_LABEL: Record<string, { emoji: string; label: string }> = {
  GREAT: { emoji: "😻", label: "棒极了" },
  GOOD: { emoji: "😺", label: "还不错" },
  OK: { emoji: "😸", label: "还行" },
  DOWN: { emoji: "🙀", label: "有点糟" },
  ANXIOUS: { emoji: "😿", label: "焦虑了" },
};

export default async function Home() {
  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const encouragement = getEncouragement(today);

  // 今日心情（简略，公开：仅 emoji + label）
  const todayMood = await prismaClient.moodLog.findUnique({
    where: { date: today },
    select: { mood: true },
  });

  // 今日康复进度（只显示完成数，不显示具体动作）
  const items = await prismaClient.rehabPlanItem.findMany({
    where: { phase },
    select: { id: true },
  });
  const doneLogs = await prismaClient.rehabLog.count({
    where: { date: today, done: true },
  });

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={64} />
        <h1 className="text-2xl font-bold mt-2">十一的康复小窝</h1>
      </header>

      <section className="bg-peach rounded-2xl p-5 mb-4 text-center">
        <p className="text-3xl font-bold">
          {pod < 0
            ? `术前 ${Math.abs(pod)} 天`
            : pod === 0
              ? "手术当天"
              : `术后第 ${pod} 天`}
        </p>
        <p className="text-sm opacity-70 mt-1">{PHASE_LABELS[phase]}</p>
        <p className="text-sm mt-3 italic text-ragdoll">
          &ldquo;{encouragement}&rdquo;
        </p>
      </section>

      {todayMood && (
        <section className="bg-white rounded-2xl p-4 mb-4 text-center">
          <p className="text-xs opacity-60 mb-1">十一今天</p>
          <p className="text-2xl">
            {MOOD_LABEL[todayMood.mood]?.emoji}{" "}
            <span className="text-base">
              {MOOD_LABEL[todayMood.mood]?.label}
            </span>
          </p>
        </section>
      )}

      <section className="bg-coral/20 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold mb-2">🌱 今日康复</p>
        <p className="text-sm">
          {doneLogs} / {items.length}
        </p>
      </section>

      <section className="bg-peach rounded-2xl p-4">
        <p className="text-sm font-bold mb-2">💌 给十一的鼓励</p>
        <p className="text-sm opacity-70 mb-3">
          留下你的话，让她知道有人陪着。
        </p>
        <Link
          href="/wall"
          className="block w-full py-3 text-center rounded-xl bg-ragdoll text-white text-sm"
        >
          留下一句话 →
        </Link>
      </section>
    </main>
  );
}
