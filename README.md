# FavorMe Monorepo

FavorMe 轻治愈 / 轻决策辅助类产品的代码仓库。当前包含 **Web 演示**；后续在根目录下扩展 **后端** 与 **客户端**（Android / iOS），彼此独立目录、共享文档与约定。

## 目录结构

| 路径 | 说明 |
|------|------|
| [`demo/web/`](demo/web/) | Next.js Web Demo（现有功能与 UI 验证） |
| [`backend/`](backend/) | 正式后端服务（**NestJS + Prisma** 已建空壳，见 `backend/README.md`） |
| [`clients/android/`](clients/android/) | **MVP**：WebView 薄壳（可）；**之后**：以 Flutter 为主，见下 |
| [`clients/ios/`](clients/ios/) | 同左 |
| [`clients/flutter/`](clients/flutter/) | **正式期**双端主工程（待初始化，见 `docs/tech-stack.md`） |
| [`docs/`](docs/) | 产品、架构、技术决策与任务跟踪 |

## 快速开始（仅 Demo）

```bash
cd demo/web
npm install
npm run dev
```

浏览器打开 <http://localhost:3000>。

## 后端（空壳）

**有 Docker** 时在仓库根 `docker compose up -d` 起 PG+Redis，再进 `backend` 配 `.env`、迁移、启动。  
**不能装 Docker** 时：用本机 **Homebrew PostgreSQL** 或 **Neon/Supabase 等托管库** 即可，不必强依赖 Docker；步骤见 [`backend/README.md`](backend/README.md) 的 **「无 Docker」** 小节。

```bash
cd backend
cp .env.example .env
# 编辑 .env 中 DATABASE_URL 指向你的 PostgreSQL
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
# GET http://127.0.0.1:3000/v1/health
```

详细与任务说明见 [`backend/README.md`](backend/README.md)、[`docs/tasks/001-backend-initialization.md`](docs/tasks/001-backend-initialization.md)。

## 文档

- 总览：[`docs/README.md`](docs/README.md)
- **产品 / 设计 / 开发工作流**（PRD、Figma、与 demo 同步）：[`docs/team-workflow.md`](docs/team-workflow.md)
- 产品范围：[`docs/product-scope.md`](docs/product-scope.md)
- 架构：[`docs/architecture.md`](docs/architecture.md)
- 技术栈：[`docs/tech-stack.md`](docs/tech-stack.md)
- **PRD 目录**：[`docs/prd/README.md`](docs/prd/README.md)
- **设计 / Figma 入口**：[`docs/design/README.md`](docs/design/README.md)
- 给 AI / 协作者的约定：[`AGENTS.md`](AGENTS.md)
- 已拍板决策摘要：[`docs/QUESTIONS.md`](docs/QUESTIONS.md)

## 状态

- [x] 仓库多模块目录与文档骨架
- [x] 后端技术栈与首版范围（已拍板，见 `docs/QUESTIONS.md` 与 `docs/decisions/`）
- [ ] 客户端技术选型（原生化 / 壳 + Web 等）确认
- [x] 后端工程**空壳**（`backend/`、Docker 依赖、`docs/tasks/001-backend-initialization.md`）
- [ ] 业务 API 与联调
