# 后端路线图（MVP → 可商用第一版）

> 与 [`product-scope.md`](product-scope.md)、[`QUESTIONS.md`](QUESTIONS.md) 对齐后细化；以下为**默认里程碑**，可调整。

## 阶段 0：准备（与仓库/文档同步）

- [x] 单仓目录与文档骨架
- [ ] 确认 [`QUESTIONS.md`](QUESTIONS.md) 中的技术栈与范围
- [ ] 在 [`decisions/`](decisions/) 记录首版技术选型 ADR

## 阶段 1：后端工程初始化

- [ ] `backend` 创建可运行空壳（健康检查、统一配置、日志）
- [ ] 选 ORM 与首版数据库迁移
- [ ] 本地 `docker compose` 启 PostgreSQL（及 Redis 若上）

## 阶段 2：MVP 业务能力

- [ ] 用户与鉴权（TBD：手机号/短信/微信/Apple）
- [ ] 用户资料 CRUD
- [ ] 今日运势/心安指南 的服务端 API（替代 demo 中直连或本地逻辑）
- [ ] AI 网关：调用、日志、限流、降级
- [ ] 收藏与历史（或服务端等价的持久化模型）

## 阶段 3：上云与联调

- [ ] `staging`/`prod` 环境部署
- [ ] Android/iOS 或 demo 对真实 API 联调
- [ ] 基本监控与告警

## 阶段 4：商用第一版加强

- [ ] 支付/会员/权益（若产品需要）
- [ ] 更完善的内容安全
- [ ] 管理后台与运营配置
- [ ] 成本与效果分析、防刷策略增强

## 与任务单的对应

具体可执行任务拆到 [`docs/tasks/`](docs/tasks/)；本文件只保留**阶段级**视图。
