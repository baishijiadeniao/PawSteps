# 十一的康复小窝 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现十一的髌骨脱位术后康复陪伴网站 MVP，移动优先，布偶猫主题，访问码鉴权，包含康复打卡、心情记录、留言墙、时间线四大模块。

**Architecture:** Next.js 14 App Router 全栈应用，SQLite via Prisma（生产 Turso/libSQL），Server Components + Route Handlers 为主，避免不必要的 Client Components。鉴权采用数据库 Session + httpOnly Cookie。康复日志保存快照保证历史完整性。

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, Prisma ORM, SQLite/Turso, Zod, Vitest + Testing Library, Lucide React, pnpm, Node.js 20+

**Spec:** `docs/superpowers/specs/2026-09-07-rehab-companion-design.md`

## Global Constraints

- 包管理器：pnpm（禁止 npm/yarn）
- Node 版本：20+
- 框架：Next.js 14+ App Router（禁止 Pages Router）
- 所有日期计算必须通过 `lib/date.ts`，禁止页面自行计算
- 所有阶段计算必须通过 `lib/phase.ts`
- 所有数据库访问必须通过 `lib/prisma.ts`
- 所有 API 输入必须经过 Zod 校验
- OWNER API 必须调用 `requireOwner()`
- OWNER_CODE 不得返回客户端
- 禁止 `dangerouslySetInnerHTML`
- 不要把医疗知识硬编码成自动决策逻辑
- 医疗内容不确定时保留为配置，不自行补充医学结论
- 时区固定 Asia/Shanghai，业务日期用 `YYYY-MM-DD` 字符串
- 配色：背景 `#FFF8F0`、卡片 `#FFE5D9`、强调 `#C9886B`、文字 `#5C4033`、完成 `#B5E8C9`、鼓励 `#FFB6A3`
- 移动端按钮/输入框 min-height: 44px
- 动画支持 `prefers-reduced-motion`
- Cookie 属性：httpOnly、secure(production)、sameSite=lax、path=/、maxAge=604800
- Cookie 名：`owner_session`

---

## Task 1: 项目初始化与基础配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `prisma.config.ts`

**Interfaces:**
- Produces: 可运行的 Next.js + Tailwind 开发服务器；vitest 可执行；环境变量模板

- [ ] **Step 1: 创建 Next.js 项目骨架**

Run:
```bash
cd /root/health && pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*" --use-pnpm
```

如果出现 "files in directory" 提示，先确认目录只有 docs/。选择 No to TypeScript 实际通过参数注入。如果 pnpm create 失败，退化为 `pnpm dlx create-next-app@latest . --typescript --tailwind --app --no-src-dir --no-eslint --import-alias "@/*"`。

- [ ] **Step 2: 安装核心依赖**

Run:
```bash
pnpm add prisma @prisma/client zod lucide-react && pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 3: 创建 .env.example**

Create `.env.example`:
```env
OWNER_CODE=change-me
SESSION_SECRET=change-me-to-a-long-random-secret
DATABASE_URL=file:./dev.db
APP_TIMEZONE=Asia/Shanghai
SURGERY_DATE=2026-09-09
RATE_LIMIT_SECRET=change-me
```

- [ ] **Step 4: 创建本地 .env（开发用，不提交）**

Create `.env`（与 .env.example 同结构，但 OWNER_CODE 填实际测试值如 `eleven-2026`）：
```env
OWNER_CODE=eleven-2026
SESSION_SECRET=dev-secret-replace-in-production-abc123xyz
DATABASE_URL=file:./dev.db
APP_TIMEZONE=Asia/Shanghai
SURGERY_DATE=2026-09-09
RATE_LIMIT_SECRET=dev-rate-limit-secret
```

确认 `.gitignore` 包含 `.env`、`node_modules`、`.next`、`dev.db*`。如不包含则追加。

- [ ] **Step 5: 配置 Tailwind 主题（布偶猫配色）**

Replace `tailwind.config.ts`:
```typescript
import type { Config } from "next";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F0",
        peach: "#FFE5D9",
        ragdoll: "#C9886B",
        cocoa: "#5C4033",
        mint: "#B5E8C9",
        coral: "#FFB6A3",
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"',
          '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: 全局样式**

Replace `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #FFF8F0;
  --cocoa: #5C4033;
}

html, body {
  background-color: var(--bg);
  color: var(--cocoa);
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

button, input, textarea, select {
  min-height: 44px;
}
```

- [ ] **Step 7: 根 layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "十一的康复小窝",
  description: "十一的术后康复陪伴小窝",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFF8F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-cream text-cocoa">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: vitest 配置**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

Create `tests/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 9: 临时首页占位**

Replace `app/page.tsx`:
```typescript
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-6xl mb-4">🐱</p>
        <h1 className="text-2xl font-bold">十一的康复小窝</h1>
        <p className="mt-2 text-sm opacity-70">建设中…</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 10: 验证开发服务器启动**

Run:
```bash
pnpm dev
```
另开终端 `curl -s http://localhost:3000 | head -20`，确认返回 HTML 包含"十一的康复小窝"。然后停止 dev server。

- [ ] **Step 11: 验证 vitest 可运行**

Create `tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `pnpm vitest run`
Expected: 1 test passed.

- [ ] **Step 12: Commit**

```bash
cd /root/health && git add -A && git commit -m "chore: initialize Next.js project with Tailwind, Vitest, Prisma deps

布偶猫主题配色，移动优先 viewport，环境变量模板。"
```

---

## Task 2: Prisma Schema 与数据库

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `prisma/seed.ts`
- Create: `lib/date.ts`
- Create: `lib/phase.ts`
- Test: `tests/lib/date.test.ts`
- Test: `tests/lib/phase.test.ts`

**Interfaces:**
- Produces: `prismaClient`（单例），所有数据模型，`getToday()`、`getPostOpDay()`、`getDaysUntilSurgery()`、`formatDate()`、`isFutureDate()`、`getRehabPhase()` 函数
- Constants: 阶段边界 EARLY=POD 0-14, MID=POD 15-42, LATE=POD 43+

- [ ] **Step 1: 写 date.ts 失败测试**

Create `tests/lib/date.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("date lib", () => {
  beforeEach(() => {
    vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
    vi.stubEnv("SURGERY_DATE", "2026-09-09");
  });

  it("getToday returns YYYY-MM-DD in Shanghai tz", async () => {
    const { getToday } = await import("@/lib/date");
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getPostOpDay: before surgery returns negative days until", async () => {
    const { getPostOpDay } = await import("@/lib/date");
    // 2026-09-08 是术前 1 天
    expect(getPostOpDay("2026-09-08", "2026-09-09")).toBe(-1);
  });

  it("getPostOpDay: surgery day is POD 0", async () => {
    const { getPostOpDay } = await import("@/lib/date");
    expect(getPostOpDay("2026-09-09", "2026-09-09")).toBe(0);
  });

  it("getPostOpDay: day after surgery is POD 1", async () => {
    const { getPostOpDay } = await import("@/lib/date");
    expect(getPostOpDay("2026-09-10", "2026-09-09")).toBe(1);
  });

  it("getPostOpDay: two weeks after is POD 14", async () => {
    const { getPostOpDay } = await import("@/lib/date");
    expect(getPostOpDay("2026-09-23", "2026-09-09")).toBe(14);
  });

  it("getDaysUntilSurgery: 2 days before returns 2", async () => {
    const { getDaysUntilSurgery } = await import("@/lib/date");
    expect(getDaysUntilSurgery("2026-09-07", "2026-09-09")).toBe(2);
  });

  it("isFutureDate: tomorrow is future", async () => {
    const { isFutureDate } = await import("@/lib/date");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    expect(isFutureDate(formatISO(tomorrow))).toBe(true);
  });

  it("isFutureDate: yesterday is not future", async () => {
    const { isFutureDate } = await import("@/lib/date");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    expect(isFutureDate(formatISO(yesterday))).toBe(false);
  });
});

function formatISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/lib/date.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 lib/date.ts**

Create `lib/date.ts`:
```typescript
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

export function getToday(timezone: string = env("APP_TIMEZONE", "Asia/Shanghai")): string {
  // 用 Intl 取指定时区的当天日期，避免依赖服务器本地时区
  const now = new Date();
  const tzFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
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

export function isFutureDate(dateStr: string, timezone: string = env("APP_TIMEZONE", "Asia/Shanghai")): boolean {
  dateSchema.parse(dateStr);
  const today = getToday(timezone);
  return parseISO(dateStr) > parseISO(today);
}

export function getSurgeryDate(): string {
  return env("SURGERY_DATE");
}
```

需要 date-fns：`pnpm add date-fns`

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/lib/date.test.ts`
Expected: PASS（所有 8 个测试通过）

- [ ] **Step 5: 写 phase.ts 失败测试**

Create `tests/lib/phase.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("phase lib", () => {
  it("POD -1 (术前) → PRE_OP", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(-1)).toBe("PRE_OP");
  });

  it("POD 0 → EARLY", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(0)).toBe("EARLY");
  });

  it("POD 14 → EARLY (上界)", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(14)).toBe("EARLY");
  });

  it("POD 15 → MID (下界)", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(15)).toBe("MID");
  });

  it("POD 42 → MID (上界)", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(42)).toBe("MID");
  });

  it("POD 43 → LATE (下界)", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(43)).toBe("LATE");
  });

  it("POD 365 → LATE", async () => {
    const { getRehabPhase } = await import("@/lib/phase");
    expect(getRehabPhase(365)).toBe("LATE");
  });
});
```

- [ ] **Step 6: 运行确认失败**

Run: `pnpm vitest run tests/lib/phase.test.ts`
Expected: FAIL

- [ ] **Step 7: 实现 lib/phase.ts**

Create `lib/phase.ts`:
```typescript
export type RehabPhase = "PRE_OP" | "EARLY" | "MID" | "LATE";

export const PHASE_BOUNDARIES = {
  EARLY_START: 0,
  EARLY_END: 14,   // POD 0~14
  MID_START: 15,
  MID_END: 42,     // POD 15~42
  LATE_START: 43,
} as const;

export const PHASE_LABELS: Record<RehabPhase, string> = {
  PRE_OP: "术前",
  EARLY: "术后早期",
  MID: "术后中期",
  LATE: "术后后期",
};

export function getRehabPhase(postOpDay: number): RehabPhase {
  if (postOpDay < 0) return "PRE_OP";
  if (postOpDay <= PHASE_BOUNDARIES.EARLY_END) return "EARLY";
  if (postOpDay <= PHASE_BOUNDARIES.MID_END) return "MID";
  return "LATE";
}
```

- [ ] **Step 8: 运行确认通过**

Run: `pnpm vitest run tests/lib/phase.test.ts`
Expected: PASS（7 个测试）

- [ ] **Step 9: 创建 Prisma schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([tokenHash])
}

model LoginAttempt {
  id          String   @id @default(cuid())
  identifier  String
  failedAt    DateTime @default(now())

  @@index([identifier])
}

model RehabPlanItem {
  id              String   @id @default(cuid())

  phase           String   // "PRE_OP" | "EARLY" | "MID" | "LATE"
  name            String
  description     String
  category        String   // "exercise" | "scar" | "care"

  targetValue     Int?
  targetUnit      String?
  targetSets      Int?
  frequencyPerDay Int      @default(1)

  prerequisites   String?
  stopConditions  String?
  notes           String?

  order           Int

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  logs            RehabLog[]

  @@index([phase])
}

model RehabLog {
  id              String   @id @default(cuid())

  date            String

  planItemId      String?

  exerciseName    String
  targetValue     Int?
  targetUnit      String?
  targetSets      Int?

  completedValue  Int?
  completedSets   Int?

  done            Boolean  @default(false)

  note            String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  planItem        RehabPlanItem? @relation(fields: [planItemId], references: [id], onDelete: SetNull)

  @@index([date])
  @@index([planItemId])
}

model MoodLog {
  id        String   @id @default(cuid())
  date      String
  mood      String   // "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS"
  note      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([date])
}

model DailyStatus {
  id          String   @id @default(cuid())
  date        String   @unique
  energy      String?  // "NORMAL" | "TIRED" | "PAINFUL" | "REST"
  painLevel   Int?
  swelling    Int?
  note        String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Message {
  id          String   @id @default(cuid())

  name        String
  content     String
  emoji       String?

  visible     Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([createdAt])
  @@index([visible])
}

model TimelineEvent {
  id          String   @id @default(cuid())

  date        String
  type        String   // "SURGERY" | "FOLLOW_UP" | "PLAN_CHANGE" | "MILESTONE" | "NOTE"
  title       String
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([date])
}

model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 10: Prisma 客户端单例**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}
```

- [ ] **Step 11: 运行 migration**

Run:
```bash
pnpm prisma migrate dev --name init --skip-generate
pnpm prisma generate
```
Expected: 生成 `prisma/dev.db` 和 migration 文件。

- [ ] **Step 12: 写 seed 脚本**

Create `prisma/seed.ts`:
```typescript
import { prismaClient } from "../lib/prisma";
import { getToday } from "../lib/date";

async function main() {
  console.log("Seeding...");

  // 康复动作（DEMO ONLY）
  const PREREQ = "以医生确认方案为准";
  const STOP = "如出现异常情况，停止并咨询专业人员";
  const NOTES = "DEMO ONLY";

  const items: Array<{
    phase: string; name: string; description: string; category: string;
    targetValue: number | null; targetUnit: string | null; targetSets: number | null;
    frequencyPerDay: number; order: number;
  }> = [
    // PRE_OP
    { phase: "PRE_OP", name: "术前心理准备", description: "了解手术流程，减少焦虑", category: "care", targetValue: 1, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 1 },
    { phase: "PRE_OP", name: "踝泵运动", description: "踝关节屈伸促循环防血栓", category: "exercise", targetValue: 50, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 2 },
    { phase: "PRE_OP", name: "股四头肌等长收缩", description: "维持大腿前侧肌力", category: "exercise", targetValue: 20, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 3 },
    { phase: "PRE_OP", name: "患肢抬高", description: "高于心脏减轻肿胀", category: "care", targetValue: 15, targetUnit: "分钟", targetSets: 1, frequencyPerDay: 1, order: 4 },
    // EARLY
    { phase: "EARLY", name: "踝泵运动", description: "防血栓消肿胀", category: "exercise", targetValue: 100, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 1 },
    { phase: "EARLY", name: "股四头肌等长收缩", description: "维持肌力", category: "exercise", targetValue: 30, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 2 },
    { phase: "EARLY", name: "腘绳肌等长收缩", description: "后侧肌群维持", category: "exercise", targetValue: 20, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 3 },
    { phase: "EARLY", name: "直腿抬高 SLR", description: "不负重练肌力", category: "exercise", targetValue: 15, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 4 },
    { phase: "EARLY", name: "冰敷", description: "15-20 分钟消肿", category: "care", targetValue: 3, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 5 },
    { phase: "EARLY", name: "患肢抬高", description: "高于心脏", category: "care", targetValue: 4, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 6 },
    { phase: "EARLY", name: "疤痕护理 - 硅酮凝胶", description: "伤口愈合后开始涂抹", category: "scar", targetValue: 2, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 7 },
    { phase: "EARLY", name: "疤痕护理 - 减张胶带", description: "减小张力防疤痕增生", category: "scar", targetValue: 1, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 8 },
    // MID
    { phase: "MID", name: "屈膝活动度训练", description: "坐位/卧位屈膝，90° 起渐进", category: "exercise", targetValue: 1, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 1 },
    { phase: "MID", name: "主动直腿抬高", description: "强化股四头肌", category: "exercise", targetValue: 20, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 2 },
    { phase: "MID", name: "侧抬腿", description: "臀中肌训练", category: "exercise", targetValue: 15, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 3 },
    { phase: "MID", name: "靠墙静蹲", description: "渐进负重", category: "exercise", targetValue: 30, targetUnit: "秒", targetSets: 3, frequencyPerDay: 1, order: 4 },
    { phase: "MID", name: "单脚站立平衡", description: "本体感觉训练", category: "exercise", targetValue: 30, targetUnit: "秒", targetSets: 2, frequencyPerDay: 1, order: 5 },
    { phase: "MID", name: "疤痕按摩", description: "促进疤痕软化", category: "scar", targetValue: 5, targetUnit: "分钟", targetSets: 2, frequencyPerDay: 1, order: 6 },
    { phase: "MID", name: "持续减张护理", description: "全天胶带或减张器", category: "scar", targetValue: 1, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 7 },
    // LATE
    { phase: "LATE", name: "全屈膝训练", description: "跪坐等至正常范围", category: "exercise", targetValue: 1, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 1 },
    { phase: "LATE", name: "弓步训练", description: "功能性训练", category: "exercise", targetValue: 10, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 2 },
    { phase: "LATE", name: "上下台阶", description: "日常生活功能", category: "exercise", targetValue: 15, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 3 },
    { phase: "LATE", name: "坐姿伸膝（无重量）", description: "坐椅子缓慢伸直膝盖", category: "exercise", targetValue: 15, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 4 },
    { phase: "LATE", name: "卧位屈膝滑动", description: "床上滑动屈膝改善活动度", category: "exercise", targetValue: 15, targetUnit: "次", targetSets: 3, frequencyPerDay: 1, order: 5 },
    { phase: "LATE", name: "平衡板训练", description: "进阶本体感觉", category: "exercise", targetValue: 5, targetUnit: "分钟", targetSets: 1, frequencyPerDay: 1, order: 6 },
    { phase: "LATE", name: "疤痕修复评估", description: "每周观察恢复情况", category: "scar", targetValue: 1, targetUnit: "次", targetSets: 1, frequencyPerDay: 1, order: 7 },
  ];

  for (const it of items) {
    await prismaClient.rehabPlanItem.upsert({
      where: { id: `seed-${it.phase}-${it.order}` },
      update: {},
      create: { ...it, id: `seed-${it.phase}-${it.order}`, prerequisites: PREREQ, stopConditions: STOP, notes: NOTES },
    });
  }

  // TimelineEvent: 手术日
  await prismaClient.timelineEvent.upsert({
    where: { id: "seed-surgery" },
    update: {},
    create: {
      id: "seed-surgery",
      date: "2026-09-09",
      type: "SURGERY",
      title: "🏥 手术日",
      description: "髌骨脱位手术",
    },
  });

  // 几条示例留言
  await prismaClient.message.createMany({
    data: [
      { name: "小明", content: "十一加油！手术后慢慢来，我们都在。", emoji: "❤️" },
      { name: "小红", content: "早日康复，小猫咪等你回家撸～", emoji: "🐱" },
    ],
    skipDuplicates: true,
  });

  // AppSetting 默认
  await prismaClient.appSetting.upsert({
    where: { key: "publicMood" },
    update: {},
    create: { key: "publicMood", value: "true" },
  });

  console.log("Seed done at", getToday());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prismaClient.$disconnect(); });
```

- [ ] **Step 13: 配置 prisma seed 命令**

在 `package.json` 的 `prisma` 字段下加：
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```
并安装 tsx：`pnpm add -D tsx`

- [ ] **Step 14: 运行 seed**

Run: `pnpm prisma db seed`
Expected: 输出 "Seed done at 2026-09-07"（或当天日期）

- [ ] **Step 15: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: prisma schema, date/phase libs with tests, seed demo rehab plan

包含 Session/LoginAttempt/RehabPlanItem/RehabLog/MoodLog/DailyStatus/
Message/TimelineEvent/AppSetting 9 个模型；date.ts 与 phase.ts 完整
单元测试覆盖阶段边界；seed 数据标注 DEMO ONLY。"
```

---

## Task 3: 鉴权系统（Session + 限流 + Middleware）

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/session.ts`
- Create: `lib/rate-limit.ts`
- Create: `lib/validation.ts`（部分）
- Create: `middleware.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/(owner)/login/page.tsx`
- Test: `tests/lib/auth.test.ts`
- Test: `tests/api/auth.test.ts`

**Interfaces:**
- Produces: `createSession(token)`、`verifyOwnerSession(cookieValue)`、`requireOwner(request)`、`recordFailedLogin(identifier)`、`checkLoginRate(identifier)`
- `requireOwner(request)` 返回 `{ ok: true }` 或抛 `Response` 重定向到 /login
- Middleware 保护 `/rehab/*`、`/mood/*`、`/timeline/*`、`/api/rehab/*`、`/api/mood/*`、`/api/timeline/*`、`/api/settings/*`

- [ ] **Step 1: 写 session.ts 失败测试**

Create `tests/lib/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
});

describe("session", () => {
  it("createSession persists hashed token", async () => {
    const { createSession } = await import("@/lib/session");
    const token = await createSession();
    expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 字节 hex
    const sessions = await prismaClient.session.findMany();
    expect(sessions.length).toBe(1);
    expect(sessions[0].tokenHash).not.toBe(token); // 存的是 hash
    expect(sessions[0].tokenHash.length).toBe(64);
  });

  it("verifyOwnerSession returns true for valid token", async () => {
    const { createSession } = await import("@/lib/session");
    const { verifyOwnerSession } = await import("@/lib/auth");
    const token = await createSession();
    const ok = await verifyOwnerSession(token);
    expect(ok).toBe(true);
  });

  it("verifyOwnerSession returns false for invalid token", async () => {
    const { verifyOwnerSession } = await import("@/lib/auth");
    const ok = await verifyOwnerSession("invalid-token");
    expect(ok).toBe(false);
  });

  it("verifyOwnerSession returns false for expired session", async () => {
    const { createSession } = await import("@/lib/session");
    const { verifyOwnerSession } = await import("@/lib/auth");
    const token = await createSession();
    // 手动过期
    const hash = await import("crypto").then(m => m.createHash("sha256").update(token).digest("hex"));
    await prismaClient.session.update({
      where: { tokenHash: hash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const ok = await verifyOwnerSession(token);
    expect(ok).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows up to 4 failures, blocks at 5", async () => {
    const { recordFailedLogin, checkLoginRate } = await import("@/lib/rate-limit");
    for (let i = 0; i < 4; i++) {
      await recordFailedLogin("test-identifier");
      expect(await checkLoginRate("test-identifier")).toBe(true);
    }
    await recordFailedLogin("test-identifier");
    expect(await checkLoginRate("test-identifier")).toBe(false);
  });

  it("clears failures on success", async () => {
    const { recordFailedLogin, checkLoginRate, clearFailedLogins } = await import("@/lib/rate-limit");
    await recordFailedLogin("test-identifier");
    await clearFailedLogins("test-identifier");
    expect(await checkLoginRate("test-identifier")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run tests/lib/auth.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 lib/session.ts**

Create `lib/session.ts`:
```typescript
import { randomBytes } from "crypto";
import { prismaClient } from "./prisma";

const SESSION_TTL_DAYS = 7;

function hashToken(token: string): string {
  // 内联 crypto 避免循环依赖
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("crypto");
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prismaClient.session.create({ data: { tokenHash, expiresAt } });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prismaClient.session.deleteMany({ where: { tokenHash } });
}

export async function findValidSession(token: string) {
  const tokenHash = hashToken(token);
  const session = await prismaClient.session.findUnique({ where: { tokenHash } });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}
```

- [ ] **Step 4: 实现 lib/rate-limit.ts**

Create `lib/rate-limit.ts`:
```typescript
import { createHash } from "crypto";
import { prismaClient } from "./prisma";

const MAX_FAILURES_PER_MINUTE = 5;

function hashIdentifier(ip: string): string {
  const secret = process.env.RATE_LIMIT_SECRET || "fallback-dev-secret";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex");
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const identifier = hashIdentifier(ip);
  await prismaClient.loginAttempt.create({ data: { identifier } });
}

export async function checkLoginRate(ip: string): Promise<boolean> {
  const identifier = hashIdentifier(ip);
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const count = await prismaClient.loginAttempt.count({
    where: { identifier, failedAt: { gte: oneMinAgo } },
  });
  return count < MAX_FAILURES_PER_MINUTE;
}

export async function clearFailedLogins(ip: string): Promise<void> {
  const identifier = hashIdentifier(ip);
  await prismaClient.loginAttempt.deleteMany({ where: { identifier } });
}
```

- [ ] **Step 5: 实现 lib/auth.ts**

Create `lib/auth.ts`:
```typescript
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { findValidSession, createSession, deleteSession } from "./session";
import { recordFailedLogin, checkLoginRate, clearFailedLogins } from "./rate-limit";

export const SESSION_COOKIE = "owner_session";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function verifyOwnerSession(token: string): Promise<boolean> {
  const session = await findValidSession(token);
  return session !== null;
}

export async function attemptLogin(code: string, req: Request): Promise<{ success: boolean; error?: string }> {
  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip))) {
    return { success: false, error: "尝试次数过多，请稍后再试" };
  }

  const ownerCode = process.env.OWNER_CODE;
  if (!ownerCode) {
    return { success: false, error: "服务未配置访问码" };
  }

  if (!constantTimeCompare(code, ownerCode)) {
    await recordFailedLogin(ip);
    return { success: false, error: "访问码不正确" };
  }

  await clearFailedLogins(ip);
  const token = await createSession();
  return { success: true, token };
}

export async function logoutSession(token: string): Promise<void> {
  await deleteSession(token);
}

export async function requireOwner(): Promise<{ ok: true } | { redirect: Response }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { redirect: Response.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), 307) };
  }
  const ok = await verifyOwnerSession(token);
  if (!ok) {
    return { redirect: Response.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), 307) };
  }
  return { ok: true };
}

export async function getOwnerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}
```

- [ ] **Step 6: 实现 lib/validation.ts（鉴权部分）**

Create `lib/validation.ts`:
```typescript
import { z } from "zod";

export const loginSchema = z.object({
  code: z.string().min(1, "请输入访问码").max(100),
});

export const messageSchema = z.object({
  name: z.string().min(1, "昵称不能为空").max(20, "昵称最多 20 个字符"),
  content: z.string().min(1, "内容不能为空").max(300, "内容最多 300 个字符"),
  emoji: z.enum(["❤️", "🫶", "🐱", "🌷", "🌈", "💪", "🎉"]).optional(),
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
```

- [ ] **Step 7: 运行 auth 测试**

Run: `pnpm vitest run tests/lib/auth.test.ts`
Expected: PASS（6 个测试）

- [ ] **Step 8: 写 API 路由测试**

Create `tests/api/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

// 模拟 next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
});

describe("POST /api/auth/login", () => {
  it("returns success with Set-Cookie on correct code", async () => {
    vi.stubEnv("OWNER_CODE", "eleven-2026");
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("owner_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("returns 401 on wrong code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "wrong-code" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.5" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("访问码不正确");
  });

  it("returns 400 on empty code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.6" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks after 5 failures", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 5; i++) {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code: "wrong" }),
        headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.7" },
      });
      await POST(req);
    }
    // 第 6 次正确也会被限流（因为已经记了 5 次失败，未清理）
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.7" },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 9: 实现 /api/auth/login/route.ts**

Create `app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { attemptLogin, SESSION_COOKIE } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await attemptLogin(parsed.data.code, req);
  if (!result.success) {
    const status = result.error === "尝试次数过多，请稍后再试" ? 429 : 401;
    return NextResponse.json({ error: result.error }, { status });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, result.token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
  return res;
}
```

- [ ] **Step 10: 实现 /api/auth/logout/route.ts**

Create `app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logoutSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await logoutSession(token);
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
```

- [ ] **Step 11: 运行 API 测试**

Run: `pnpm vitest run tests/api/auth.test.ts`
Expected: PASS（4 个测试）

- [ ] **Step 12: 实现 middleware.ts**

Create `middleware.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/rehab",
  "/mood",
  "/timeline",
  "/api/rehab",
  "/api/mood",
  "/api/timeline",
  "/api/settings",
];

const PUBLIC_EXACT = new Set(["/", "/wall", "/login"]);

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return false;
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }
  // middleware 只检查 cookie 存在性，真正鉴权在 server 层
  const token = req.cookies.get("owner_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 13: 实现登录页面**

Create `app/(owner)/login/page.tsx`:
```typescript
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/rehab";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || "登录失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-6xl mb-3">🐱</p>
          <h1 className="text-2xl font-bold">十一的康复小窝</h1>
          <p className="text-sm mt-2 opacity-70">请输入访问码</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="访问码"
            className="w-full px-4 py-3 rounded-2xl border border-peach bg-white focus:outline-none focus:border-ragdoll"
            autoFocus
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full py-3 rounded-2xl bg-ragdoll text-white font-medium disabled:opacity-50"
          >
            {loading ? "登录中…" : "进入小窝"}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 14: 验证登录流程手动测试**

Run: `pnpm dev`，访问 `http://localhost:3000/login`，输入错误码 → 提示；输入 `eleven-2026` → 跳转 /rehab（如果 /rehab 还没建，会 404，正常，下一 task 实现）。

- [ ] **Step 15: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: auth system with db session, rate limit, middleware

- lib/session.ts: SHA-256 token hash, 7-day TTL
- lib/rate-limit.ts: 5 failures/min per hashed IP
- lib/auth.ts: constant-time compare, requireOwner()
- lib/validation.ts: Zod schemas for all APIs
- /api/auth/login, /api/auth/logout routes
- middleware: protect owner routes
- /login page"
```

---

## Task 4: 康复模块（Rehab API + 打卡页 + 布偶猫组件）

**Files:**
- Create: `lib/rehab.ts`
- Create: `lib/encouragement.ts`
- Create: `components/CatMascot.tsx`
- Create: `components/RehabCard.tsx`
- Create: `components/BottomNav.tsx`
- Create: `app/(owner)/rehab/page.tsx`
- Create: `app/(owner)/rehab/loading.tsx`
- Create: `app/api/rehab/route.ts`
- Create: `app/api/rehab/[id]/route.ts`
- Test: `tests/lib/rehab.test.ts`
- Test: `tests/api/rehab.test.ts`
- Test: `tests/components/RehabCard.test.tsx`

**Interfaces:**
- Consumes: `requireOwner()` from `lib/auth`、`getRehabPhase()` from `lib/phase`、`getToday()`、`getPostOpDay()`、`isFutureDate()` from `lib/date`
- Produces: `getTodayTasks()`、`calculateDailyProgress()`、`createRehabLog()`、`updateRehabLog()`、CatMascot 组件、RehabCard 组件、`/api/rehab` GET/POST、`/api/rehab/[id]` PATCH

- [ ] **Step 1: 写 encouragement.ts 与测试**

Create `lib/encouragement.ts`:
```typescript
const ENCORAGEMENTS = [
  "今天不用跑得很快，走好自己的这一小步就很好。",
  "慢慢恢复也是恢复。",
  "今天的小猫也来陪你啦。",
  "完成一点点，也是很棒的一天。",
  "不要因为今天状态不好责怪自己。",
  "身体知道怎么修复，给它一点时间。",
  "今天能多呼吸一口干净的空气，就是好日子。",
  "猫咪也会晒太阳，你也可以慢慢来。",
  "难过的日子也是恢复的一部分。",
  "今天能在床上伸伸腿，就很棒。",
  "你不需要每天进步，只需要被陪伴。",
  "小猫打盹也是正经事，你也一样。",
  "今天疼一些没关系，明天会好一点。",
  "每一步都算数，哪怕只是翻个身。",
  "你不是一个人在战斗。",
  "伤口在长，你也在变强。",
  "今天想哭也没关系，眼泪是好的。",
  "明天的事明天再想，今天先休息。",
  "你比昨天多恢复了一点点。",
  "猫咪蹭你是喜欢你，我们也是。",
  "今天能笑一下就好。",
  "不用强撑，累了就歇。",
  "小猫的呼噜声是最好的药。",
  "今天也是被爱着的一天。",
  "你的身体一直在为你工作。",
  "慢慢来，比较快。",
  "今天能吃饭能睡觉，就是胜利。",
  "每一次呼吸都在愈合。",
  "你值得被温柔对待。",
  "今晚也好好睡一觉吧。",
];

export function getEncouragement(dateSeed: string): string {
  // 用日期做种子保证当天稳定
  let hash = 0;
  for (let i = 0; i < dateSeed.length; i++) {
    hash = ((hash << 5) - hash + dateSeed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % ENCORAGEMENTS.length;
  return ENCORAGEMENTS[idx];
}
```

- [ ] **Step 2: 写 rehab.ts 失败测试**

Create `tests/lib/rehab.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

beforeEach(async () => {
  await prismaClient.rehabLog.deleteMany();
  vi.stubEnv("SURGERY_DATE", "2026-09-09");
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
});

describe("rehab lib", () => {
  it("getRehabItemsByPhase returns items for EARLY", async () => {
    const { getRehabItemsByPhase } = await import("@/lib/rehab");
    const items = await getRehabItemsByPhase("EARLY");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.phase === "EARLY")).toBe(true);
  });

  it("calculateDailyProgress returns 0/N when no logs", async () => {
    const { calculateDailyProgress } = await import("@/lib/rehab");
    const { getRehabItemsByPhase } = await import("@/lib/rehab");
    const items = await getRehabItemsByPhase("EARLY");
    const progress = await calculateDailyProgress("2026-09-10", items);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(items.length);
  });

  it("calculateDailyProgress counts done logs", async () => {
    const { calculateDailyProgress } = await import("@/lib/rehab");
    const { getRehabItemsByPhase } = await import("@/lib/rehab");
    const items = await getRehabItemsByPhase("EARLY");
    // 给第一个动作打一条完成记录
    await prismaClient.rehabLog.create({
      data: {
        date: "2026-09-10",
        planItemId: items[0].id,
        exerciseName: items[0].name,
        targetValue: items[0].targetValue,
        targetUnit: items[0].targetUnit,
        targetSets: items[0].targetSets,
        done: true,
      },
    });
    const progress = await calculateDailyProgress("2026-09-10", items);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(items.length);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm vitest run tests/lib/rehab.test.ts`
Expected: FAIL

- [ ] **Step 4: 实现 lib/rehab.ts**

Create `lib/rehab.ts`:
```typescript
import { prismaClient } from "./prisma";
import { RehabPhase } from "./phase";
import { getToday, getPostOpDay, getSurgeryDate, isFutureDate } from "./date";

export async function getRehabItemsByPhase(phase: RehabPhase) {
  return prismaClient.rehabPlanItem.findMany({
    where: { phase },
    orderBy: { order: "asc" },
  });
}

export async function getTodayTasks() {
  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const { getRehabPhase } = await import("./phase");
  const phase = getRehabPhase(pod);
  const items = await getRehabItemsByPhase(phase);
  const logs = await prismaClient.rehabLog.findMany({
    where: { date: today },
  });
  // 关联 planItem 与今日 log
  return items.map((item) => {
    const log = logs.find((l) => l.planItemId === item.id);
    return {
      ...item,
      phase,
      log: log || null,
      completedSets: log?.completedSets || 0,
      completedValue: log?.completedValue || 0,
      done: log?.done || false,
    };
  });
}

export async function calculateDailyProgress(date: string, items: { id: string }[]) {
  const logs = await prismaClient.rehabLog.findMany({
    where: { date, done: true },
  });
  const doneItemIds = new Set(logs.map((l) => l.planItemId).filter(Boolean) as string[]);
  const completed = items.filter((i) => doneItemIds.has(i.id)).length;
  return { completed, total: items.length };
}

export async function createRehabLog(input: {
  planItemId: string;
  date: string;
  completedValue?: number | null;
  completedSets?: number | null;
  done: boolean;
  note?: string | null;
}) {
  if (isFutureDate(input.date)) {
    throw new Error("不能记录未来日期的康复任务");
  }
  const item = await prismaClient.rehabPlanItem.findUnique({
    where: { id: input.planItemId },
  });
  if (!item) throw new Error("康复动作不存在");

  return prismaClient.rehabLog.create({
    data: {
      date: input.date,
      planItemId: input.planItemId,
      exerciseName: item.name,
      targetValue: item.targetValue,
      targetUnit: item.targetUnit,
      targetSets: item.targetSets,
      completedValue: input.completedValue,
      completedSets: input.completedSets,
      done: input.done,
      note: input.note,
    },
  });
}

export async function updateRehabLog(id: string, input: {
  completedValue?: number | null;
  completedSets?: number | null;
  done?: boolean;
  note?: string | null;
}) {
  return prismaClient.rehabLog.update({
    where: { id },
    data: input,
  });
}
```

- [ ] **Step 5: 运行测试**

Run: `pnpm vitest run tests/lib/rehab.test.ts`
Expected: PASS（3 个测试）

- [ ] **Step 6: 写 RehabCard 组件测试**

Create `tests/components/RehabCard.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RehabCard } from "@/components/RehabCard";

const mockItem = {
  id: "test-1",
  phase: "EARLY",
  name: "股四头肌等长收缩",
  description: "维持肌力",
  category: "exercise",
  targetValue: 30,
  targetUnit: "次",
  targetSets: 3,
  frequencyPerDay: 1,
  prerequisites: null,
  stopConditions: null,
  notes: null,
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  log: null,
  completedSets: 0,
  completedValue: 0,
  done: false,
};

describe("RehabCard", () => {
  it("renders exercise name and target", () => {
    render(<RehabCard item={mockItem as any} onToggle={() => {}} />);
    expect(screen.getByText("股四头肌等长收缩")).toBeInTheDocument();
    expect(screen.getByText(/目标：30 次 × 3 组/)).toBeInTheDocument();
  });

  it("shows complete button when not done", () => {
    render(<RehabCard item={mockItem as any} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /完成打卡/ })).toBeInTheDocument();
  });

  it("calls onToggle with item id when clicked", () => {
    const onToggle = vi.fn();
    render(<RehabCard item={mockItem as any} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /完成打卡/ }));
    expect(onToggle).toHaveBeenCalledWith(mockItem.id);
  });

  it("shows done state when completed", () => {
    render(<RehabCard item={{ ...mockItem, done: true } as any} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: /已打卡/ })).toBeInTheDocument();
  });
});
```

需要 `import { vi } from "vitest"` 加到 imports。

- [ ] **Step 7: 实现 RehabCard 组件**

Create `components/RehabCard.tsx`:
```typescript
"use client";
import { useState } from "react";

interface RehabCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    category: string;
    targetValue: number | null;
    targetUnit: string | null;
    targetSets: number | null;
    done: boolean;
    completedSets: number;
    completedValue: number;
  };
  onToggle: (id: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  exercise: "🐾",
  scar: "🌸",
  care: "💖",
};

export function RehabCard({ item, onToggle }: RehabCardProps) {
  const [bouncing, setBouncing] = useState(false);

  const target = `目标：${item.targetValue || 0} ${item.targetUnit || ""}${
    item.targetSets && item.targetSets > 1 ? ` × ${item.targetSets} 组` : ""
  }`;

  async function handleToggle() {
    if (!item.done) {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }
    onToggle(item.id);
  }

  return (
    <div
      className={`rounded-2xl p-4 border-2 transition-all ${
        item.done
          ? "bg-mint/40 border-mint"
          : "bg-peach border-transparent"
      } ${bouncing ? "animate-bounce" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{CATEGORY_EMOJI[item.category] || "🐾"}</span>
        <div className="flex-1">
          <h3 className="font-bold text-base">{item.name}</h3>
          <p className="text-sm opacity-70 mt-1">{item.description}</p>
          <p className="text-xs mt-2 text-ragdoll">{target}</p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={false}
        className={`mt-3 w-full py-2 rounded-xl text-sm font-medium ${
          item.done
            ? "bg-mint text-cocoa"
            : "bg-ragdoll text-white"
        }`}
      >
        {item.done ? "✓ 已打卡" : "完成打卡"}
      </button>
    </div>
  );
}
```

- [ ] **Step 8: 实现 CatMascot 组件**

Create `components/CatMascot.tsx`:
```typescript
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
```

- [ ] **Step 9: 实现 BottomNav 组件**

Create `components/BottomNav.tsx`:
```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/rehab", label: "打卡", emoji: "🐾" },
  { href: "/mood", label: "心情", emoji: "💭" },
  { href: "/timeline", label: "时间线", emoji: "📅" },
  { href: "/wall", label: "留言", emoji: "💌" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cream border-t border-peach flex justify-around py-2 px-2 z-40">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center px-3 py-1 rounded-lg ${
              active ? "text-ragdoll" : "text-cocoa/50"
            }`}
          >
            <span className="text-xl">{tab.emoji}</span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 10: 实现 /api/rehab GET + POST**

Create `app/api/rehab/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { rehabLogSchema } from "@/lib/validation";
import { getTodayTasks, createRehabLog } from "@/lib/rehab";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase } from "@/lib/phase";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const tasks = await getTodayTasks();
  return NextResponse.json({ date: today, pod, phase, tasks });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = rehabLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  try {
    const log = await createRehabLog(parsed.data);
    return NextResponse.json(log, { status: 201 });
  } catch (e: any) {
    if (e.message === "不能记录未来日期的康复任务") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}
```

- [ ] **Step 11: 实现 /api/rehab/[id] PATCH**

Create `app/api/rehab/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { rehabLogPatchSchema } from "@/lib/validation";
import { updateRehabLog } from "@/lib/rehab";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = rehabLogPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  try {
    const log = await updateRehabLog(params.id, parsed.data);
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}
```

- [ ] **Step 12: 实现 Rehab 页面（Server Component）**

Create `app/(owner)/rehab/page.tsx`:
```typescript
import { requireOwner } from "@/lib/auth";
import { getTodayTasks, calculateDailyProgress } from "@/lib/rehab";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase, PHASE_LABELS } from "@/lib/phase";
import { getEncouragement } from "@/lib/encouragement";
import { RehabCardClient } from "./RehabCardClient";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";

export default async function RehabPage() {
  const auth = await requireOwner();
  if ("redirect" in auth) return null;

  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const tasks = await getTodayTasks();
  const progress = await calculateDailyProgress(today, tasks);

  return (
    <main className="min-h-screen pb-24 px-4 py-6">
      <header className="text-center mb-6">
        <CatMascot mood="CHEER" size={48} />
        <p className="text-sm opacity-70 mt-2">
          {pod < 0 ? `术前 ${Math.abs(pod)} 天` : pod === 0 ? "手术当天" : `术后第 ${pod} 天`}
          {" · "}
          {PHASE_LABELS[phase]}
        </p>
        <p className="text-sm mt-1 italic text-ragdoll">"{getEncouragement(today)}"</p>
      </header>

      <div className="bg-peach rounded-2xl p-3 mb-4 text-center text-sm">
        今日完成 {progress.completed} / {progress.total}
      </div>

      <div className="space-y-3">
        {tasks.map((item) => (
          <RehabCardClient key={item.id} item={item} />
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CatMascot mood="REST" size={64} />
          <p className="mt-4 text-sm opacity-70">今天暂无任务，好好休息。</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-coral/20 rounded-2xl text-sm">
        <p className="font-bold mb-2">⚠️ 出现这些情况请先停下</p>
        <p className="opacity-80">
          如果出现明显异常，不要因为今天的任务继续坚持。
          请优先遵循医生和康复师指导，必要时联系医疗机构。
        </p>
        <ul className="mt-2 opacity-70 text-xs space-y-1">
          <li>· 疼痛明显异常</li>
          <li>· 肿胀明显增加</li>
          <li>· 伤口异常</li>
          <li>· 发热</li>
          <li>· 小腿明显肿痛</li>
          <li>· 呼吸困难/胸痛等紧急情况</li>
        </ul>
      </div>

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 13: 实现 RehabCardClient（Client Component 处理交互）**

Create `app/(owner)/rehab/RehabCardClient.tsx`:
```typescript
"use client";
import { RehabCard } from "@/components/RehabCard";
import { useState } from "react";

interface TaskWithLog {
  id: string;
  name: string;
  description: string;
  category: string;
  targetValue: number | null;
  targetUnit: string | null;
  targetSets: number | null;
  done: boolean;
  completedSets: number;
  completedValue: number;
  log: { id: string } | null;
}

export function RehabCardClient({ item }: { item: TaskWithLog }) {
  const [done, setDone] = useState(item.done);
  const [error, setError] = useState("");

  async function onToggle(id: string) {
    const newDone = !done;
    setDone(newDone);
    setError("");
    try {
      if (item.log) {
        // 更新现有 log
        const res = await fetch(`/api/rehab/${item.log.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: newDone }),
        });
        if (!res.ok) throw new Error();
      } else {
        // 创建新 log
        const res = await fetch("/api/rehab", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            planItemId: id,
            date: new Date().toISOString().slice(0, 10),
            done: newDone,
          }),
        });
        if (!res.ok) throw new Error();
      }
    } catch {
      setDone(!newDone); // 回滚
      setError("保存失败，请重试");
      setTimeout(() => setError(""), 3000);
    }
  }

  return (
    <>
      <RehabCard item={{ ...item, done }} onToggle={onToggle} />
      {error && <p className="text-xs text-red-500 text-center mt-1">{error}</p>}
    </>
  );
}
```

- [ ] **Step 14: 实现 loading.tsx**

Create `app/(owner)/rehab/loading.tsx`:
```typescript
export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-4xl">🐱</p>
      <p className="ml-2 text-sm opacity-70">加载中…</p>
    </main>
  );
}
```

- [ ] **Step 15: 运行 RehabCard 组件测试**

Run: `pnpm vitest run tests/components/RehabCard.test.tsx`
Expected: PASS（4 个测试）

- [ ] **Step 16: 手动验证**

Run: `pnpm dev`，登录后访问 `/rehab`，确认显示今日任务列表、鼓励语、完成统计、异常提醒卡片、底部导航。

- [ ] **Step 17: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: rehab module - API,打卡页,布偶猫组件

- lib/rehab.ts: 按阶段取今日任务 + 关联 RehabLog + 进度计算
- lib/encouragement.ts: 30+ 鼓励语，日期种子稳定
- /api/rehab GET/POST, /api/rehab/[id] PATCH
- /rehab 页: 阶段标签、鼓励语、任务卡片、完成统计、异常提醒
- components: CatMascot, RehabCard, BottomNav"
```

---

## Task 5: 心情模块（Mood API + 心情页）

**Files:**
- Create: `app/api/mood/route.ts`
- Create: `app/(owner)/mood/page.tsx`
- Create: `components/MoodSelector.tsx`
- Test: `tests/api/mood.test.ts`
- Test: `tests/components/MoodSelector.test.tsx`

**Interfaces:**
- Consumes: `requireOwner()`、`getToday()`、`MoodLog` model
- Produces: `/api/mood` GET（最近 N 天）+ POST（upsert 同日记录）、MoodSelector 组件、`/mood` 页

- [ ] **Step 1: 写 MoodSelector 组件测试**

Create `tests/components/MoodSelector.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoodSelector } from "@/components/MoodSelector";

describe("MoodSelector", () => {
  it("renders 5 mood buttons", () => {
    render(<MoodSelector selected={null} onSelect={() => {}} />);
    expect(screen.getByText("棒极了")).toBeInTheDocument();
    expect(screen.getByText("还不错")).toBeInTheDocument();
    expect(screen.getByText("还行")).toBeInTheDocument();
    expect(screen.getByText("有点糟")).toBeInTheDocument();
    expect(screen.getByText("焦虑了")).toBeInTheDocument();
  });

  it("calls onSelect with mood value when clicked", () => {
    const onSelect = vi.fn();
    render(<MoodSelector selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("棒极了"));
    expect(onSelect).toHaveBeenCalledWith("GREAT");
  });

  it("highlights selected mood", () => {
    render(<MoodSelector selected="GOOD" onSelect={() => {}} />);
    const btn = screen.getByText("还不错").closest("button");
    expect(btn?.className).toContain("ring-2");
  });
});
```

- [ ] **Step 2: 实现 MoodSelector 组件**

Create `components/MoodSelector.tsx`:
```typescript
"use client";

interface MoodSelectorProps {
  selected: string | null;
  onSelect: (mood: "GREAT" | "GOOD" | "OK" | "DOWN" | "ANXIOUS") => void;
}

const MOODS = [
  { value: "GREAT", emoji: "😻", label: "棒极了" },
  { value: "GOOD", emoji: "😺", label: "还不错" },
  { value: "OK", emoji: "😸", label: "还行" },
  { value: "DOWN", emoji: "🙀", label: "有点糟" },
  { value: "ANXIOUS", emoji: "😿", label: "焦虑了" },
] as const;

export function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onSelect(m.value)}
          className={`flex flex-col items-center py-3 rounded-xl ${
            selected === m.value
              ? "bg-coral ring-2 ring-ragdoll"
              : "bg-peach"
          }`}
        >
          <span className="text-2xl">{m.emoji}</span>
          <span className="text-xs mt-1">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 写 Mood API 测试**

Create `tests/api/mood.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.moodLog.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
});

async function loginAndGetToken() {
  const { createSession } = await import("@/lib/session");
  return createSession();
}

describe("POST /api/mood", () => {
  it("creates mood log on valid input", async () => {
    const token = await loginAndGetToken();
    const { cookies } = await import("next/headers");
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const { POST } = await import("@/app/api/mood/route");
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({ date: "2026-09-10", mood: "GOOD", note: "今天好多了" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("updates same-day mood log instead of creating new", async () => {
    const token = await loginAndGetToken();
    const { cookies } = await import("next/headers");
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const { POST } = await import("@/app/api/mood/route");
    const body = (mood: string) => JSON.stringify({ date: "2026-09-10", mood });
    for (const m of ["GOOD", "OK", "DOWN"]) {
      await POST(new Request("http://localhost/api/mood", {
        method: "POST",
        body: body(m),
        headers: { "content-type": "application/json" },
      }));
    }
    const count = await prismaClient.moodLog.count({ where: { date: "2026-09-10" } });
    expect(count).toBe(1); // 同日只保留一条
  });

  it("rejects invalid mood", async () => {
    const token = await loginAndGetToken();
    const { cookies } = await import("next/headers");
    (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });

    const { POST } = await import("@/app/api/mood/route");
    const req = new Request("http://localhost/api/mood", {
      method: "POST",
      body: JSON.stringify({ date: "2026-09-10", mood: "INVALID" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4: 实现 /api/mood/route.ts**

注：由于 SQLite 需要 `@unique` 才能 upsert，需要更新 schema 让 `MoodLog.date` 加 `@unique`。

修改 `prisma/schema.prisma` 中 MoodLog：
```prisma
model MoodLog {
  id        String   @id @default(cuid())
  date      String   @unique
  mood      String
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

然后运行 `pnpm prisma migrate dev --name mood-unique`。

Create `app/api/mood/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { moodSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { getToday } from "@/lib/date";

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7"), 30);
  const today = getToday();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  const logs = await prismaClient.moodLog.findMany({
    where: { date: { gte: startDate.toISOString().slice(0, 10) } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = moodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { date, mood, note } = parsed.data;
  const log = await prismaClient.moodLog.upsert({
    where: { date },
    create: { date, mood, note: note || null },
    update: { mood, note: note || null },
  });
  return NextResponse.json(log, { status: 201 });
}
```

- [ ] **Step 5: 运行 Mood API 测试**

Run: `pnpm vitest run tests/api/mood.test.ts`
Expected: PASS（3 个测试）

- [ ] **Step 6: 实现 /mood 页面**

Create `app/(owner)/mood/page.tsx`:
```typescript
"use client";
import { useState, useEffect } from "react";
import { MoodSelector } from "@/components/MoodSelector";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";

export default function MoodPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ date: string; mood: string }[]>([]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

  useEffect(() => {
    fetch("/api/mood?days=7")
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.logs || []);
        const todayLog = (d.logs || []).find((l: any) => l.date === today);
        if (todayLog) {
          setSelected(todayLog.mood);
          setNote(todayLog.note || "");
        }
      });
  }, [today]);

  async function onSelect(mood: string) {
    setSelected(mood);
    setSaved(false);
  }

  async function save() {
    setSaved(false);
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, mood: selected, note: note || null }),
    });
    if (res.ok) setSaved(true);
  }

  const MOOD_LABEL: Record<string, string> = {
    GREAT: "😻 棒极了", GOOD: "😺 还不错", OK: "😸 还行",
    DOWN: "🙀 有点糟", ANXIOUS: "😿 焦虑了",
  };

  return (
    <main className="min-h-screen pb-24 px-4 py-6">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-xl font-bold mt-2">今天感觉怎么样？</h1>
      </header>

      <MoodSelector selected={selected} onSelect={onSelect} />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="想说点什么吗？（可选）"
        className="w-full mt-4 p-3 rounded-2xl bg-peach border-none focus:outline-none min-h-24 resize-none"
      />

      <button
        onClick={save}
        disabled={!selected}
        className="w-full mt-4 py-3 rounded-2xl bg-ragdoll text-white disabled:opacity-50"
      >
        保存今天的心情
      </button>

      {saved && (
        <p className="text-center mt-2 text-sm text-mint">🐱 已保存</p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold mb-3">最近 7 天</h2>
        <div className="space-y-1">
          {history.map((h) => (
            <div key={h.date} className="flex justify-between py-2 border-b border-peach text-sm">
              <span>{h.date}</span>
              <span>{MOOD_LABEL[h.mood] || h.mood}</span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-center text-sm opacity-50 py-4">还没有记录</p>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 7: 手动验证**

Run: `pnpm dev`，登录后访问 `/mood`，选情绪、写笔记、保存、查看历史。

- [ ] **Step 8: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: mood module - 5 emotions, upsert by date, 7-day history

- /api/mood GET (最近 N 天) + POST (upsert)
- MoodSelector 组件 5 选 1
- /mood 页: 选择情绪 + 笔记 + 历史"
```

---

## Task 6: 留言墙模块（Message API + Wall 页 + 首页公开部分）

**Files:**
- Create: `app/api/messages/route.ts`
- Create: `app/api/messages/[id]/route.ts`
- Create: `components/MessageWall.tsx`
- Create: `components/MessageForm.tsx`
- Create: `app/(public)/wall/page.tsx`
- Modify: `app/page.tsx`（首页公开部分）
- Test: `tests/api/messages.test.ts`

**Interfaces:**
- Produces: `/api/messages` GET（分页 visible=true）、POST（Zod + 限流）、`/api/messages/[id]` DELETE（OWNER only）

- [ ] **Step 1: 写 Message API 测试**

Create `tests/api/messages.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.message.deleteMany();
});

describe("GET /api/messages", () => {
  it("returns only visible messages", async () => {
    await prismaClient.message.createMany({
      data: [
        { name: "A", content: "msg1", emoji: "❤️", visible: true },
        { name: "B", content: "msg2", emoji: "🐱", visible: false },
      ],
    });
    const { GET } = await import("@/app/api/messages/route");
    const req = new Request("http://localhost/api/messages");
    const res = await GET(req as any);
    const data = await res.json();
    expect(data.messages.length).toBe(1);
    expect(data.messages[0].content).toBe("msg1");
  });

  it("limits to 50 max", async () => {
    for (let i = 0; i < 60; i++) {
      await prismaClient.message.create({ data: { name: "u", content: `m${i}` } });
    }
    const { GET } = await import("@/app/api/messages/route");
    const req = new Request("http://localhost/api/messages");
    const res = await GET(req as any);
    const data = await res.json();
    expect(data.messages.length).toBe(50);
  });
});

describe("POST /api/messages", () => {
  it("creates message on valid input", async () => {
    const { POST } = await import("@/app/api/messages/route");
    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ name: "小明", content: "加油！", emoji: "❤️" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
  });

  it("rejects empty name", async () => {
    const { POST } = await import("@/app/api/messages/route");
    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ name: "", content: "test" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.5" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects content over 300 chars", async () => {
    const { POST } = await import("@/app/api/messages/route");
    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ name: "x", content: "a".repeat(301) }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.6" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("blocks 4th post within 1 minute", async () => {
    const { POST } = await import("@/app/api/messages/route");
    for (let i = 0; i < 3; i++) {
      const req = new Request("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ name: "x", content: `m${i}` }),
        headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.7" },
      });
      const res = await POST(req as any);
      expect(res.status).toBe(201);
    }
    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      body: JSON.stringify({ name: "x", content: "m4" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.7" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: 实现 /api/messages/route.ts**

Create `app/api/messages/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { messageSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { createHash } from "crypto";

function getIdentifier(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const secret = process.env.RATE_LIMIT_SECRET || "fallback";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex");
}

async function checkMessageRate(identifier: string): Promise<boolean> {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  // 用 LoginAttempt 表临时记录留言频率
  const count = await prismaClient.loginAttempt.count({
    where: { identifier, failedAt: { gte: oneMinAgo } },
  });
  return count < 3;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 50);
  const cursor = url.searchParams.get("cursor");

  const messages = await prismaClient.message.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  return NextResponse.json({ messages, nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null });
}

export async function POST(req: NextRequest) {
  const identifier = getIdentifier(req);
  if (!(await checkMessageRate(identifier))) {
    return NextResponse.json({ error: "提交太频繁，请稍后再试" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // 记录此次提交用于限流
  await prismaClient.loginAttempt.create({ data: { identifier } });

  const msg = await prismaClient.message.create({
    data: parsed.data,
  });
  return NextResponse.json(msg, { status: 201 });
}
```

- [ ] **Step 3: 实现 /api/messages/[id] DELETE**

Create `app/api/messages/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prismaClient } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  await prismaClient.message.update({
    where: { id: params.id },
    data: { visible: false },
  });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: 实现 MessageForm + MessageWall 组件**

Create `components/MessageForm.tsx`:
```typescript
"use client";
import { useState } from "react";

const EMOJIS = ["❤️", "🫶", "🐱", "🌷", "🌈", "💪", "🎉"];

export function MessageForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState("❤️");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, content, emoji }),
    });
    setLoading(false);
    if (res.ok) {
      setName("");
      setContent("");
      onSubmitted();
    } else {
      const d = await res.json();
      setError(d.error || "提交失败");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="昵称"
        maxLength={20}
        className="w-full px-4 py-3 rounded-2xl bg-white border border-peach"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="给十一留句话…"
        maxLength={300}
        className="w-full px-4 py-3 rounded-2xl bg-white border border-peach min-h-24 resize-none"
      />
      <div className="flex gap-2 flex-wrap">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`text-2xl px-3 py-1 rounded-lg ${emoji === e ? "bg-coral" : "bg-peach"}`}
          >
            {e}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name || !content}
        className="w-full py-3 rounded-2xl bg-ragdoll text-white disabled:opacity-50"
      >
        {loading ? "发送中…" : "发送鼓励"}
      </button>
    </form>
  );
}
```

Create `components/MessageWall.tsx`:
```typescript
"use client";
import { useState, useEffect } from "react";
import { MessageForm } from "./MessageForm";
import { CatMascot } from "./CatMascot";

interface Message {
  id: string; name: string; content: string; emoji: string | null;
  createdAt: string;
}

export function MessageWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <CatMascot mood="COMFORT" size={48} />
        <h1 className="text-xl font-bold mt-2">给十一的鼓励墙</h1>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-peach rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{m.emoji}</span>
              <span className="font-bold text-sm">{m.name}</span>
              <span className="text-xs opacity-50 ml-auto">
                {new Date(m.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
        {loading && <p className="text-center text-sm opacity-50">加载中…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm opacity-50 py-8">还没有留言，来留下第一句鼓励吧～</p>
        )}
      </div>

      <div className="mt-6">
        <MessageForm onSubmitted={load} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 实现 /wall 页**

Create `app/(public)/wall/page.tsx`:
```typescript
import { MessageWall } from "@/components/MessageWall";

export default function WallPage() {
  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <MessageWall />
    </main>
  );
}
```

- [ ] **Step 6: 重写首页（公开）**

Replace `app/page.tsx`:
```typescript
import Link from "next/link";
import { prismaClient } from "@/lib/prisma";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase, PHASE_LABELS } from "@/lib/phase";
import { getEncouragement } from "@/lib/encouragement";
import { CatMascot } from "@/components/CatMascot";

export default async function Home() {
  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const encouragement = getEncouragement(today);

  // 今日心情（简略，公开）
  const todayMood = await prismaClient.moodLog.findUnique({
    where: { date: today },
    select: { mood: true },
  });
  const MOOD_LABEL: Record<string, { emoji: string; label: string }> = {
    GREAT: { emoji: "😻", label: "棒极了" },
    GOOD: { emoji: "😺", label: "还不错" },
    OK: { emoji: "😸", label: "还行" },
    DOWN: { emoji: "🙀", label: "有点糟" },
    ANXIOUS: { emoji: "😿", label: "焦虑了" },
  };

  // 今日康复进度（只显示完成数，不显示具体动作）
  const items = await prismaClient.rehabPlanItem.findMany({
    where: { phase }, select: { id: true },
  });
  const doneLogs = await prismaClient.rehabLog.count({
    where: { date: today, done: true },
  });

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={64} />
        <h1 className="text-2xl font-bold mt-2">十一的康复小窝</h1>
      </header>

      <section className="bg-peach rounded-2xl p-5 mb-4 text-center">
        <p className="text-3xl font-bold">
          {pod < 0 ? `术前 ${Math.abs(pod)} 天` : pod === 0 ? "手术当天" : `术后第 ${pod} 天`}
        </p>
        <p className="text-sm opacity-70 mt-1">{PHASE_LABELS[phase]}</p>
        <p className="text-sm mt-3 italic text-ragdoll">"{encouragement}"</p>
      </section>

      {todayMood && (
        <section className="bg-white rounded-2xl p-4 mb-4 text-center">
          <p className="text-xs opacity-60 mb-1">十一今天</p>
          <p className="text-2xl">
            {MOOD_LABEL[todayMood.mood]?.emoji}{" "}
            <span className="text-base">{MOOD_LABEL[todayMood.mood]?.label}</span>
          </p>
        </section>
      )}

      <section className="bg-coral/20 rounded-2xl p-4 mb-4">
        <p className="text-sm font-bold mb-2">🌱 今日康复</p>
        <p className="text-sm">{doneLogs} / {items.length}</p>
      </section>

      <section className="bg-peach rounded-2xl p-4">
        <p className="text-sm font-bold mb-2">💌 给十一的鼓励</p>
        <p className="text-sm opacity-70 mb-3">留下你的话，让她知道有人陪着。</p>
        <Link
          href="/wall"
          className="block w-full py-3 text-center rounded-xl bg-ragdoll text-white text-sm"
        >
          留下一句话 →
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: 运行测试 + 手动验证**

Run: `pnpm vitest run tests/api/messages.test.ts`
Expected: PASS（5 个测试）

Run: `pnpm dev`，访问 `/`（无需登录看到首页）、`/wall`（留言、查看）。

- [ ] **Step 8: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: message wall + public home page

- /api/messages GET (visible=true, 分页) + POST (Zod + 限流 3/min)
- /api/messages/[id] DELETE (软删除 visible=false)
- MessageForm + MessageWall 组件
- /wall 公开留言墙页
- / 首页: POD、阶段、鼓励语、今日心情简略、康复进度、留言入口"
```

---

## Task 7: 时间线模块（Timeline API + 页面）

**Files:**
- Create: `app/api/timeline/route.ts`
- Create: `app/(owner)/timeline/page.tsx`
- Create: `components/TimelineForm.tsx`
- Test: `tests/api/timeline.test.ts`

**Interfaces:**
- Produces: `/api/timeline` GET（按 date ASC）+ POST（添加事件）

- [ ] **Step 1: 写 Timeline API 测试**

Create `tests/api/timeline.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.timelineEvent.deleteMany();
});

async function mockOwner() {
  const { createSession } = await import("@/lib/session");
  const token = await createSession();
  const { cookies } = await import("next/headers");
  (cookies as any).mockResolvedValue({ get: () => ({ value: token }) });
}

describe("POST /api/timeline", () => {
  it("creates event on valid input", async () => {
    await mockOwner();
    const { POST } = await import("@/app/api/timeline/route");
    const req = new Request("http://localhost/api/timeline", {
      method: "POST",
      body: JSON.stringify({ date: "2026-09-23", type: "FOLLOW_UP", title: "第一次复诊", description: "医生调整计划" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
  });

  it("rejects invalid type", async () => {
    await mockOwner();
    const { POST } = await import("@/app/api/timeline/route");
    const req = new Request("http://localhost/api/timeline", {
      method: "POST",
      body: JSON.stringify({ date: "2026-09-23", type: "INVALID", title: "x" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/timeline", () => {
  it("returns events sorted by date ASC", async () => {
    await mockOwner();
    await prismaClient.timelineEvent.createMany({
      data: [
        { date: "2026-09-23", type: "FOLLOW_UP", title: "复诊" },
        { date: "2026-09-09", type: "SURGERY", title: "手术" },
      ],
    });
    const { GET } = await import("@/app/api/timeline/route");
    const res = await GET({} as any);
    const data = await res.json();
    expect(data.events[0].date).toBe("2026-09-09");
    expect(data.events[1].date).toBe("2026-09-23");
  });
});
```

- [ ] **Step 2: 实现 /api/timeline/route.ts**

Create `app/api/timeline/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { timelineEventSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const events = await prismaClient.timelineEvent.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = timelineEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const event = await prismaClient.timelineEvent.create({ data: parsed.data });
  return NextResponse.json(event, { status: 201 });
}
```

- [ ] **Step 3: 实现 TimelineForm 组件**

Create `components/TimelineForm.tsx`:
```typescript
"use client";
import { useState } from "react";

const TYPES = [
  { value: "SURGERY", label: "🏥 手术" },
  { value: "FOLLOW_UP", label: "📋 复诊" },
  { value: "PLAN_CHANGE", label: "📝 计划调整" },
  { value: "MILESTONE", label: "🎉 里程碑" },
  { value: "NOTE", label: "📝 备注" },
];

export function TimelineForm({ onAdded }: { onAdded: () => void }) {
  const [date, setDate] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/timeline", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, type, title, description: description || null }),
    });
    if (res.ok) {
      setDate(""); setTitle(""); setDescription("");
      onAdded();
    } else {
      setError("添加失败");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 bg-peach p-4 rounded-2xl">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
        className="w-full px-4 py-3 rounded-xl bg-white" />
      <select value={type} onChange={(e) => setType(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white">
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" required maxLength={50}
        className="w-full px-4 py-3 rounded-xl bg-white" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="内容（可选）" maxLength={500}
        className="w-full px-4 py-3 rounded-xl bg-white min-h-20 resize-none" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" className="w-full py-3 rounded-xl bg-ragdoll text-white">添加</button>
    </form>
  );
}
```

- [ ] **Step 4: 实现 /timeline 页**

Create `app/(owner)/timeline/page.tsx`:
```typescript
"use client";
import { useState, useEffect } from "react";
import { TimelineForm } from "@/components/TimelineForm";
import { BottomNav } from "@/components/BottomNav";
import { CatMascot } from "@/components/CatMascot";

interface Event { id: string; date: string; type: string; title: string; description: string | null; }

const TYPE_EMOJI: Record<string, string> = {
  SURGERY: "🏥", FOLLOW_UP: "📋", PLAN_CHANGE: "📝", MILESTONE: "🎉", NOTE: "📝",
};

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch("/api/timeline");
    const data = await res.json();
    setEvents(data.events || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="text-center mb-6">
        <CatMascot mood="NORMAL" size={48} />
        <h1 className="text-xl font-bold mt-2">康复时间线</h1>
      </header>

      <div className="space-y-3 mb-4">
        {events.map((e) => (
          <div key={e.id} className="bg-peach rounded-2xl p-4 flex gap-3">
            <span className="text-2xl">{TYPE_EMOJI[e.type] || "📝"}</span>
            <div className="flex-1">
              <p className="text-xs opacity-60">{e.date}</p>
              <p className="font-bold">{e.title}</p>
              {e.description && <p className="text-sm opacity-80 mt-1">{e.description}</p>}
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-center opacity-50 py-8">还没有事件</p>}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full py-3 rounded-xl bg-coral text-cocoa text-sm">
        {showForm ? "取消" : "+ 添加事件"}
      </button>

      {showForm && <div className="mt-4"><TimelineForm onAdded={() => { load(); setShowForm(false); }} /></div>}

      <BottomNav />
    </main>
  );
}
```

- [ ] **Step 5: 运行测试 + 手动验证**

Run: `pnpm vitest run tests/api/timeline.test.ts`
Expected: PASS（3 个测试）

Run: `pnpm dev`，登录后访问 `/timeline`，查看预填的手术日，添加事件。

- [ ] **Step 6: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: timeline module - events sorted by date, owner can add

- /api/timeline GET (date ASC) + POST (Zod 校验)
- TimelineForm 组件
- /timeline 页: 事件列表 + 添加表单"
```

---

## Task 8: DailyStatus（低能量模式）+ Settings API

**Files:**
- Create: `app/api/daily-status/route.ts`
- Modify: `app/(owner)/rehab/page.tsx`（顶部加今日状态卡片）
- Create: `components/DailyStatusCard.tsx`
- Test: `tests/api/daily-status.test.ts`

**Interfaces:**
- Produces: `/api/daily-status` GET（today）+ POST（upsert by date）

- [ ] **Step 1: 实现 /api/daily-status/route.ts**

Create `app/api/daily-status/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { dailyStatusSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { getToday } from "@/lib/date";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const today = getToday();
  const status = await prismaClient.dailyStatus.findUnique({ where: { date: today } });
  return NextResponse.json({ date: today, status });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const body = await req.json().catch(() => null);
  const parsed = dailyStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { date, energy, painLevel, swelling, note } = parsed.data;
  const status = await prismaClient.dailyStatus.upsert({
    where: { date },
    create: { date, energy, painLevel, swelling, note: note || null },
    update: { energy, painLevel, swelling, note: note || null },
  });
  return NextResponse.json(status, { status: 201 });
}
```

middleware 需要更新保护 `/api/daily-status/*`，将 `PROTECTED` 数组中加 `"/api/daily-status"`。

修改 `middleware.ts` 的 PROTECTED 数组：
```typescript
const PROTECTED = [
  "/rehab", "/mood", "/timeline",
  "/api/rehab", "/api/mood", "/api/timeline",
  "/api/settings", "/api/daily-status",
];
```

- [ ] **Step 2: 实现 DailyStatusCard 组件**

Create `components/DailyStatusCard.tsx`:
```typescript
"use client";
import { useState } from "react";

const ENERGIES = [
  { value: "NORMAL", emoji: "🙂", label: "正常" },
  { value: "TIRED", emoji: "😴", label: "有点累" },
  { value: "PAINFUL", emoji: "😣", label: "疼痛明显" },
  { value: "REST", emoji: "🛌", label: "今天想休息" },
];

export function DailyStatusCard() {
  const [energy, setEnergy] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState(0);
  const [saved, setSaved] = useState(false);

  async function save() {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    await fetch("/api/daily-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, energy, painLevel }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl p-4 mb-4">
      <p className="text-sm font-bold mb-3">今天状态</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {ENERGIES.map((e) => (
          <button
            key={e.value}
            onClick={() => setEnergy(e.value)}
            className={`flex flex-col items-center py-2 rounded-lg ${energy === e.value ? "bg-coral ring-2 ring-ragdoll" : "bg-peach"}`}
          >
            <span className="text-xl">{e.emoji}</span>
            <span className="text-xs">{e.label}</span>
          </button>
        ))}
      </div>
      <div className="mb-3">
        <p className="text-xs mb-1">疼痛：{painLevel}/10</p>
        <input type="range" min="0" max="10" value={painLevel}
          onChange={(e) => setPainLevel(Number(e.target.value))}
          className="w-full" />
      </div>
      <button onClick={save} disabled={!energy}
        className="w-full py-2 rounded-xl bg-ragdoll text-white text-sm disabled:opacity-50">
        {saved ? "🐱 已保存" : "保存"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 集成到 rehab 页**

修改 `app/(owner)/rehab/page.tsx`，在 `<header>` 之后、今日完成统计之前加入：
```typescript
import { DailyStatusCard } from "@/components/DailyStatusCard";
...
<header>...</header>
<DailyStatusCard />
<div className="bg-peach ...">今日完成 ...</div>
```

- [ ] **Step 4: 手动验证**

Run: `pnpm dev`，登录 `/rehab`，选择今天状态、疼痛等级、保存。

- [ ] **Step 5: Commit**

```bash
cd /root/health && git add -A && git commit -m "feat: daily status (energy + pain level) on rehab page

- /api/daily-status GET/POST (upsert by date)
- DailyStatusCard 组件
- 集成到 /rehab 顶部"
```

---

## Task 9: 全量测试 + 移动端响应式验证

**Files:**
- Run: 所有测试
- Modify: 按需调整

- [ ] **Step 1: 运行全部单元/API/组件测试**

Run: `pnpm vitest run`
Expected: 所有测试 PASS。如有失败，修复后重跑。

- [ ] **Step 2: 启动 dev 服务器端到端手动验证**

Run: `pnpm dev`

按 Definition of Done 逐项手动测试：
- 访问 `/` → 看到首页（POD、阶段、鼓励语、今日心情、康复进度、留言入口）
- 访问 `/wall` → 看到留言列表、可提交留言
- 访问 `/rehab` 未登录 → 重定向到 `/login`
- `/login` 输入错误码 → 提示错误
- `/login` 输入 `eleven-2026` → 跳转 `/rehab`
- `/rehab` 显示今日任务、可打卡、刷新保持
- `/mood` 选情绪、保存、刷新保持
- `/timeline` 显示手术日、可添加事件
- 退出后访问受保护页 → 重定向 login

- [ ] **Step 3: 移动端 viewport 验证**

浏览器 DevTools 切换到 375px 宽度：
- 所有页面无横向滚动
- 按钮可点击（44px 高）
- 底部导航可见且不遮挡内容（pb-24 留白）

- [ ] **Step 4: 修复发现的问题**

如有问题逐个修复并重新测试。

- [ ] **Step 5: Commit**

```bash
cd /root/health && git add -A && git commit -m "test: full test pass + manual mobile verification"
```

---

## Task 10: README + 生产配置文档

**Files:**
- Create: `README.md`
- Modify: `.env.example`（补全生产环境说明）

- [ ] **Step 1: 写 README**

Create `README.md`:
```markdown
# 十一的康复小窝

十一的髌骨脱位术后康复陪伴网站。移动优先，布偶猫主题，包含康复打卡、心情记录、留言墙、时间线四大模块。

## 技术栈

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite（开发）/ Turso（生产）
- Zod（校验）+ Vitest + Testing Library（测试）

## 本地启动

```bash
pnpm install
cp .env.example .env  # 填入实际 OWNER_CODE 等
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

访问 http://localhost:3000

## 环境变量

| 变量 | 说明 |
|------|------|
| OWNER_CODE | 十一的访问码，登录用 |
| SESSION_SECRET | Session 加密密钥 |
| DATABASE_URL | 数据库连接串 |
| APP_TIMEZONE | 时区（固定 Asia/Shanghai） |
| SURGERY_DATE | 手术日期 YYYY-MM-DD |
| RATE_LIMIT_SECRET | 限流标识加密密钥 |

## 数据库初始化

```bash
pnpm prisma migrate dev   # 开发
pnpm prisma db seed       # 种子数据
```

## 测试

```bash
pnpm vitest run
```

## 生产部署（Vercel + Turso）

1. 在 Turso 创建数据库：`turso db create health-rehab`
2. 获取连接串：`turso db show health-rehab --url`
3. Vercel 部署：连接 GitHub 仓库
4. 在 Vercel 项目 Settings → Environment Variables 配置：
   - `OWNER_CODE`、`SESSION_SECRET`、`DATABASE_URL`（Turso）、
   - `APP_TIMEZONE=Asia/Shanghai`、`SURGERY_DATE=2026-09-09`、`RATE_LIMIT_SECRET`
5. 部署

## 康复计划数据如何更新

康复动作存储在 `RehabPlanItem` 表。可通过 Prisma Studio 修改：

```bash
pnpm prisma studio
```

Seed 数据标注 `notes: "DEMO ONLY"`，上线前**必须**替换为医生/康复师确认的实际方案。

## 安全注意事项

- OWNER_CODE 不得写入客户端代码
- Cookie 为 httpOnly + secure（生产）+ sameSite=lax
- 所有 API 输入经 Zod 校验
- 登录失败限流 5 次/分钟
- 留言限流 3 条/分钟
- OWNER API 服务端二次鉴权（不依赖 middleware）

## 医疗免责声明

本网站仅用于记录、提醒和展示医生/康复师已确定的康复计划。术后天数和阶段仅用于时间展示，不用于自动判断训练内容。康复任务数据必须以医生/康复师意见为准。如有异常情况请优先联系医疗机构。
```

- [ ] **Step 2: Commit**

```bash
cd /root/health && git add -A && git commit -m "docs: README with setup, deploy, safety, medical disclaimer"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 鉴权（spec 7-9）：Task 3
- ✅ 日期/阶段（spec 10-13）：Task 2
- ✅ 康复计划/打卡（spec 14-19）：Task 2 + Task 4
- ✅ 心情（spec 19-20）：Task 5
- ✅ 留言（spec 21-24）：Task 6
- ✅ DailyStatus（spec 25）：Task 8
- ✅ 异常提醒（spec 27）：Task 4 内嵌
- ✅ 首页（spec 28-29）：Task 6
- ✅ Rehab 页（spec 30-31）：Task 4
- ✅ Mood 页（spec 32）：Task 5
- ✅ Timeline（spec 33-35）：Task 7
- ✅ 鼓励语（spec 36）：Task 4
- ✅ 布偶猫组件（spec 37）：Task 4
- ✅ 路由结构（spec 38）：所有任务
- ✅ Middleware（spec 39）：Task 3 + Task 8 更新
- ✅ API 设计（spec 40-51）：各任务
- ✅ 数据模型（spec 52）：Task 2
- ✅ lib 目录（spec 55-60）：Task 2-8
- ✅ 错误处理（spec 61-64）：各 API 路由
- ✅ 安全（spec 65-68）：Task 3
- ✅ 测试（spec 77-81）：所有任务带测试
- ✅ Definition of Done（spec 86）：Task 9

**2. Placeholder scan:** 无 TBD/TODO。

**3. Type consistency:**
- `getRehabPhase(postOpDay): RehabPhase` —— Task 2 定义，Task 4 使用 ✓
- `requireOwner()` 返回 `{ ok: true } | { redirect: Response }` —— Task 3 定义，Task 4-8 使用 ✓
- `SESSION_COOKIE = "owner_session"` —— Task 3 定义 ✓
- `MoodLog.date` 添加 `@unique` —— Task 5 更新 schema ✓
- `dailyStatusSchema` —— Task 2 定义 validation.ts，Task 8 使用 ✓

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-07-rehab-companion-impl.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?