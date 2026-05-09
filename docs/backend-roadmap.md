# 后端路线图（AI 心理洞察 MVP → 可商用第一版）

> 与 [`product-scope.md`](product-scope.md)、[`QUESTIONS.md`](QUESTIONS.md) 对齐后细化；以下为**默认里程碑**，可调整。

## 阶段 0：准备（与仓库/文档同步）

- [x] 单仓目录与文档骨架
- [ ] 确认 [`QUESTIONS.md`](QUESTIONS.md) 中的技术栈与范围
- [ ] 在 [`decisions/`](decisions/) 记录首版技术选型 ADR

## 阶段 1：后端工程初始化

- [x] `backend` 创建可运行空壳（健康检查、统一配置、Prisma、首版迁移）
- [x] 本地 `docker compose` 启 **PostgreSQL** 与 **Redis**（见仓库根 `docker-compose.yml`）
- [x] 首版 `schema` 与 chat 主表（见 `backend/prisma/`、任务 [`tasks/001-backend-initialization.md`](tasks/001-backend-initialization.md)）

## 阶段 2：MVP 业务能力（心理洞察三问）

- [ ] 用户与鉴权（TBD：手机号/短信/微信/Apple）
- [ ] 用户画像 CRUD（账号名、性别、头像、生日、MBTI 等）
- [ ] **问题输入校验**（非问题句/低信息输入拦截，不强行生成三问）
- [ ] **三问生成核心链路**（可选背景、三问生成、选项作答、倾向输出；见 [`modules/ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)）
- [ ] AI 网关：三问提示词约束、调用日志、限流、降级
- [ ] 历史记录与结果查询（便于复盘与后续会员权益扩展）

## 阶段 3：上云与联调

- [ ] `staging`/`prod` 环境部署
- [ ] Android 原生端对真实 API 联调（试水期主线）
- [ ] iOS / WebView / 小程序是否接入，按试水结果评审后排期
- [ ] 基本监控与告警

## 阶段 4：商用第一版加强

- [ ] 支付/会员/权益（若产品需要）
- [ ] 更完善的内容安全
- [ ] 管理后台与运营配置
- [ ] 成本与效果分析、防刷策略增强

## 与任务单的对应

具体可执行任务拆到 [`docs/tasks/`](docs/tasks/)；本文件只保留**阶段级**视图。
