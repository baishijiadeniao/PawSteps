import { z } from "zod";

export const loginSchema = z.object({
  code: z.string().min(1, "请输入访问码").max(100),
});

export const moodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.enum(["GREAT", "GOOD", "OK", "DOWN", "ANXIOUS"]),
  note: z.string().max(500).optional().nullable(),
});

export const rehabLogSchema = z.object({
  planItemId: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedValue: z.number().int().min(0).nullable().optional(),
  completedSets: z.number().int().min(0).nullable().optional(),
  done: z.boolean(),
  note: z.string().max(500).optional().nullable(),
});

export const rehabLogPatchSchema = z.object({
  completedValue: z.number().int().min(0).nullable().optional(),
  completedSets: z.number().int().min(0).nullable().optional(),
  done: z.boolean().optional(),
  note: z.string().max(500).optional().nullable(),
});

export const timelineEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["SURGERY", "FOLLOW_UP", "PLAN_CHANGE", "MILESTONE", "NOTE"]),
  title: z.string().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
});

export const dailyStatusSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: z.enum(["NORMAL", "TIRED", "PAINFUL", "REST"]).optional().nullable(),
  painLevel: z.number().int().min(0).max(10).optional().nullable(),
  swelling: z.number().int().min(0).max(10).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});
