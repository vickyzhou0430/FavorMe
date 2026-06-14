# Claude Code 入口

本仓库的协作硬约定见 [AGENTS.md](AGENTS.md)。新会话开始前先读它，再读下面相关的索引文件。

## 关键索引

- **团队流程**：[docs/team-workflow.md](docs/team-workflow.md)
- **技术栈 / 架构**：[docs/tech-stack.md](docs/tech-stack.md)、[docs/architecture.md](docs/architecture.md)
- **任务接力点**：[docs/tasks/](docs/tasks/) — 大任务的"恢复点"，新会话围绕单个任务文件展开
- **决策留痕**：[docs/decisions/](docs/decisions/) — 重大技术选择写这里
- **规划状态**：[.planning/STATE.md](.planning/STATE.md)、[.planning/PROJECT.md](.planning/PROJECT.md)
- **PRD / 设计**：[docs/prd/README.md](docs/prd/README.md)、[docs/design/README.md](docs/design/README.md)

## 单仓布局速查

- `backend/` — NestJS 后端，业务与 AI 网关主路径
- `demo/web/` — H5 演示资产，MVP 可由 WebView 薄壳内嵌
- `clients/flutter/` — 正式期双端主工程
- `clients/android/`、`clients/ios/` — MVP 阶段 WebView 薄壳

## 与本文冲突时

以 [docs/tech-stack.md](docs/tech-stack.md) 与 [docs/architecture.md](docs/architecture.md) 的已定稿版本为准。
