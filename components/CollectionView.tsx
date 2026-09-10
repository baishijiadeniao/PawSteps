import { CollectionGrid } from "@/components/CollectionGrid";
import type { CollectionItem } from "@/lib/stickerService";

/**
 * 表情收集册：布偶猫贴纸宫格。
 * 格子里只有贴纸图（不放文字），点击后由 CollectionGrid 的预览层
 * 展示名字、解锁信息和下载入口。
 * 纯展示组件（服务端渲染），数据来自 /api/stickers 同一套 getCollection。
 */
export function CollectionView({ items }: { items: CollectionItem[] }) {
  const unlockedCount = items.filter((i) => i.unlocked).length;
  const percent = Math.round((unlockedCount / items.length) * 100);

  return (
    <div>
      {/* 顶部进度 */}
      <div className="bg-white rounded-3xl border border-peach p-4 mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-fun text-base">已收集 {unlockedCount} / {items.length}</span>
          <span className="opacity-60">{percent}%</span>
        </div>
        <div className="h-3 rounded-full bg-peach/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-mint to-coral transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs opacity-60 mt-2">
          坚持打卡、记录心情，小猫的表情会一个一个亮起来～
        </p>
      </div>

      <CollectionGrid items={items} />
    </div>
  );
}
