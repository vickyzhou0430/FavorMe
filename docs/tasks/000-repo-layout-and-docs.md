# Task-000：仓库目录与文档骨架

- **状态**：已完成
- **负责人**：项目维护者
- **创建日期**：2026-04-24

## 目标

- 将原 Web Demo 迁到 `demo/web`，为 `backend` 与 `clients` 腾出根目录结构。
- 初始化 `docs/`、`AGENTS.md` 与根 `README.md`，支持长期协作与 Cursor 接力。

## 验收标准

- [x] `demo/web` 可视为原 Next 应用根目录（`package.json` 等在此）
- [x] 根目录存在 `backend/`、`clients/android/`、`clients/ios/` 占位说明
- [x] `docs/QUESTIONS.md` 列出待产品/技术拍板项
- [x] ADR-001 记录 Monorepo 决策

## 已修改/新增文件

- 移动 `favorme/` → `demo/web/`
- 新增 `docs/*`、`AGENTS.md`、根 `README.md`、`backend/README.md`、`clients/*/README.md`、`demo/README.md`

## 交接给下一会话

1. 请项目负责人在 [`docs/QUESTIONS.md`](../QUESTIONS.md) 中填写或讨论：市场、登录方式、后端框架终选、是否首版上 Redis/会员等。
2. 根据答复更新 [`product-scope.md`](../product-scope.md)、[`tech-stack.md`](../tech-stack.md)，并新增 ADR（如选定 NestJS + Prisma）。
3. 新建 `Task-001`：初始化 `backend` 空壳（健康检查、Docker、CI 占位）。
