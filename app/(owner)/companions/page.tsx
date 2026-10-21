import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { listCompanions } from "@/lib/companionService";
import { CompanionManager } from "@/components/CompanionManager";
import { BottomNav } from "@/components/BottomNav";

/** 上海时区的"M月d日 HH:mm"最后访问时间；从未访问过则给固定文案 */
function seenLabel(d: Date | null): string {
  if (!d) return "尚未访问";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * 陪伴者管理页（病人侧）：生成邀请码、查看谁在陪伴、移除陪伴者。
 * 列表服务端直渲，增删与复制邀请码的交互在 <CompanionManager />。
 */
export default async function CompanionsPage() {
  const auth = await requireOwner();
  // middleware 只查 cookie 存在性，会话真正失效时这里兜底跳登录页
  if ("redirect" in auth) redirect("/login");

  const companions = await listCompanions();

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <Link
          href="/rehab"
          className="text-xs opacity-60 underline underline-offset-4"
        >
          ← 回到打卡
        </Link>
        <h1 className="text-2xl font-fun mt-2">陪伴者们</h1>
        <p className="text-sm opacity-70 mt-1">
          生成邀请码发给亲友，他们就能用小窝的「陪伴视角」看你近况、给你打气
        </p>
      </header>

      <CompanionManager
        initial={companions.map((c) => ({
          id: c.id,
          nickname: c.nickname,
          inviteCode: c.inviteCode,
          messageCount: c.messageCount,
          lastSeenLabel: seenLabel(c.lastSeenAt),
        }))}
      />

      <BottomNav />
    </main>
  );
}
