export type RehabPhase = "PRE_OP" | "WEEK_1" | "EARLY" | "MID" | "LATE";

export const PHASE_BOUNDARIES = {
  WEEK1_START: 0,
  WEEK1_END: 6, // POD 0~6：术后第 1 周（确定版康复计划）
  EARLY_START: 7,
  EARLY_END: 14, // POD 7~14
  MID_START: 15,
  MID_END: 42, // POD 15~42
  LATE_START: 43,
} as const;

export const PHASE_LABELS: Record<RehabPhase, string> = {
  PRE_OP: "术前",
  WEEK_1: "术后第 1 周",
  EARLY: "术后早期",
  MID: "术后中期",
  LATE: "术后后期",
};

export function getRehabPhase(postOpDay: number): RehabPhase {
  if (postOpDay < 0) return "PRE_OP";
  if (postOpDay <= PHASE_BOUNDARIES.WEEK1_END) return "WEEK_1";
  if (postOpDay <= PHASE_BOUNDARIES.EARLY_END) return "EARLY";
  if (postOpDay <= PHASE_BOUNDARIES.MID_END) return "MID";
  return "LATE";
}
