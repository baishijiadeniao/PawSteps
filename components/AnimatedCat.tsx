export type PetPose =
  | "sit"
  | "tilt"
  | "look"
  | "loaf"
  | "fish"
  | "wave"
  | "sleep"
  | "groom"
  | "sidesit"
  | "standwave"
  | "cheer"
  | "playbow"
  | "roll"
  | "giggle"
  | "dance"
  | "sleep2"
  | "content"
  | "heart";

export const PET_POSES: readonly PetPose[] = [
  "sit",
  "tilt",
  "look",
  "loaf",
  "fish",
  "wave",
  "sleep",
  "groom",
  "standwave",
  "cheer",
  "playbow",
  "roll",
  "giggle",
  "dance",
  "sleep2",
  "content",
  "heart",
];

export type PetShadow = "normal" | "walk" | "hidden";

interface AnimatedCatProps {
  pose: PetPose;
  size?: number;
  /** 水平翻转（朝左走时用） */
  flip?: boolean;
  /** 作用于图片的动画 class，如 animate-pet-breathe */
  anim?: string;
  shadow?: PetShadow;
  className?: string;
}

/**
 * 贴纸猫猫渲染层：姿势图 + 动画 class + 脚下软阴影。
 * 阴影随跳跃/走路缩放，让猫"落地"不飘。
 */
export function AnimatedCat({
  pose,
  size = 96,
  flip = false,
  anim = "animate-pet-breathe",
  shadow = "normal",
  className = "",
}: AnimatedCatProps) {
  return (
    <span
      aria-hidden
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      {shadow !== "hidden" && (
        <span
          className="absolute bottom-0 left-1/2"
          style={{
            width: size * 0.62,
            height: Math.max(6, size * 0.1),
            transform: "translateX(-50%)",
          }}
        >
          <span
            className={`block h-full w-full rounded-full bg-cocoa/20 blur-[2px] ${
              shadow === "walk" ? "animate-pet-shadow-walk" : ""
            }`}
          />
        </span>
      )}
      <span
        className="absolute inset-0"
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        <img
          key={`${pose}-${anim}`}
          src={`/pet/${pose}.png`}
          alt=""
          draggable={false}
          className={`pointer-events-none h-full w-full origin-bottom select-none object-contain ${anim}`}
        />
      </span>
    </span>
  );
}
