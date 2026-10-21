import { connection } from "next/server";
import { MoodBoard } from "@/components/MoodBoard";
import { getUnlockedNames } from "@/lib/stickerService";
import {
  pickAnyUnlocked,
  pickStickerStable,
  type StickerName,
} from "@/lib/stickerPop";
import { getToday, getWeekdayLabel } from "@/lib/date";
import { getWeather } from "@/lib/weather";

/**
 * 心情页（服务端外壳）：
 * 头部装饰贴纸每次打开随机更换；五个心情档位按钮则固定映射
 * （每档取场景池里第一张已解锁的），保证"图随情绪稳定"，刷新不跳变。
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
    GREAT: pickStickerStable("GREAT", unlocked),
    GOOD: pickStickerStable("GOOD", unlocked),
    OK: pickStickerStable("OK", unlocked),
    DOWN: pickStickerStable("DOWN", unlocked),
    ANXIOUS: pickStickerStable("ANXIOUS", unlocked),
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
