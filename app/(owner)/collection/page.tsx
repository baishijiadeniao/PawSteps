import { BottomNav } from "@/components/BottomNav";
import { CollectionView } from "@/components/CollectionView";
import { StickerImage } from "@/components/StickerImage";
import { getCollection } from "@/lib/stickerService";
import { pickAnyUnlocked } from "@/lib/stickerPop";

// 收集册数据每次访问都要重新计算，强制动态渲染
export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const { items } = await getCollection();
  // 头部贴纸：直接从本页已算好的解锁结果里随机挑，不再额外查库
  const headerSticker = pickAnyUnlocked(
    items.filter((i) => i.unlocked).map((i) => i.sticker)
  );

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <StickerImage name={headerSticker} size={48} />
        <h1 className="text-2xl font-fun mt-2">表情收集册</h1>
      </header>
      <CollectionView items={items} />
      <BottomNav />
    </main>
  );
}
