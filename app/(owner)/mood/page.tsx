import { connection } from "next/server";
import { MoodBoard } from "@/components/MoodBoard";
import { getUnlockedNames } from "@/lib/stickerService";
import {
  pickAnyUnlocked,
  pickSticker,
  type StickerName,
} from "@/lib/stickerPop";
import { getToday, getWeekdayLabel } from "@/lib/date";
import { getWeather } from "@/lib/weather";

/**
 * 心情页（服务端外壳）：
 * 头部与五个心情档位的真猫照片换成收集册已解锁贴纸，每次打开随机更换。
 * 心情按钮保留情绪语义：每档从"该心情场景池 ∩ 已解锁"里随机挑。
 * 日期与天气在服务端取好再下发，客户端不再自己算时区。
 * connection() 确保按请求渲染，避免静态预渲染把随机结果固化。
 */
export default async function MoodPage() {
  await connection();
  const [unlocked, weather] = await Promise.all([
    getUnlockedNames(),
    getWeather(),
  ]);

  const today = getToday();

  const moodStickers: Record<
    "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS",
    StickerName
  > = {
    GREAT: pickSticker("GREAT", unlocked),
    GOOD: pickSticker("GOOD", unlocked),
    OK: pickSticker("OK", unlocked),
    DOWN: pickSticker("DOWN", unlocked),
    ANXIOUS: pickSticker("ANXIOUS", unlocked),
  };

  return (
    <MoodBoard
      headerSticker={pickAnyUnlocked(unlocked)}
      moodStickers={moodStickers}
      today={today}
      weekday={getWeekdayLabel(today)}
      weather={weather}
    />
  );
}
