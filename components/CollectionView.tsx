import { stickerSrc, type StickerName } from "@/lib/stickerPop";
import { formatDate } from "@/lib/date";
import type { CollectionItem } from "@/lib/stickerService";

/**
 * 表情收集册：16 宫格布偶猫贴纸。
 * - 已解锁：彩色贴纸 + 中文名 + 解锁日期；
 * - 未解锁：灰色剪影 + "？" + 解锁条件提示。
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

      {/* 16 宫格 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <StickerCell key={item.sticker} item={item} />
        ))}
      </div>
    </div>
  );
}

function StickerCell({ item }: { item: CollectionItem }) {
  const src = stickerSrc(item.sticker as StickerName);
  return (
    <div
      className={`rounded-2xl border p-2 text-center ${
        item.unlocked
          ? "bg-white border-peach"
          : "bg-cocoa/5 border-dashed border-cocoa/20"
      }`}
    >
      <div className="relative mx-auto h-20 w-20">
        <img
          src={src}
          alt={item.unlocked ? item.label : "未解锁的贴纸"}
          className={`h-full w-full object-contain ${
            item.unlocked ? "" : "opacity-20 [filter:brightness(0)]"
          }`}
        />
        {!item.unlocked && (
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-fun text-cocoa/40">
            ？
          </span>
        )}
      </div>
      {item.unlocked ? (
        <>
          <p className="text-xs font-bold mt-1 truncate">{item.label}</p>
          <p className="text-[10px] opacity-50">
            {item.unlockedAt ? `${formatDate(item.unlockedAt.slice(0, 10))} 解锁` : "已解锁"}
          </p>
        </>
      ) : (
        <p className="text-[10px] opacity-50 mt-1 leading-snug">{item.how}</p>
      )}
    </div>
  );
}
