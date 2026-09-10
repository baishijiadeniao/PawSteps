import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";
import { CollectionView } from "@/components/CollectionView";
import { getCollection } from "@/lib/stickerService";

// 收集册数据每次访问都要重新计算，强制动态渲染
export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const { items } = await getCollection();

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-2xl font-fun mt-2">表情收集册</h1>
      </header>
      <CollectionView items={items} />
      <BottomNav />
    </main>
  );
}
