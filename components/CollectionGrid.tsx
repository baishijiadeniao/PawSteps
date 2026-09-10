"use client";

/**
 * 收集册网格：格子里只放贴纸图（不带任何文字），点一下弹出预览层。
 *
 * 预览层负责展示名字、解锁时间/解锁条件，并提供"下载贴纸"：
 * 拉取同源 PNG 转成 blob 后用 <a download> 触发保存。
 * 未解锁的格子只有灰剪影 + "？"，不给下载，免得提前剧透。
 */

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { stickerSrc } from "@/lib/stickerPop";
import { formatDate } from "@/lib/date";
import type { CollectionItem } from "@/lib/stickerService";

export function CollectionGrid({ items }: { items: CollectionItem[] }) {
  const [active, setActive] = useState<CollectionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // 预览层打开时：锁背景滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  async function download(item: CollectionItem) {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch(stickerSrc(item.sticker));
      if (!res.ok) throw new Error(`贴纸拉取失败：${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.sticker}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <StickerCell key={item.sticker} item={item} onOpen={setActive} />
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
        >
          <button
            type="button"
            aria-label="关闭预览"
            onClick={() => setActive(null)}
            className="absolute inset-0 bg-cocoa/45 backdrop-blur-sm"
          />
          <div className="card-soft animate-pop-in relative w-full max-w-xs rounded-3xl border border-peach bg-cream p-5">
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="关闭"
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-cocoa/50 hover:bg-peach hover:text-cocoa"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>

            <img
              src={stickerSrc(active.sticker)}
              alt={active.unlocked ? active.label : "未解锁的贴纸"}
              className={`mx-auto h-52 w-full object-contain ${
                active.unlocked ? "" : "opacity-20 [filter:brightness(0)]"
              }`}
            />

            <p className="mt-2 text-center font-fun text-lg">
              {active.unlocked ? active.label : "还没有解锁"}
            </p>
            <p className="mt-1 text-center text-xs opacity-60">
              {active.unlocked
                ? `${
                    active.unlockedAt
                      ? `${formatDate(active.unlockedAt.slice(0, 10))} 解锁`
                      : "已解锁"
                  } · 点下载可保存到手机`
                : active.how}
            </p>

            {active.unlocked && (
              <button
                type="button"
                onClick={() => void download(active)}
                disabled={saving}
                className="btn-candy mt-4 flex w-full items-center justify-center gap-2 bg-coral py-2.5 text-cocoa"
              >
                <Download size={18} strokeWidth={2.6} aria-hidden="true" />
                {saving ? "保存中…" : "下载贴纸"}
              </button>
            )}
            {failed && (
              <p className="mt-2 text-center text-xs text-cocoa/70">
                下载失败，请再试一次
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StickerCell({
  item,
  onOpen,
}: {
  item: CollectionItem;
  onOpen: (item: CollectionItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={
        item.unlocked
          ? `查看并下载贴纸「${item.label}」`
          : `未解锁贴纸，解锁条件：${item.how}`
      }
      className={`aspect-square rounded-2xl border p-2 transition-transform active:scale-95 ${
        item.unlocked
          ? "bg-white border-peach"
          : "bg-cocoa/5 border-dashed border-cocoa/20"
      }`}
    >
      <span className="relative block h-full w-full">
        <img
          src={stickerSrc(item.sticker)}
          alt=""
          className={`h-full w-full object-contain ${
            item.unlocked ? "" : "opacity-20 [filter:brightness(0)]"
          }`}
        />
        {!item.unlocked && (
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-fun text-cocoa/40">
            ？
          </span>
        )}
      </span>
    </button>
  );
}
