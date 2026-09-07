# 十一康复陪伴网站 v2.0

> 面向 Claude Code / Cursor / Codex 的直接开发规格

---

## 1. 项目概述

### 1.1 项目名称

**十一的康复小窝**

### 1.2 项目定位

一个面向单个用户“十一”的移动端术后康复陪伴网站。

核心目标不是提供医疗诊断，而是：

1. 帮助十一记录每日康复训练
2. 帮助十一记录每日心情
3. 帮助朋友和家人提供鼓励
4. 通过时间线展示恢复过程
5. 用布偶猫主题提供温柔、持续的情绪陪伴

网站中的康复内容仅用于**记录、提醒和展示医生/康复师已经确定的康复计划**。

网站不得根据术后天数自行推断用户可以进行哪些医疗/康复训练。

---

# 2. 核心设计原则

## 2.1 产品原则

### 原则 1：陪伴优先

网站应该让用户感受到：

> “今天有人陪着我。”

而不是：

> “我今天又有一堆任务没完成。”

---

### 原则 2：康复计划由人工确认

系统只负责：

```text
手术日期
    ↓
计算术后天数
    ↓
展示当前时间阶段
    ↓
读取当前有效康复计划
    ↓
展示今日任务
```

系统禁止：

```text
术后第 7 天
    ↓
自动解锁某项训练
```

---

### 原则 3：时间线不是医疗判断

术后天数和阶段只用于：

* 时间展示
* 日历
* 时间线
* 鼓励文案
* 进度展示

不用于自动判断：

* 是否可以负重
* 是否可以屈膝到某个角度
* 是否可以开始力量训练
* 是否可以跑步
* 是否可以进行跳跃
* 是否可以停止支具

---

### 原则 4：失败不等于退步

用户没有完成任务时：

禁止显示：

> 康复失败

> 康复进度下降

应该显示：

> 今天暂未完成

> 如果身体不舒服，可以先休息。

---

# 3. 技术栈

| 类别              | 技术                       |
| --------------- | ------------------------ |
| Framework       | Next.js 14+ App Router   |
| Language        | TypeScript               |
| UI              | React                    |
| CSS             | Tailwind CSS             |
| UI Icon         | Lucide React             |
| Database        | Prisma ORM               |
| Development DB  | SQLite                   |
| Production DB   | Turso / libSQL           |
| Validation      | Zod                      |
| Test            | Vitest + Testing Library |
| Deployment      | Vercel                   |
| Package Manager | pnpm                     |
| Node            | Node.js 20+              |

---

# 4. MVP 范围

## 4.1 P0：必须完成

### 公开页面

* `/`
* `/wall`

### 主用户页面

* `/login`
* `/rehab`
* `/mood`
* `/timeline`

### 核心功能

* 访问码登录
* Cookie Session
* 康复任务展示
* 康复打卡
* 心情记录
* 心情历史
* 留言墙
* 留言删除
* 康复时间线
* 每日鼓励语
* 低能量模式
* 今日状态
* 基础异常情况提示

---

# 5. 非目标

MVP 不实现：

* 微信登录
* 手机验证码
* 多用户账号系统
* AI 医疗建议
* AI 自动制定康复计划
* 医疗诊断
* 在线问诊
* 医生账号
* 医生后台
* 社交关注
* 排行榜
* 积分商城
* 复杂数据分析
* PWA
* 推送通知
* E2E 测试
* 多语言
* 多患者管理

---

# 6. 用户角色

系统只有两个逻辑角色。

## 6.1 OWNER

即十一。

权限：

```text
查看康复任务
创建/修改康复打卡
查看自己的心情
创建心情
查看时间线
管理留言
删除留言
查看私有内容
```

---

## 6.2 PUBLIC

朋友和家人。

无需登录。

权限：

```text
查看公开首页
查看公开留言
发布留言
```

不能：

```text
查看心情历史记录与笔记
查看康复详细记录
修改康复计划
查看管理页面
```

注：朋友可查看十一的"今日心情"（简略，仅 mood 不含笔记），以便给出针对性鼓励；详细心情历史和笔记仅十一可见。

---

# 7. 鉴权设计

## 7.1 登录方式

使用：

```text
OWNER_CODE
```

环境变量保存访问码。

例如：

```env
OWNER_CODE=your-secret-code
SESSION_SECRET=long-random-secret
APP_TIMEZONE=Asia/Shanghai
```

禁止将 `OWNER_CODE` 写入代码。

---

## 7.2 登录流程

```text
/login
   ↓
输入访问码
   ↓
POST /api/auth/login
   ↓
服务端读取 OWNER_CODE
   ↓
constant-time comparison
   ↓
验证成功
   ↓
设置 httpOnly Cookie
   ↓
跳转 /rehab
```

---

## 7.3 Cookie

Cookie 名：

```text
owner_session
```

属性：

```text
httpOnly=true
secure=true // production
sameSite=lax
path=/
maxAge=604800
```

有效期：

```text
7 天
```

Cookie 不保存 OWNER_CODE。

Cookie 只保存随机 Session Token。

---

# 8. Session 数据模型

不要直接把：

```text
owner=true
```

写入客户端可伪造的 Cookie。

使用数据库 Session。

```prisma
model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

Cookie：

```text
owner_session=<random-token>
```

数据库保存：

```text
SHA-256(token)
```

服务端每次访问 OWNER 页面：

```text
Cookie
  ↓
hash
  ↓
查询 Session
  ↓
验证 expiresAt
  ↓
允许访问
```

---

# 9. 登录防暴力破解

MVP 使用数据库实现简单限流。

```prisma
model LoginAttempt {
  id          String   @id @default(cuid())
  identifier  String
  failedAt    DateTime @default(now())
}
```

规则：

```text
同一 identifier：

1 分钟内失败 >= 5 次
↓
拒绝继续尝试
```

identifier 不直接保存原始 IP，可以保存：

```text
SHA-256(ip + RATE_LIMIT_SECRET)
```

成功登录后清理该 identifier 的失败记录。

---

# 10. 时间与日期设计

系统涉及术后天数，因此必须统一时区。

环境变量：

```env
APP_TIMEZONE=Asia/Shanghai
```

所有“今天”的判断使用：

```text
APP_TIMEZONE
```

而不是服务器 UTC 时间。

数据库中的：

```text
createdAt
updatedAt
```

使用 DateTime。

业务日期：

```text
YYYY-MM-DD
```

使用 String。

例如：

```text
2026-09-10
```

---

# 11. 手术日期

系统配置：

```text
SURGERY_DATE=2026-09-09
```

建议也放入数据库，而不是永久硬编码。

---

# 12. 术后天数计算

定义：

```text
POD = Post Operative Day
```

规则：

```text
术前：
today < surgeryDate

手术当天：
today == surgeryDate
POD 0

术后第一天：
today == surgeryDate + 1
POD 1
```

示例：

```text
2026-09-08 → 术前 1 天
2026-09-09 → 手术当天
2026-09-10 → POD 1
2026-09-23 → POD 14
```

实现：

```ts
getPostOpDay(date, surgeryDate)
```

必须有单元测试。

---

# 13. 康复阶段

阶段仅作为时间展示。

```ts
type RehabPhase =
  | "PRE_OP"
  | "EARLY"
  | "MID"
  | "LATE"
```

默认展示：

```text
PRE_OP
术前

EARLY
术后早期

MID
术后中期

LATE
术后后期
```

阶段边界必须集中定义。

例如：

```ts
const PHASE_CONFIG = {
  PRE_OP: ...
  EARLY: ...
  MID: ...
  LATE: ...
}
```

禁止在多个页面中重复写：

```ts
if (days < 14)
```

所有阶段计算统一调用：

```ts
getRehabPhase()
```

---

# 14. 康复计划模型

单人场景，去掉版本化抽象，RehabPlanItem 作为扁平顶层表。十一可直接 CRUD 修改动作。历史完整性由 RehabLog 的快照机制保证（见第17节）。

```prisma
model RehabPlanItem {
  id              String   @id @default(cuid())

  phase           String   // "PRE_OP" | "EARLY" | "MID" | "LATE"
  name            String
  description     String

  category        String   // "exercise" | "scar" | "care"

  targetValue     Int?
  targetUnit      String? // "次" | "组" | "秒" | "分钟"
  targetSets      Int?
  frequencyPerDay Int      @default(1)

  prerequisites   String? // "以医生确认方案为准"
  stopConditions  String? // "如出现异常情况，停止并咨询专业人员"
  notes           String? // "DEMO ONLY" 标注

  order           Int      // 显示顺序

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  logs            RehabLog[]

  @@index([phase])
}
```

十一可随时修改动作（改名、改目标次数、增删），修改不影响历史 RehabLog，因为日志保存了快照。

---

# 15. 康复任务设计

例如：

```text
股四头肌等长收缩
```

数据：

```text
targetValue = 30
targetUnit = "次"
targetSets = 3
frequencyPerDay = 1
```

UI 显示：

```text
股四头肌等长收缩

目标
30 次 × 3 组

今天完成
1 / 3 组
```

---

# 16. 康复日志

```prisma
model RehabLog {
  id              String   @id @default(cuid())

  date            String

  planItemId      String?

  exerciseName    String   // 快照
  targetValue     Int?     // 快照
  targetUnit      String?  // 快照
  targetSets      Int?     // 快照

  completedValue  Int?
  completedSets   Int?

  done            Boolean  @default(false)

  note            String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  planItem        RehabPlanItem? @relation(
    fields: [planItemId],
    references: [id],
    onDelete: SetNull
  )

  @@index([date])
  @@index([planItemId])
}
```

---

# 17. 为什么 RehabLog 保存快照

不能只保存：

```text
planItemId
```

因为康复计划以后可能变化。

例如：

```text
9月10日：
踝泵 50 次
```

以后修改计划：

```text
踝泵 100 次
```

9月10日的历史记录仍然应该显示：

```text
目标：50 次
完成：50 次
```

因此日志保存：

```text
exerciseName
targetValue
targetUnit
targetSets
```

快照。

---

# 18. 打卡规则

## 当天

允许：

```text
创建
修改
取消完成
```

## 过去日期

允许：

```text
补记
修改
```

但 UI 标记：

```text
补记
```

## 未来日期

禁止：

```text
创建打卡
```

API 返回：

```json
{
  "error": "不能记录未来日期的康复任务"
}
```

---

# 19. 心情模型

```prisma
model MoodLog {
  id        String   @id @default(cuid())
  date      String
  mood      String
  note      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([date])
}
```

允许的 mood：

```text
GREAT
GOOD
OK
DOWN
ANXIOUS
```

---

# 20. 心情隐私

默认：

```text
今日 mood = PUBLIC（简略）
心情笔记 = PRIVATE
心情历史 = PRIVATE
```

朋友在首页可见十一今日的 mood 等级（如"还不错"），但看不到笔记内容，也看不到历史曲线。这样朋友能了解十一状态给出针对性鼓励，又不暴露隐私。

详细心情历史、笔记内容仅十一可见。

AppSetting 表保留用于未来扩展（如是否显示 POD、是否显示进度等）：

```prisma
model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

---

# 21. 留言模型

```prisma
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
```

---

# 22. 留言限制

昵称：

```text
1~20 个字符
```

内容：

```text
1~300 个字符
```

emoji：

使用白名单。

例如：

```text
❤️
🫶
🐱
🌷
🌈
💪
🎉
```

禁止客户端直接提交任意 HTML。

服务端使用 Zod 验证。

---

# 23. 留言删除

OWNER 可以删除留言。

删除采用：

```text
visible=false
```

而不是立即物理删除。

这样便于未来恢复。

公开 API：

```text
只返回 visible=true
```

---

# 24. 留言防刷

MVP：

```text
同一客户端短时间内限制提交频率
```

例如：

```text
1 分钟最多 3 条
```

同时：

```text
昵称 + 内容
```

不能为空。

---

# 25. 低能量模式

增加：

```text
EnergyMode
```

```text
NORMAL
TIRED
PAINFUL
REST
```

可以使用简单数据库设置，也可以存在当天状态中。

建议增加：

```prisma
model DailyStatus {
  id          String   @id @default(cuid())
  date        String   @unique
  energy      String?
  painLevel   Int?
  swelling    Int?
  note        String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

MVP 页面允许：

```text
今天状态：

🙂 正常
😴 有点累
😣 疼痛明显
🛌 今天想休息
```

---

# 26. 疼痛记录

如果实现，使用：

```text
0~10
```

但页面文案不要暗示：

> 疼痛超过 5 分就一定怎样。

只用于记录趋势。

例如：

```text
今天疼痛：4/10
```

而不是：

```text
疼痛 4/10 → 可以训练
```

---

# 27. 异常情况提醒（静态卡片，非独立页面）

MVP 不做独立 /safety 路由。异常情况提醒以静态卡片形式放在 `/rehab` 页底部，内容固定：

```text
⚠️ 出现这些情况请先停下
如果出现明显异常，不要因为今天的任务继续坚持。
请优先遵循医生和康复师指导，必要时联系医疗机构。
```

提醒项（静态文案，不做诊断）：

* 疼痛明显异常
* 肿胀明显增加
* 伤口异常
* 发热
* 小腿明显肿痛
* 呼吸困难/胸痛等紧急情况

---

# 28. 首页设计

路由：

```text
/
```

首页结构：

```text
┌────────────────────────┐
│ 🐱 十一的康复小窝       │
│                        │
│ 今天是术后第 8 天       │
│ 慢慢来就好。            │
├────────────────────────┤
│ 💭 十一今天             │
│                        │
│ 😸 还不错              │
│ （仅 mood 等级，无笔记）│
├────────────────────────┤
│ 🌱 今日康复             │
│                        │
│ ████████░░ 4 / 5       │
│                        │
│ 查看今天的任务 →        │
├────────────────────────┤
│ 💌 给十一的鼓励         │
│                        │
│ “今天也要好好休息呀！”  │
│                        │
│ 留下一句话 →            │
└────────────────────────┘
```

今日心情卡片只展示 mood 等级（如"还不错"），不展示笔记和历史。朋友据此了解十一状态，给出针对性鼓励。

不要突出：

```text
康复进度 67%
```

避免造成压力。

---

# 29. 首页进度计算

首页只计算：

```text
今日计划任务数量
今日完成任务数量
```

例如：

```text
4 / 5
```

不计算：

```text
总体康复完成百分比
```

因为医疗康复不是线性进度条。

---

# 30. Rehab 页面

路由：

```text
/rehab
```

页面：

```text
顶部：
术后第 N 天
当前时间阶段

↓

今日状态

↓

今日任务

↓

每项任务卡片

↓

今日完成统计
```

任务卡：

```text
┌────────────────────────┐
│ 🐾 股四头肌等长收缩     │
│                        │
│ 保持膝关节稳定，        │
│ 按照当前康复方案完成。  │
│                        │
│ 目标：30 次 × 3 组      │
│                        │
│ [ - ] 30 [ + ]         │
│                        │
│ [ 完成打卡 ]            │
└────────────────────────┘
```

---

# 31. 完成动画

完成任务：

```text
卡片轻微弹跳
猫咪出现
撒少量星星/爱心
```

动画必须：

* 短
* 轻
* 不影响操作

支持：

```text
prefers-reduced-motion
```

用户开启减少动画时关闭动画。

---

# 32. Mood 页面

路由：

```text
/mood
```

页面：

```text
今天感觉怎么样？

😸 棒极了
🙂 还不错
😐 还行
🙀 有点糟
😿 焦虑了

[ 想说点什么吗？ ]

[ 保存今天的心情 ]
```

下面：

```text
最近 7 天
```

使用简单折线/点阵图。

不要做复杂 BI。

---

# 33. Timeline 页面

路由：

```text
/timeline
```

显示：

```text
2026-09-09
🏥 手术日

2026-09-10
🌱 术后第 1 天

2026-09-16
🏥 第一次复诊

2026-09-23
🌱 康复计划调整

...
```

复诊节点应该支持人工添加。

---

# 34. Timeline 数据模型

增加：

```prisma
model TimelineEvent {
  id          String   @id @default(cuid())

  date        String
  type        String
  title       String
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([date])
}
```

type：

```text
SURGERY
FOLLOW_UP
PLAN_CHANGE
MILESTONE
NOTE
```

---

# 35. 复诊节点

OWNER 可以添加：

```text
日期
标题
内容
```

例如：

```text
2026-09-23

第一次复诊

医生调整了康复计划。
```

---

# 36. 每日鼓励语

代码：

```text
lib/encouragement.ts
```

预设至少 30 条。

示例：

```text
今天不用跑得很快，走好自己的这一小步就很好。

慢慢恢复也是恢复。

今天的小猫也来陪你啦。

完成一点点，也是很棒的一天。

不要因为今天状态不好责怪自己。
```

随机展示。

必须避免：

```text
保证恢复
一定不会疼
马上就能正常走路
一定可以完全康复
```

---

# 37. 布偶猫组件

```text
components/CatMascot.tsx
```

Props：

```ts
type CatMood =
  | "CHEER"
  | "CELEBRATE"
  | "COMFORT"
  | "REST"
  | "NORMAL";
```

例如：

```tsx
<CatMascot mood="CHEER" />
```

页面对应：

| 场景   | CatMood   |
| ---- | --------- |
| 首页   | NORMAL    |
| 完成任务 | CELEBRATE |
| 心情不好 | COMFORT   |
| 今天休息 | REST      |
| 康复任务 | CHEER     |

---

# 38. 页面路由结构

```text
app/
├── layout.tsx
│
├── (public)/
│   ├── page.tsx
│   └── wall/
│       └── page.tsx
│
├── (owner)/
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── rehab/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   │
│   ├── mood/
│   │   └── page.tsx
│   │
│   ├── timeline/
│   │   └── page.tsx
│
└── api/
    ├── auth/
    │   ├── login/
    │   │   └── route.ts
    │   └── logout/
    │       └── route.ts
    │
    ├── rehab/
    │   ├── route.ts
    │   └── [id]/
    │       └── route.ts
    │
    ├── mood/
    │   └── route.ts
    │
    ├── messages/
    │   └── route.ts
    │
    ├── timeline/
    │   └── route.ts
    │
    └── settings/
        └── route.ts
```

---

# 39. Middleware

文件：

```text
middleware.ts
```

保护：

```text
/rehab/*
/mood/*
/timeline/*
/api/rehab/*
/api/mood/*
/api/timeline/*
/api/settings/*
```

不保护：

```text
/
/wall
/login
/api/auth/*
/api/messages GET
/api/messages POST
```

Middleware 只做：

```text
Session Cookie 是否存在
```

真正权限校验仍然必须在 Server/API 层再次进行。

不能只依赖 Middleware。

---

# 40. API 设计

## POST /api/auth/login

Request：

```json
{
  "code": "******"
}
```

Success：

```json
{
  "success": true
}
```

Error：

```json
{
  "error": "访问码不正确"
}
```

---

# 41. POST /api/auth/logout

清除：

```text
owner_session
```

同时删除数据库 Session。

返回：

```json
{
  "success": true
}
```

---

# 42. GET /api/rehab

OWNER only。

返回：

```json
{
  "date": "2026-09-10",
  "pod": 1,
  "phase": "EARLY",
  "tasks": [
    {
      "id": "...",
      "name": "xxx",
      "targetValue": 30,
      "targetUnit": "次",
      "targetSets": 3,
      "completedSets": 2,
      "done": false
    }
  ]
}
```

---

# 43. POST /api/rehab

OWNER only。

Request：

```json
{
  "planItemId": "...",
  "date": "2026-09-10",
  "completedValue": 30,
  "completedSets": 3,
  "done": true,
  "note": ""
}
```

服务器必须验证：

```text
date 合法
date 不是未来
planItem 存在
用户有 OWNER 权限
数据符合 Zod Schema
```

---

# 44. PATCH /api/rehab/:id

用于修改打卡。

OWNER only。

---

# 45. GET /api/mood

OWNER only。

默认：

```text
最近 7 天
```

支持：

```text
?days=7
```

最大：

```text
30
```

禁止无限查询。

---

# 46. POST /api/mood

Request：

```json
{
  "date": "2026-09-10",
  "mood": "GOOD",
  "note": "今天比昨天好多了"
}
```

同一天只保留一条当前记录。

如果重复提交：

```text
update
```

而不是创建多条。

---

# 47. GET /api/messages

PUBLIC。

只返回：

```text
visible=true
```

按：

```text
createdAt DESC
```

分页。

例如：

```text
limit=20
cursor=...
```

MVP 可以先使用：

```text
limit=50
```

但必须限制最大值。

---

# 48. POST /api/messages

PUBLIC。

Request：

```json
{
  "name": "小明",
  "content": "十一加油！",
  "emoji": "❤️"
}
```

服务端：

```text
Zod validation
↓
长度检查
↓
emoji 白名单
↓
rate limit
↓
数据库
```

---

# 49. DELETE /api/messages/:id

OWNER only。

执行：

```text
visible=false
```

---

# 50. Timeline API

## GET

OWNER only。

返回：

```text
TimelineEvent[]
```

按照：

```text
date ASC
```

排序。

---

# 51. 设置 API

OWNER only。

允许：

```text
publicMood
```

未来可以扩展：

```text
showProgress
showPod
```

---

# 52. Prisma Schema 总体模型

最终模型：

```text
Session
LoginAttempt

RehabPlanItem
RehabLog

MoodLog
DailyStatus

Message

TimelineEvent

AppSetting
```

---

# 53. 数据库关系

```text
RehabPlanItem
    │
    └── RehabLog（保存快照，onDelete: SetNull）


Message
    │
    └── independent


MoodLog
    │
    └── 今日 mood 简略公开，历史/笔记私有


TimelineEvent
    │
    └── independent


DailyStatus
    │
    └── independent（按 date 唯一）


Session
    │
    └── owner authentication


LoginAttempt
    │
    └── 暴力破解防护
```

---

# 54. 文件结构

```text
/
├── app/
├── components/
├── lib/
├── prisma/
├── public/
├── tests/
│
├── middleware.ts
├── package.json
├── prisma.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md
```

---

# 55. lib 目录

```text
lib/
├── prisma.ts
├── auth.ts
├── session.ts
├── date.ts
├── phase.ts
├── validation.ts
├── rate-limit.ts
├── encouragement.ts
├── rehab.ts
└── settings.ts
```

职责必须单一。

---

# 56. date.ts

负责：

```ts
getToday()
getPostOpDay()
getDaysUntilSurgery()
formatDate()
isFutureDate()
```

所有日期相关逻辑统一放这里。

---

# 57. phase.ts

只负责：

```ts
getRehabPhase(postOpDay)
```

禁止访问数据库。

禁止修改康复计划。

---

# 58. rehab.ts

负责：

```ts
getRehabItemsByPhase()   // 按 phase 查询 RehabPlanItem
getTodayTasks()          // 按当前阶段取今日任务 + 关联今日 RehabLog
calculateDailyProgress() // 今日完成 X/Y
createRehabLog()
updateRehabLog()
```

---

# 59. auth.ts

负责：

```ts
verifyOwnerSession()
requireOwner()
createSession()
deleteSession()
```

API 中使用：

```ts
await requireOwner()
```

---

# 60. validation.ts

集中保存 Zod Schema：

```ts
loginSchema
messageSchema
rehabLogSchema
moodSchema
timelineEventSchema
```

所有 POST/PATCH API 必须经过验证。

---

# 61. 错误处理

统一错误格式：

```json
{
  "error": "操作失败，请重试"
}
```

开发环境可以记录：

```text
server console
```

生产环境：

禁止向用户返回：

```text
SQL error
stack trace
database URL
内部路径
环境变量
```

---

# 62. HTTP 状态码

使用：

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
429 Too Many Requests
500 Internal Server Error
```

---

# 63. 前端错误体验

错误不要只显示：

```text
500
```

统一显示：

```text
🐱

好像出了点小问题。

请稍后再试。
```

打卡失败：

```text
这次没有保存成功。

先别担心，你可以再试一次。
```

输入内容必须保留。

---

# 64. 网络失败与本地暂存

康复打卡失败时：

可以使用：

```text
localStorage
```

保存：

```json
{
  "type": "REHAB_LOG",
  "payload": {}
}
```

下次页面加载时：

```text
检测 pending log
↓
自动尝试提交
```

成功后删除。

MVP 不实现复杂离线同步。

---

# 65. 安全要求

## 必须

```text
OWNER_CODE 不进入客户端
SESSION_SECRET 不进入客户端
Cookie httpOnly
production Cookie secure
API 服务端鉴权
Zod 输入校验
留言长度限制
留言频率限制
登录失败频率限制
```

---

# 66. XSS

React 默认文本渲染。

禁止：

```tsx
dangerouslySetInnerHTML
```

除非未来明确增加 Markdown，并且经过 sanitizer。

---

# 67. CSRF

由于使用：

```text
SameSite=Lax
```

并且 API 不接受跨域请求。

对于 OWNER 写操作：

建议同时检查：

```text
Origin
```

确保来自本站。

---

# 68. 数据库部署

## Development

```env
DATABASE_URL="file:./dev.db"
```

## Production

使用：

```text
Turso / libSQL
```

生产环境禁止：

```text
file:./dev.db
```

作为 Vercel 持久化数据库。

---

# 69. 环境变量

`.env.example`

```env
OWNER_CODE=change-me
SESSION_SECRET=change-me-to-a-long-random-secret

DATABASE_URL=file:./dev.db

APP_TIMEZONE=Asia/Shanghai

SURGERY_DATE=2026-09-09

RATE_LIMIT_SECRET=change-me
```

---

# 70. Seed 数据

开发环境允许：

```text
prisma/seed.ts
```

创建：

```text
测试康复计划
测试康复任务
测试 Timeline
测试留言
```

但生产环境：

**不得自动 Seed 医疗康复方案。**

---

# 71. 医疗内容特别要求

康复任务数据必须视为：

```text
医生/康复师确认的数据
```

项目代码不得把网上的通用康复方案直接视为用户个人治疗方案。

因此 Seed 中的动作应该明确标注：

```text
DEMO ONLY
```

上线前必须替换成实际医生/康复师确认的计划。

---

# 72. 康复动作数据结构示例

仅作为数据结构示例：

```json
{
  "name": "示例动作",
  "description": "按照当前康复方案执行",
  "targetValue": 10,
  "targetUnit": "次",
  "targetSets": 2,
  "frequencyPerDay": 1,
  "prerequisites": "以医生确认方案为准",
  "stopConditions": "如出现异常情况，停止并咨询专业人员",
  "notes": "DEMO ONLY"
}
```

不要直接将 Demo 数据当成真实医疗建议。

---

## 72.1 初始 Demo 康复方案（分阶段，全部居家可完成）

以下为 Seed 数据，全部 `notes: "DEMO ONLY"`，`prerequisites: "以医生确认方案为准"`，`stopConditions: "如出现异常情况，停止并咨询专业人员"`。十一上线后必须替换为医生/康复师确认的实际方案。

### PRE_OP 术前阶段（现在 ~ 2026-09-09）

| name | description | category | targetValue | targetUnit | targetSets | frequencyPerDay |
|------|-------------|----------|------------|------------|------------|-----------------|
| 术前心理准备 | 了解手术流程，减少焦虑 | care | 1 | 次 | 1 | 1 |
| 踝泵运动 | 踝关节屈伸促循环防血栓 | exercise | 50 | 次 | 1 | 1 |
| 股四头肌等长收缩 | 维持大腿前侧肌力 | exercise | 20 | 次 | 1 | 1 |
| 患肢抬高 | 高于心脏减轻肿胀 | care | 15 | 分钟 | 1 | 1 |

### EARLY 术后早期（2026-09-10 ~ 第 2 周）

| name | description | category | targetValue | targetUnit | targetSets | frequencyPerDay |
|------|-------------|----------|------------|------------|------------|-----------------|
| 踝泵运动 | 防血栓消肿胀 | exercise | 100 | 次 | 1 | 1 |
| 股四头肌等长收缩 | 维持肌力 | exercise | 30 | 次 | 3 | 1 |
| 腘绳肌等长收缩 | 后侧肌群维持 | exercise | 20 | 次 | 3 | 1 |
| 直腿抬高 SLR | 不负重练肌力 | exercise | 15 | 次 | 3 | 1 |
| 冰敷 | 15-20 分钟消肿 | care | 3 | 次 | 1 | 1 |
| 患肢抬高 | 高于心脏 | care | 4 | 次 | 1 | 1 |
| 疤痕护理 - 硅酮凝胶 | 伤口愈合后开始涂抹 | scar | 2 | 次 | 1 | 1 |
| 疤痕护理 - 减张胶带 | 减小张力防疤痕增生 | scar | 1 | 次 | 1 | 1 |

### MID 术后中期（第 3 ~ 6 周）

| name | description | category | targetValue | targetUnit | targetSets | frequencyPerDay |
|------|-------------|----------|------------|------------|------------|-----------------|
| 屈膝活动度训练 | 坐位/卧位屈膝，90° 起渐进 | exercise | 1 | 次 | 3 | 1 |
| 主动直腿抬高 | 强化股四头肌 | exercise | 20 | 次 | 3 | 1 |
| 侧抬腿 | 臀中肌训练 | exercise | 15 | 次 | 3 | 1 |
| 靠墙静蹲 | 渐进负重 | exercise | 30 | 秒 | 3 | 1 |
| 单脚站立平衡 | 本体感觉训练 | exercise | 30 | 秒 | 2 | 1 |
| 疤痕按摩 | 促进疤痕软化 | scar | 5 | 分钟 | 2 | 1 |
| 持续减张护理 | 全天胶带或减张器 | scar | 1 | 次 | 1 | 1 |

### LATE 术后后期（第 7 周起）

| name | description | category | targetValue | targetUnit | targetSets | frequencyPerDay |
|------|-------------|----------|------------|------------|------------|-----------------|
| 全屈膝训练 | 跪坐等至正常范围 | exercise | 1 | 次 | 3 | 1 |
| 弓步训练 | 功能性训练 | exercise | 10 | 次 | 3 | 1 |
| 上下台阶 | 日常生活功能 | exercise | 15 | 次 | 3 | 1 |
| 坐姿伸膝（无重量） | 坐椅子缓慢伸直膝盖 | exercise | 15 | 次 | 3 | 1 |
| 卧位屈膝滑动 | 床上滑动屈膝改善活动度 | exercise | 15 | 次 | 3 | 1 |
| 平衡板训练 | 进阶本体感觉 | exercise | 5 | 分钟 | 1 | 1 |
| 疤痕修复评估 | 每周观察恢复情况 | scar | 1 | 次 | 1 | 1 |

阶段边界集中在 `lib/phase.ts`，默认值（可由十一/医生调整）：

```text
PRE_OP: today < surgeryDate
EARLY:  POD 0 ~ POD 14
MID:    POD 15 ~ POD 42
LATE:   POD 43+
```

---

# 73. 移动端设计

目标：

```text
375px
390px
412px
```

优先适配。

所有核心按钮：

```text
min-height: 44px
```

输入框：

```text
min-height: 44px
```

---

# 74. Bottom Navigation

OWNER 页面：

```text
┌──────────────────────────────┐
│ 🐾 打卡 │ 💭 心情 │ 📅 时间线 │
│                         💌   │
└──────────────────────────────┘
```

建议：

```text
打卡
心情
时间线
留言
```

留言虽然是公开页面，但 OWNER 可以从 BottomNav 进入。

---

# 75. 页面风格

背景：

```text
#FFF8F0
```

卡片：

```text
#FFE5D9
```

强调：

```text
#C9886B
```

文字：

```text
#5C4033
```

完成：

```text
#B5E8C9
```

鼓励：

```text
#FFB6A3
```

整体风格：

```text
温暖
柔和
圆角
低压力
少阴影
少弹窗
```

---

# 76. 无障碍

必须支持：

```text
button 可键盘访问
input 有 label
图片有 alt
颜色不能作为唯一信息
focus 状态清晰
```

动画支持：

```css
prefers-reduced-motion
```

---

# 77. 测试策略

虽然 MVP 不做 E2E，但必须做：

```text
Unit Test
API Test
Component Test
```

---

# 78. Unit Test

测试：

### 日期

```text
术前
手术当天
术后第 1 天
术后第 14 天
术后第 15 天
```

### 阶段

测试所有边界。

### 日期

```text
今天
昨天
未来
```

### 康复进度

```text
0/5
1/5
5/5
```

---

# 79. Auth Test

必须测试：

```text
正确访问码
错误访问码
空访问码
连续错误
Session 创建
Session 过期
Session 删除
无 Session 访问 OWNER API
```

---

# 80. API Test

### Message

```text
正常创建
空昵称
空内容
超长昵称
超长内容
非法 emoji
频率过高
删除
查询已删除留言
```

### Rehab

```text
正常打卡
重复打卡
修改打卡
过去日期补记
未来日期拒绝
非法 planItemId
未登录访问
```

### Mood

```text
创建
修改
查询
非法 mood
未登录访问
```

---

# 81. Component Test

至少测试：

```text
RehabCard
MessageWall
ProgressBar
MoodSelector
CatMascot
BottomNav
```

重点测试：

```text
点击
加载
错误
完成状态
空状态
```

---

# 82. 核心验收标准

## AC-01 登录

输入正确访问码：

```text
登录成功
Cookie 创建
进入 /rehab
```

错误：

```text
显示访问码不正确
不泄漏任何额外信息
```

---

## AC-02 权限

未登录：

```text
/rehab → /login
/mood → /login
/timeline → /login
```

公开页面：

```text
/ → 正常
/wall → 正常
```

---

## AC-03 今日任务

打开 `/rehab`：

必须显示：

```text
今天日期
术后天数
阶段
今日康复任务
完成数量
```

---

## AC-04 打卡

点击：

```text
完成打卡
```

数据库写入。

刷新页面后：

```text
仍然保持完成状态
```

---

## AC-05 心情

选择：

```text
GOOD
```

刷新：

```text
仍然显示 GOOD
```

---

## AC-06 留言

朋友：

```text
输入昵称
输入内容
提交
```

留言墙立即显示。

---

## AC-07 留言删除

OWNER 删除：

```text
留言从公开墙消失
数据库记录仍存在
```

---

## AC-08 隐私

默认：

```text
朋友能看到今日 mood 等级（简略）
朋友不能看到心情笔记内容
朋友不能看到心情历史曲线
朋友不能看到 RehabLog
朋友不能访问 OWNER API
```

---

## AC-09 日期

手术日期：

```text
2026-09-09
```

则：

```text
2026-09-08 → 术前
2026-09-09 → POD 0
2026-09-10 → POD 1
```

---

## AC-10 医疗安全

系统不能出现：

```text
“你现在可以开始跑步”
“第 7 周必须开始弓步”
“今天应该负重 XX kg”
```

这种由系统自动推导出的医疗建议。

所有康复任务来自当前有效计划。

---

# 83. 开发顺序

Claude Code / Cursor / Codex 应严格按照以下顺序实施。

## Phase 1：项目初始化

```text
Next.js
TypeScript
Tailwind
Prisma
Vitest
Zod
```

完成：

```text
npm/pnpm install
开发服务器启动
```

---

## Phase 2：数据库

完成：

```text
schema.prisma
migration
seed
prisma client
```

验证：

```text
prisma migrate dev
```

---

## Phase 3：Auth

实现：

```text
login
logout
session
middleware
requireOwner()
```

先完成测试。

---

## Phase 4：康复模块

实现：

```text
date.ts
phase.ts
rehab.ts
/api/rehab
RehabCard
/rehab
```

完成：

```text
查询
打卡
修改
历史
```

---

## Phase 5：Mood

实现：

```text
MoodSelector
MoodChart
/api/mood
/mood
```

---

## Phase 6：Message Wall

实现：

```text
MessageWall
MessageForm
/api/messages
/wall
```

增加：

```text
validation
rate limit
delete
```

---

## Phase 7：Timeline

实现：

```text
Timeline
TimelineEvent
/api/timeline
/timeline
```

---

## Phase 8：视觉设计

实现：

```text
CatMascot
动画
颜色
响应式
BottomNav
空状态
错误状态
```

---

## Phase 9：测试

运行：

```bash
pnpm test
```

必须全部通过。

---

## Phase 10：Production

配置：

```text
Vercel
Turso
环境变量
```

生产环境检查：

```text
HTTPS
Cookie Secure
数据库连接
OWNER_CODE
SESSION_SECRET
```

---

# 84. README 必须包含

README.md 至少包括：

```text
项目介绍

技术栈

本地启动

环境变量

数据库初始化

Seed

测试

Production 部署

康复计划数据如何更新

安全注意事项

医疗免责声明
```

---

# 85. Claude Code / Cursor / Codex 开发规则

编码 Agent 必须遵守：

### Rule 1

不要擅自增加技术栈。

---

### Rule 2

不要引入：

```text
Redux
Zustand
GraphQL
Redis
Docker
Kubernetes
```

除非明确提出需求。

---

### Rule 3

优先使用：

```text
Server Components
Server Actions / Route Handlers
```

避免不必要的 Client Component。

---

### Rule 4

涉及数据库的代码必须通过：

```text
lib/prisma.ts
```

统一访问。

---

### Rule 5

API 输入必须经过：

```text
Zod
```

---

### Rule 6

OWNER API 必须调用：

```ts
requireOwner()
```

---

### Rule 7

所有日期计算必须调用：

```ts
lib/date.ts
```

禁止页面自行计算。

---

### Rule 8

所有阶段计算必须调用：

```ts
lib/phase.ts
```

---

### Rule 9

不能将 OWNER_CODE 返回到客户端。

---

### Rule 10

不能使用 dangerouslySetInnerHTML。

---

### Rule 11

不要把医疗知识硬编码成自动决策逻辑。

---

### Rule 12

遇到医疗内容不确定时：

```text
保留为配置
```

而不是：

```text
自行补充医学结论
```

---

# 86. Definition of Done

项目只有满足以下条件才认为 MVP 完成：

```text
[ ] pnpm install 成功
[ ] pnpm dev 成功
[ ] Prisma migration 成功
[ ] Seed 成功
[ ] 登录成功
[ ] Session 正常
[ ] 未登录不能访问 OWNER 页面
[ ] 今日康复任务正常显示
[ ] 康复打卡正常
[ ] 可以修改打卡
[ ] 心情正常记录
[ ] 心情默认私有
[ ] 留言正常发布
[ ] 留言长度校验
[ ] 留言限流
[ ] OWNER 可以删除留言
[ ] 时间线正常
[ ] 术后天数计算正确
[ ] 阶段边界测试通过
[ ] API 测试通过
[ ] Component 测试通过
[ ] 手机端 375px 正常
[ ] 无明显横向滚动
[ ] production database 正常
[ ] HTTPS 正常
[ ] Cookie 安全属性正确
[ ] README 完整
```

---

# 87. 最终产品结构

最终产品应该形成：

```text
                  🐱
             十一的康复小窝
                    │
          ┌─────────┴─────────┐
          │                   │
        朋友                 十一
          │                   │
      ┌───┴───┐        ┌──────┴──────┐
      │       │        │      │      │
     首页    留言墙    打卡   心情   时间线
      │       │        │      │      │
      └───────┴────────┴──────┴──────┘
                    │
                  数据库
                    │
        ┌───────────┼───────────┐
        │           │           │
      康复计划     心情        留言
        │
    Plan Version
        │
    Plan Items
        │
     Rehab Logs
```

---

# 88. 最重要的产品闭环

每天打开网站：

```text
🐱

早上好，十一。

今天是术后第 N 天。

今天不用急，
慢慢来就好。

        ↓

    今日康复

    3 / 5

        ↓

完成一项

        ↓

🐱 “做得很好！”

        ↓

记录今天心情

        ↓

看到朋友留言

        ↓

晚上：

“今天也照顾好自己啦。”
```

整个产品应该围绕这个闭环，而不是围绕“完成多少任务”。

---

# 89. V2.0 最终技术决策

最终采用：

```text
Next.js
TypeScript
Tailwind
Prisma
SQLite（开发）
Turso/libSQL（生产）
Vercel
Zod
Vitest
Testing Library
```

核心数据库：

```text
Session
LoginAttempt

RehabPlan
RehabPlanItem
RehabLog

MoodLog
DailyStatus

Message

TimelineEvent

AppSetting
```

核心安全：

```text
httpOnly Cookie
Session Token
Server-side Auth
Zod Validation
Rate Limit
SameSite
Secure Cookie
```

核心医疗安全：

```text
手术日期 ≠ 自动医疗决策
术后天数 ≠ 训练解锁条件
康复任务 = 当前人工确认康复计划
康复日志保存快照，计划修改不影响历史
所有医疗内容以医生/康复师意见为准
```

---

