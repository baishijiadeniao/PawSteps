import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { getTodayTasks } from "@/lib/rehab";
import { getTodayLikeCounts } from "@/lib/companionService";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase, PHASE_LABELS } from "@/lib/phase";
import { getEncouragement } from "@/lib/encouragement";
import { RehabTaskList } from "@/components/RehabTaskList";
import { EncouragementInbox } from "@/components/EncouragementInbox";
import { BottomNav } from "@/components/BottomNav";
import { StickerImage } from "@/components/StickerImage";
import { DailyStatusCard } from "@/components/DailyStatusCard";
import { getUnlockedNames } from "@/lib/stickerService";
import { pickSticker } from "@/lib/stickerPop";
import { getWishSummary } from "@/lib/wishService";
import { WishReward } from "@/components/WishReward";

export default async function RehabPage() {
  const auth = await requireOwner();
  if ("redirect" in auth) return null;

  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  // 四个数据源互相独立，并行获取
  const [tasks, likeCounts, unlocked, wishSummary] = await Promise.all([
    getTodayTasks(),
    getTodayLikeCounts(), // 今日各条打卡收到的点赞数（❤️ 角标）
    getUnlockedNames(),
    getWishSummary(), // 小愿望奖励：按打卡历史补建应赢得的愿望后取汇总
  ]);
  // 头部贴纸：每次打开从"打卡场景池 ∩ 已解锁"随机挑一张（本页因鉴权天然按请求渲染）
  const headerSticker = pickSticker("checkin", unlocked);

  return (
    <main className="min-h-screen pb-24 px-4 py-6">
      {/* 顶部入口：设置 + 陪伴者管理 + 鼓励收件箱 */}
      <div className="flex justify-end items-center gap-2 mb-3 max-w-lg mx-auto">
        <Link
          href="/settings"
          aria-label="设置"
          className="text-sm px-2.5 py-2 rounded-full bg-white border-2 border-peach text-ragdoll shadow-[0_3px_0_rgba(201,136,107,0.2)] active:scale-95 transition-transform"
        >
          ⚙️
        </Link>
        <Link
          href="/companions"
          className="text-xs px-3 py-2 rounded-full bg-white border-2 border-peach text-ragdoll font-medium shadow-[0_3px_0_rgba(201,136,107,0.2)] active:scale-95 transition-transform"
        >
          👥 陪伴者
        </Link>
        <EncouragementInbox />
      </div>

      <header className="text-center mb-6">
        <StickerImage name={headerSticker} size={48} />
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

      <RehabTaskList items={tasks} likeCounts={likeCounts} />

      <WishReward
        wishes={wishSummary.wishes}
        streak={wishSummary.streak}
        daysToNext={wishSummary.daysToNext}
        milestone={wishSummary.milestone}
      />

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
