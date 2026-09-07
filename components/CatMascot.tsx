type CatMood = "CHEER" | "CELEBRATE" | "COMFORT" | "REST" | "NORMAL";

interface CatMascotProps {
  mood?: CatMood;
  size?: number;
}

const MOOD_FACE: Record<CatMood, string> = {
  CHEER: "😺",
  CELEBRATE: "😻",
  COMFORT: "🐱",
  REST: "💤",
  NORMAL: "🐈",
};

export function CatMascot({ mood = "NORMAL", size = 64 }: CatMascotProps) {
  return (
    <div
      className="inline-flex items-center justify-center"
      style={{ fontSize: size, lineHeight: 1 }}
      role="img"
      aria-label={`布偶猫 - ${mood}`}
    >
      {MOOD_FACE[mood]}
    </div>
  );
}
