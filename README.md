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

访问 http://localhost:8080

## 环境变量

| 变量 | 说明 |
|------|------|
| OWNER_CODE | 十一的访问码，登录用 |
| SESSION_SECRET | Session 加密密钥 |
| DATABASE_URL | 数据库连接串 |
| APP_TIMEZONE | 时区（固定 Asia/Shanghai） |
| SURGERY_DATE | 手术日期 YYYY-MM-DD |
| RATE_LIMIT_SECRET | 限流标识加密密钥 |
| NEXT_PUBLIC_BASE_URL | 站点根 URL |

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
   - `APP_TIMEZONE=Asia/Shanghai`、`SURGERY_DATE=2026-09-09`、`RATE_LIMIT_SECRET`、
   - `NEXT_PUBLIC_BASE_URL`
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
