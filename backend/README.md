# Backend

正式 **API 与 AI 网关**（`NestJS` + `Prisma` + `PostgreSQL` + `Redis`）。表与编排边界见 [`../docs/modules/ai-chat-orchestration.md`](../docs/modules/ai-chat-orchestration.md)，总原则见 [`../docs/decisions/004-agent-backend-control-plane.md`](../docs/decisions/004-agent-backend-control-plane.md)。

## 先决条件

- **Node.js 20+**（推荐 20 LTS）  
- **PostgreSQL**（任何能填进 `DATABASE_URL` 的实例即可，见下）  
- **Redis**：当前空壳**未**在代码里连接 Redis；限流/会话等接入后再需要。无 Docker 时**可以不装**。  
- **Docker**（可选）：仓库根 `docker compose` 仅是一种**本地**起 PG+Redis 的便捷方式；不能装 Docker 时请看下面 **「无 Docker」**。

## 本机调试分步（从零到能调）

只覆盖**本机**跑通 API，**不包含**线上部署。按顺序做即可。

| 步骤 | 做什么 |
|------|--------|
| **0. 装 Node** | 安装 **Node.js 20+**（LTS 即可）。终端执行 `node -v` 能看到 `v20.x` 或更高。 |
| **1. 准备数据库** | 必须有一个 **PostgreSQL** 库可用。任选其一：<br>• **Docker 可用** → 在仓库根执行 `docker compose up -d`（本机 5432）。<br>• 与 `backend/.env.example` 中示例一致时，库用户/库名/密码为 `favorme` / `favorme`、连接 `localhost:5432`。<br>• **本机没 Docker** → 见下文 **「无 Docker：先把后端跑起来」**（Homebrew 本机 PG，或 Neon/Supabase 托管库），把得到的地址填到下一步的 `DATABASE_URL`。 |
| **2. 配置 + 装依赖** | 进入本目录并复制环境变量、安装包：<br>`cd backend` → `cp .env.example .env` → 用编辑器打开 **`.env`**，确认 **`DATABASE_URL`** 指向你在第 1 步的库（托管库常要加 `?sslmode=require` 等，按控制台说明）。<br>然后 `npm install`。 |
| **3. 建表** | 在 `backend` 下执行 `npx prisma migrate deploy`（在库里建表，只影响该库）。 |
| **4. 种子数据（可选但推荐）** | `npm run prisma:seed`（写入默认 `agent_profile` 等，便于联调）。 |
| **5. 启动** | `npm run start:dev`，终端里看到监听端口（默认 **3000**）。 |
| **6. 自测** | 新终端执行：`curl -s http://127.0.0.1:3000/v1/health`<br>期望：`{"status":"ok","database":"up"}`（需 PG 能连、迁移已跑）。<br>也可访问 `http://127.0.0.1:3000/v1` 看服务名 JSON。 |

**本机不连上 PG 时**：服务进程有时仍能起来，但 **`/v1/health` 会返回 503**，说明库连不上或迁移未做——回到第 1–3 步查 `DATABASE_URL` 与 `migrate deploy`。

**改表结构以后**：在开发阶段可用 `npx prisma migrate dev` 生成新迁移；日常「只把已有迁移应用到我本机库」仍用 `npx prisma migrate deploy` 即可。

## Phase 1 API 鉴权与请求头

详细约定见 [`../docs/tasks/003-phase1-api-auth-headers.md`](../docs/tasks/003-phase1-api-auth-headers.md)。开发期所有 Phase 1 业务接口都需要：

| Header | 必填 | 说明 |
|--------|------|------|
| `Authorization: Bearer <API_TOKEN>` | 是 | `<API_TOKEN>` 必须与服务端 `.env` 中的 `API_TOKEN` 完全一致；错误返回 401。 |
| `X-Device-Id` | 是 | 稳定设备标识，用于 `POST /v1/users/bootstrap` upsert 用户；缺失或空串返回 400。 |
| `X-Request-Id` | 否 | 调试关联 id；未传时服务端生成并回写响应头。 |

最小 curl 示例：

```bash
curl -s -X POST http://127.0.0.1:3000/v1/users/bootstrap \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: dev-device-001"

curl -s -X POST http://127.0.0.1:3000/v1/insight/questions \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: dev-device-001" \
  -H "Content-Type: application/json" \
  -d '{"rawQuestion":"我要不要换工作？","inputMode":"text"}'

curl -s -X POST http://127.0.0.1:3000/v1/insight/submit \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: dev-device-001" \
  -H "Content-Type: application/json" \
  -d '{"rawQuestion":"我要不要换工作？","questions":[{"id":"q1","dimension":"inner_preference","title":"如果只听真实直觉，你更靠近哪边？","options":[{"id":"stay","label":"保持现状"},{"id":"change","label":"尝试变化"}]}],"answers":[{"questionId":"q1","optionId":"change"}]}'
```

## 本地开发（用 Docker Compose）

1. 在**仓库根**启动数据库与缓存：

   ```bash
   docker compose up -d
   ```

2. 配置并迁移：

   ```bash
   cd backend
   cp .env.example .env
   npx prisma migrate deploy
   npm run prisma:seed
   ```

3. 启动服务：

   ```bash
   npm run start:dev
   ```

## 无 Docker：先把后端跑起来（Mac 等）

核心只有一件事：**有一个 PostgreSQL，让 `DATABASE_URL` 指过去**，再执行 `prisma migrate` 与 `start:dev`。不必装 Docker Desktop。

**方式 A：本机安装 PostgreSQL（常见：Homebrew）**

```bash
brew install postgresql@16
brew services start postgresql@16
# 建库与用户（示例，与 .env.example 一致时无需改 URL）
createuser -s favorme 2>/dev/null || true
createdb -O favorme favorme 2>/dev/null || true
```

在 `backend/.env` 中设置（按你本机实际账号/密码调整）：

```env
DATABASE_URL="postgresql://favorme@localhost:5432/favorme?schema=public"
```

然后：

```bash
cd backend
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

**方式 B：托管数据库（Neon / Supabase / Railway 等）**

在控制台建一个 **PostgreSQL** 项目，复制带 **SSL** 的连接串，写入 `backend/.env` 的 `DATABASE_URL`。跑同样三条：`migrate deploy` → `prisma:seed` → `start:dev`。适合本机完全不装 PG、或团队共用开发库。

**方式 C：另一台已装 Docker 的机器**

在那台机器上 `docker compose up -d`，把端口**映射**出来或走内网/隧道，本机 `.env` 的 `DATABASE_URL` 指向那台机器的 `host:5432` 即可（注意防火墙与安全）。

---

- `GET /v1`：服务名占位  
- `GET /v1/health`：需 **PostgreSQL 可连**且已执行迁移，返回 `{"status":"ok","database":"up"}`  
- 未连上 PG 时进程仍可起；健康检查在首次查库时失败，返回 **503**  

## Prisma

| 命令 | 说明 |
|------|------|
| `npx prisma generate` | 生成 Client |
| `npm run prisma:migrate` | 开发环境 `migrate dev`（改 schema 时用） |
| `npm run prisma:deploy` | 部署/CI `migrate deploy` |
| `npm run prisma:seed` | 写入默认 `agent_profiles` |
| `npm run prisma:studio` | 图形浏览数据 |

**权威 schema**：[`prisma/schema.prisma`](prisma/schema.prisma)（与模块文档中表名一一对应）。

## 与任务单

- 见 [`../docs/tasks/001-backend-initialization.md`](../docs/tasks/001-backend-initialization.md)。
