export type CatMood =
  | "CHEER"
  | "CELEBRATE"
  | "COMFORT"
  | "REST"
  | "NORMAL"
  | "GREAT"
  | "GOOD"
  | "OKAY"
  | "DOWN"
  | "ANXIOUS";

interface CatMascotProps {
  mood?: CatMood;
  size?: number;
  className?: string;
}

export const MOOD_LABEL: Record<CatMood, string> = {
  CHEER: "开心",
  CELEBRATE: "庆祝",
  COMFORT: "安慰",
  REST: "休息",
  NORMAL: "平常",
  GREAT: "棒极了",
  GOOD: "还不错",
  OKAY: "还行",
  DOWN: "有点糟",
  ANXIOUS: "焦虑了",
};

// 十一的真猫照片（public/cats/），按心情映射
const CAT_IMAGES: Record<CatMood, string> = {
  NORMAL: "/cats/main.png",
  COMFORT: "/cats/main.png",
  GOOD: "/cats/main.png",
  CHEER: "/cats/roar.png",
  CELEBRATE: "/cats/roar.png",
  GREAT: "/cats/roar.png",
  OKAY: "/cats/sit.png",
  REST: "/cats/lazy.png",
  DOWN: "/cats/lazy.png",
  ANXIOUS: "/cats/grumpy.png",
};

/** 十一的布偶猫照片，接口与原 SVG 版保持一致 */
export function CatMascot({
  mood = "NORMAL",
  size = 64,
  className = "",
}: CatMascotProps) {
  return (
    <span
      className={`inline-flex items-center justify-center animate-float ${className}`}
      role="img"
      aria-label={`布偶猫（${MOOD_LABEL[mood]}）`}
    >
      <img
        src={CAT_IMAGES[mood]}
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
