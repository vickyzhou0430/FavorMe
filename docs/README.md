# 文档索引

本目录是 FavorMe 项目的**长期记忆**：产品范围、架构、技术栈、部署与任务拆解以文件为准，不依赖单条聊天会话。

## 必读顺序（新成员 / 新会话）

1. [`team-workflow.md`](team-workflow.md) — **产品 / 设计 / 开发**分工、**PRD 与 Figma 固定位置**、与 `demo` 同步规则（**强烈建议全员先读**）
2. [`product-scope.md`](product-scope.md) — 产品做什么、不做什么（**已拍板**）
3. [`architecture.md`](architecture.md) — 系统分层与模块边界
4. [`tech-stack.md`](tech-stack.md) — 各子项目技术选型（**已拍板**）
5. [`glossary.md`](glossary.md) — 术语表

## 按主题

| 文档 | 说明 |
|------|------|
| [`QUESTIONS.md`](QUESTIONS.md) | 决策**摘要**（**已拍板**；细节以 `product-scope` / `tech-stack` 为准） |
| [`prd/`](prd/README.md) | **PRD** 索引与模板；**可验收**需求；与 `demo/web` 同步 |
| [`design/`](design/README.md) | **Figma** 与设计交付入口、变更记录 |
| [`backend-roadmap.md`](backend-roadmap.md) | 后端从 MVP 到可商用的大致阶段（可随决策调整） |
| [`deployment.md`](deployment.md) | 环境、部署、密钥与观测（随实际上线补全） |
| [`decisions/`](decisions/) | 架构决策记录（ADR 风格） |
| [`modules/`](modules/) | 按业务模块沉淀接口与表设计（含 [`ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)） |
| [`tasks/`](tasks/) | 可接力的任务单与进度 |

## 子目录说明

- **`decisions/`**：每个文件记录一次重要选择（为什么、替代方案、后果）。
- **`modules/`**：随开发补充，如 `auth`、`user-profile`、`ai-gateway` 等。
- **`tasks/`**：每个文件对应一条可执行工作流；做完后把「交接说明」写进文件底部。
