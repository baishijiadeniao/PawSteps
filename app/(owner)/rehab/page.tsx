import { requireOwner } from "@/lib/auth";
import { getTodayTasks } from "@/lib/rehab";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase, PHASE_LABELS } from "@/lib/phase";
import { getEncouragement } from "@/lib/encouragement";
import { RehabTaskList } from "@/components/RehabTaskList";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";
import { DailyStatusCard } from "@/components/DailyStatusCard";

export default async function RehabPage() {
  const auth = await requireOwner();
  if ("redirect" in auth) return null;

  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const tasks = await getTodayTasks();

  return (
    <main className="min-h-screen pb-24 px-4 py-6">
      <header className="text-center mb-6">
        <CatMascot mood="CHEER" size={48} />
        <p className="text-sm opacity-70 mt-2">
          {pod < 0
            ? `术前 ${Math.abs(pod)} 天`
            : pod === 0
              ? "手术当天"
              : `术后第 ${pod} 天`}
          {" · "}
          {PHASE_LABELS[phase]}
        </p>
        <p className="text-sm mt-1 italic text-ragdoll">
          &ldquo;{getEncouragement(today)}&rdquo;
        </p>
      </header>

      <DailyStatusCard />

      <RehabTaskList items={tasks} />

      <details className="mt-8 p-4 bg-coral/15 rounded-3xl text-sm">
        <summary className="font-bold cursor-pointer">
          ⚠️ 出现这些情况请先停下
        </summary>
        <p className="opacity-80 mt-2">
          如果出现明显异常，不要因为今天的任务继续坚持。
          请优先遵循医生和康复师指导，必要时联系医疗机构。
        </p>
        <ul className="mt-2 opacity-70 text-xs space-y-1">
          <li>· 疼痛明显异常</li>
          <li>· 肿胀明显增加</li>
          <li>· 伤口异常</li>
          <li>· 发热</li>
          <li>· 小腿明显肿痛</li>
          <li>· 呼吸困难/胸痛等紧急情况</li>
        </ul>
      </details>

      <BottomNav />
    </main>
  );
}
