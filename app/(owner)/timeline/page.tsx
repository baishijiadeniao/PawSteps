import { connection } from "next/server";
import { BottomNav } from "@/components/BottomNav";
import { StickerImage } from "@/components/StickerImage";
import { CalendarView } from "@/components/CalendarView";
import { getSurgeryDate } from "@/lib/date";
import { getUnlockedNames } from "@/lib/stickerService";
import { pickAnyUnlocked } from "@/lib/stickerPop";

// 头部贴纸每次打开随机挑一张已解锁的，connection() 保证按请求渲染不被固化
export default async function TimelinePage() {
  await connection();
  const unlocked = await getUnlockedNames();

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <StickerImage name={pickAnyUnlocked(unlocked)} size={48} />
        <h1 className="text-2xl font-fun mt-2">康复日历</h1>
      </header>

      <CalendarView surgeryDate={getSurgeryDate()} />

      <BottomNav />
    </main>
  );
}
