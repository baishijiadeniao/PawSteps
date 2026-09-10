import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";
import { CalendarView } from "@/components/CalendarView";
import { getSurgeryDate } from "@/lib/date";

export default function TimelinePage() {
  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-2xl font-fun mt-2">康复日历</h1>
      </header>

      <CalendarView surgeryDate={getSurgeryDate()} />

      <BottomNav />
    </main>
  );
}
