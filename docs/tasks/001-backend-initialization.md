# Task-001：backend 工程初始化

- **状态**：已完成
- **负责人**：Jimmy
- **创建日期**：2026-04-26

## 目标

- 在 `backend/` 落地 **NestJS + Prisma + PostgreSQL** 可运行空壳，与 ADR-002、ADR-004 及 [`docs/modules/ai-chat-orchestration.md`](../modules/ai-chat-orchestration.md) 对齐。

## 验收标准

- [x] 根目录 `docker compose` 可启动 **PostgreSQL 16** 与 **Redis 7**（`docker compose up -d`）
- [x] `backend`：`npm run build` 通过；`npm run start:dev` 可监听；`GET /v1/health` 在 **DB 已迁移且可连** 时返回 200
- [x] Prisma：`schema.prisma` 含 chat 主表；首版 SQL 在 `prisma/migrations/20260426120000_init/`
- [x] `prisma/seed` 可写入默认 `agent_profiles` 行（`name=default`）
- [x] `package-lock.json` 已生成（可随 `npm install` 提交，便于可复现构建）  
- [x] **CI**：GitHub Actions 见 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)（`backend`：`npm ci`、Prisma validate、ESLint、build；根目录 `.gitignore` 已**不再**忽略 `.github/`，方便提交模板与流水线）

## 已增加/修改路径

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)：CI
- 根 [`.gitignore`](../../.gitignore)：已移除对 `.github/` 的忽略
- `docker-compose.yml`：本地依赖
- `backend/package.json`、Nest/TS/ESLint 配置
- `backend/prisma/schema.prisma`、`migrations/`、`prisma/seed.ts`
- `backend/src/`：`AppModule`、**Health**（`SELECT 1`）、`PrismaService`（不强制启动即 $connect，便于无库时先起进程）
- `backend/.env.example`（复制为 `backend/.env`）

## 本地命令备忘

在仓库根：

```bash
docker compose up -d
cd backend
cp .env.example .env
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
curl -s http://127.0.0.1:3000/v1/health
```

未起 PostgreSQL 时，进程可启动，**就绪检查**会返回 **503**（属预期）。

## 交接给下一会话

1. 实现 `auth`（`POST /v1/auth/*`、`/v1/me`）与 `users` 建用户；`docs/modules/auth.md` 定稿。  
2. 实现 `conversations` + `messages` 与 **Turn 编排**（接 LLM 前预处理链占位）。  
3. 为 demo/web 或 Flutter 联调 CORS 与环境切换（`backend` 的 `CORS`、BASE_URL）。  

## 变更记录

- 2026-04-26：空壳、首个迁移、Task 建单。  
- 2026-04-26：根 `.gitignore` 移除对 `.github/` 的忽略；增加 `ci.yml`（backend 构建流水线）。
