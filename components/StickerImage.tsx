import { stickerSrc, type StickerName } from "@/lib/stickerPop";

interface StickerImageProps {
  /** 要展示的贴纸名（随机挑选由调用方完成，保证服务端每次渲染各挑一次） */
  name: StickerName;
  size?: number;
  alt?: string;
  className?: string;
}

/**
 * 收集册贴纸展示组件：替代登录页 / 打卡页 / 心情页头部的真猫照片。
 * 外观与 CatMascot 一致（浮动动画 + 不可选中），服务端与客户端组件均可使用。
 */
export function StickerImage({
  name,
  size = 64,
  alt = "十一的贴纸",
  className = "",
}: StickerImageProps) {
  return (
    <span
      className={`inline-flex items-center justify-center animate-float ${className}`}
      role="img"
      aria-label={alt}
    >
      <img
        src={stickerSrc(name)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        loading="lazy"
        className="object-contain select-none pointer-events-none"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
