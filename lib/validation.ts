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

/** 陪伴者登录：邀请码只做宽松校验，具体格式在服务层判定（统一错误口径） */
export const careLoginSchema = z.object({
  code: z.string().min(1, "请输入邀请码").max(64),
});

/** 病人创建陪伴者：昵称 */
export const companionCreateSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "请填写陪伴者的称呼")
    .max(20, "称呼最长 20 字"),
});

/** 陪伴者发送鼓励留言 */
export const encouragementSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "写点什么再送出吧")
    .max(200, "最长 200 字"),
  emoji: z.string().max(40).optional().nullable(),
});

/** 主人修改访问码：需当前码 + 新码两次确认 */
export const ownerCodeChangeSchema = z
  .object({
    currentCode: z.string().min(1, "请输入当前访问码").max(100),
    newCode: z
      .string()
      .min(4, "新访问码至少 4 位")
      .max(32, "新访问码最长 32 位")
      .regex(/^\S+$/, "访问码不能包含空格"),
    confirmCode: z.string().min(1, "请再次输入新访问码").max(100),
  })
  .refine((v) => v.newCode === v.confirmCode, {
    message: "两次输入的新访问码不一致",
  });

/** 恢复默认访问码：只需确认当前码 */
export const ownerCodeResetSchema = z.object({
  currentCode: z.string().min(1, "请输入当前访问码").max(100),
});

/** 更新小愿望：填写愿望内容 或 标记已实现，二者至少其一 */
export const wishPatchSchema = z
  .object({
    id: z.string().min(1, "缺少愿望 id").max(100),
    content: z
      .string()
      .trim()
      .min(1, "写下你的小心愿吧")
      .max(100, "愿望最长 100 字")
      .optional(),
    action: z.enum(["done"]).optional(),
  })
  .refine((v) => v.content !== undefined || v.action !== undefined, {
    message: "请填写愿望或标记已实现",
  });
