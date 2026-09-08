import {
  CatFace,
  MOOD_LABEL,
  EAR,
  INNER_EAR,
  FACE,
  OUTLINE,
  type CatMood,
} from "./CatMascot";

const TAIL = "#E8BFA3"; // 尾巴重点色（比耳朵深一点）

interface SittingCatProps {
  mood?: CatMood;
  /** 宽度（px），高度按比例 1.3 倍 */
  size?: number;
}

/** 坐姿布偶猫（全身）：头 + 坐姿身体 + 前爪 + 翘尾巴，表情复用 CatFace */
export function SittingCat({ mood = "NORMAL", size = 72 }: SittingCatProps) {
  return (
    <div
      className="inline-flex items-end justify-center"
      role="img"
      aria-label={`布偶猫（${MOOD_LABEL[mood]}）`}
    >
      <svg
        viewBox="0 0 100 130"
        width={size}
        height={Math.round(size * 1.3)}
        aria-hidden="true"
        focusable="false"
      >
        {/* 尾巴（画在最底层，从身后翘起） */}
        <path
          d="M71 104 Q93 100 88 74"
          fill="none"
          stroke={TAIL}
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* 坐姿身体 */}
        <path
          d="M50 50 C69 53 79 75 80 97 Q80 109 69 109 L31 109 Q20 109 20 97 C21 75 31 53 50 50 Z"
          fill={FACE}
          stroke={OUTLINE}
          strokeWidth="2"
        />

        {/* 前爪 */}
        <ellipse cx="43" cy="106" rx="6.5" ry="4.5" fill={FACE} stroke={OUTLINE} strokeWidth="1.5" />
        <ellipse cx="57" cy="106" rx="6.5" ry="4.5" fill={FACE} stroke={OUTLINE} strokeWidth="1.5" />
        {/* 爪趾小线 */}
        <path
          d="M41 103.5 L41 106.5 M45 103.5 L45 106.5 M55 103.5 L55 106.5 M59 103.5 L59 106.5"
          stroke={OUTLINE}
          strokeWidth="1"
          opacity="0.5"
        />

        {/* 耳朵 */}
        <path d="M31 24 Q24 5 36 8 Q45 12 49 21 Z" fill={EAR} stroke={OUTLINE} strokeWidth="2" />
        <path d="M69 24 Q76 5 64 8 Q55 12 51 21 Z" fill={EAR} stroke={OUTLINE} strokeWidth="2" />
        <path d="M34 20 Q30 11 37 12 Q42 15 45 19 Z" fill={INNER_EAR} />
        <path d="M66 20 Q70 11 63 12 Q58 15 55 19 Z" fill={INNER_EAR} />

        {/* 头 */}
        <circle cx="50" cy="34" r="23" fill={FACE} stroke={OUTLINE} strokeWidth="2" />

        {/* 五官（缩放到小脑袋上） */}
        <g transform="translate(17, -4.6) scale(0.66)">
          <CatFace mood={mood} />
        </g>
      </svg>
    </div>
  );
}
