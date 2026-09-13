import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { z } from "zod";

function env(key: string, fallback?: string): string {
  const v = process.env[key];
  if (!v) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing env ${key}`);
  }
  return v;
}

export function getToday(
  timezone: string = env("APP_TIMEZONE", "Asia/Shanghai")
): string {
  // 用 Intl 取指定时区的当天日期，避免依赖服务器本地时区
  const now = new Date();
  const tzFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return tzFormat.format(now); // en-CA 输出 YYYY-MM-DD
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function getPostOpDay(today: string, surgeryDate: string): number {
  dateSchema.parse(today);
  dateSchema.parse(surgeryDate);
  const t = parseISO(today);
  const s = parseISO(surgeryDate);
  return differenceInCalendarDays(t, s);
}

export function getDaysUntilSurgery(today: string, surgeryDate: string): number {
  return -getPostOpDay(today, surgeryDate);
}

export function formatDate(dateStr: string, pattern: string = "M月d日"): string {
  return format(parseISO(dateStr), pattern);
}

const WEEKDAYS = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

/** 中文星期：2026-09-14 → 星期一（date-fns 的 EEEE 不带 locale 是英文，这里自己映射） */
export function getWeekdayLabel(dateStr: string): string {
  dateSchema.parse(dateStr);
  return WEEKDAYS[parseISO(dateStr).getDay()];
}

export function isFutureDate(
  dateStr: string,
  timezone: string = env("APP_TIMEZONE", "Asia/Shanghai")
): boolean {
  dateSchema.parse(dateStr);
  const today = getToday(timezone);
  return parseISO(dateStr) > parseISO(today);
}

export function getSurgeryDate(): string {
  return env("SURGERY_DATE");
}
