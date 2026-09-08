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
}

// 配色与应用主题一致
export const EAR = "#F0D2BC"; // 布偶重点色的浅调
export const INNER_EAR = "#FFE5D9"; // 桃粉内耳
export const FACE = "#FFF8F0"; // 奶油脸
export const OUTLINE = "#E8CBAF"; // 柔和轮廓
export const EYE = "#8FC9E8"; // 布偶蓝眼
export const DETAIL = "#5C4033"; // 可可色五官线条
export const BLUSH = "#FFB6A3"; // 珊瑚腮红
export const NOSE = "#E8967F"; // 鼻头和小舌头

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

/** 根据心情渲染眼睛 */
function Eyes({ mood }: { mood: CatMood }) {
  switch (mood) {
    case "CHEER":
      // 开心眯眼 ^ ^
      return (
        <g stroke={DETAIL} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M28 58 Q36 48 44 58" />
          <path d="M56 58 Q64 48 72 58" />
        </g>
      );
    case "CELEBRATE":
      // 星星眼 ✦
      return (
        <g fill={EYE}>
          <path d="M36 47 Q37.5 54 45 56 Q37.5 58 36 65 Q34.5 58 27 56 Q34.5 54 36 47" />
          <path d="M64 47 Q65.5 54 73 56 Q65.5 58 64 65 Q62.5 58 55 56 Q62.5 54 64 47" />
        </g>
      );
    case "COMFORT":
      // 放松闭眼 u u
      return (
        <g stroke={DETAIL} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M28 55 Q36 62 44 55" />
          <path d="M56 55 Q64 62 72 55" />
        </g>
      );
    case "REST":
      // 睡觉闭眼
      return (
        <g stroke={DETAIL} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M29 57 Q36 60 43 57" />
          <path d="M57 57 Q64 60 71 57" />
        </g>
      );
    case "GREAT":
      // 星星眼（最兴奋）
      return (
        <g fill={EYE}>
          <path d="M36 47 Q37.5 54 45 56 Q37.5 58 36 65 Q34.5 58 27 56 Q34.5 54 36 47" />
          <path d="M64 47 Q65.5 54 73 56 Q65.5 58 64 65 Q62.5 58 55 56 Q62.5 54 64 47" />
        </g>
      );
    case "DOWN":
      // 垂眼
      return (
        <g stroke={DETAIL} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M29 56 Q36 62 43 56" />
          <path d="M57 56 Q64 62 71 56" />
        </g>
      );
    case "ANXIOUS":
      // 瞪大的眼睛 + 小瞳孔
      return (
        <g>
          <circle cx="36" cy="56" r="8" fill="#FDFBF7" stroke={DETAIL} strokeWidth="1.8" />
          <circle cx="64" cy="56" r="8" fill="#FDFBF7" stroke={DETAIL} strokeWidth="1.8" />
          <circle cx="36" cy="57" r="3.2" fill={DETAIL} />
          <circle cx="64" cy="57" r="3.2" fill={DETAIL} />
        </g>
      );
    default:
      // 睁开的蓝眼睛 + 高光
      return (
        <g>
          <circle cx="36" cy="56" r="7" fill={EYE} />
          <circle cx="64" cy="56" r="7" fill={EYE} />
          <circle cx="33.5" cy="53.5" r="2.2" fill="#fff" />
          <circle cx="61.5" cy="53.5" r="2.2" fill="#fff" />
        </g>
      );
  }
}

/** 根据心情渲染嘴巴 */
function Mouth({ mood }: { mood: CatMood }) {
  switch (mood) {
    case "CHEER":
    case "CELEBRATE":
    case "GREAT":
      // 咧嘴笑 + 小舌头
      return (
        <g>
          <path d="M41 67 Q50 80 59 67 Z" fill={NOSE} stroke={DETAIL} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M46 74 Q50 77 54 74 Q50 71.5 46 74 Z" fill="#FF9DA0" />
        </g>
      );
    case "REST":
      // 睡觉的小 o 嘴
      return <ellipse cx="50" cy="69" rx="3" ry="3.8" fill="none" stroke={DETAIL} strokeWidth="2" />;
    case "OKAY":
      // 淡淡的平嘴
      return (
        <path
          d="M46 69.5 Q50 71 54 69.5"
          fill="none"
          stroke={DETAIL}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    case "DOWN":
      // 撇嘴
      return (
        <path
          d="M44 71 Q50 66 56 71"
          fill="none"
          stroke={DETAIL}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    case "ANXIOUS":
      // 波浪嘴
      return (
        <path
          d="M43 69 Q46 66.5 49 69 Q52 71.5 55 69 Q58 66.5 61 69"
          fill="none"
          stroke={DETAIL}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    default:
      // 温柔微笑
      return (
        <path
          d="M44 68 Q50 73 56 68"
          fill="none"
          stroke={DETAIL}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
  }
}

/** 五官组（胡须/腮红/眼睛/鼻子/嘴/心情小细节），不含头和耳朵，可被其他猫造型复用 */
export function CatFace({ mood }: { mood: CatMood }) {
  return (
    <g>
      {/* 胡须 */}
      <g stroke={DETAIL} strokeWidth="1.5" strokeLinecap="round" opacity="0.35">
        <line x1="10" y1="56" x2="22" y2="58.5" />
        <line x1="9" y1="64" x2="22" y2="64" />
        <line x1="90" y1="56" x2="78" y2="58.5" />
        <line x1="91" y1="64" x2="78" y2="64" />
      </g>

      {/* 腮红 */}
      <ellipse cx="24" cy="65" rx="5.5" ry="3.2" fill={BLUSH} opacity="0.55" />
      <ellipse cx="76" cy="65" rx="5.5" ry="3.2" fill={BLUSH} opacity="0.55" />

      <Eyes mood={mood} />

      {/* 鼻头 */}
      <path
        d="M46 60 Q50 56.5 54 60 Q52 65.5 50 66.5 Q48 65.5 46 60 Z"
        fill={NOSE}
      />

      <Mouth mood={mood} />

      {/* 庆祝时的小星星 */}
      {mood === "CELEBRATE" && (
        <g fill="#FFD97A">
          <path d="M17 30 Q17.8 34 22 35 Q17.8 36 17 40 Q16.2 36 12 35 Q16.2 34 17 30" />
          <path d="M83 30 Q83.8 34 88 35 Q83.8 36 83 40 Q82.2 36 78 35 Q82.2 34 83 30" />
        </g>
      )}

      {/* 有点糟：一滴小眼泪 */}
      {mood === "DOWN" && (
        <path
          d="M36 63 Q33.5 67.5 36 69 Q38.5 67.5 36 63 Z"
          fill="#A8D8E8"
          stroke="#8FC9E8"
          strokeWidth="0.8"
        />
      )}

      {/* 焦虑了：一滴冷汗 */}
      {mood === "ANXIOUS" && (
        <path
          d="M68 44 Q65.5 48 68 49.5 Q70.5 48 68 44 Z"
          fill="#A8D8E8"
          stroke="#8FC9E8"
          strokeWidth="0.8"
        />
      )}

      {/* 睡觉 Z z z */}
      {mood === "REST" && (
        <g fill={NOSE} fontWeight="bold" fontFamily="inherit">
          <text x="72" y="18" fontSize="13">Z</text>
          <text x="82" y="9" fontSize="9">z</text>
        </g>
      )}
    </g>
  );
}

export function CatMascot({ mood = "NORMAL", size = 64 }: CatMascotProps) {
  return (
    <div
      className="inline-flex items-center justify-center animate-float"
      role="img"
      aria-label={`布偶猫（${MOOD_LABEL[mood]}）`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
      >
        {/* 耳朵（画在脸后面） */}
        <path d="M22 50 Q13 10 28 9 Q44 14 51 31 Z" fill={EAR} stroke={OUTLINE} strokeWidth="2" />
        <path d="M78 50 Q87 10 72 9 Q56 14 49 31 Z" fill={EAR} stroke={OUTLINE} strokeWidth="2" />
        <path d="M26 44 Q21 18 30 17 Q39 21 44 30 Z" fill={INNER_EAR} />
        <path d="M74 44 Q79 18 70 17 Q61 21 56 30 Z" fill={INNER_EAR} />

        {/* 脸 */}
        <ellipse cx="50" cy="58" rx="34" ry="30" fill={FACE} stroke={OUTLINE} strokeWidth="2" />

        <CatFace mood={mood} />
      </svg>
    </div>
  );
}
