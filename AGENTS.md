# 协作者与 Cursor 工作约定

本文件描述在本仓库中协作的**硬约定**，供人类与 AI 工具共同遵守。详细背景见 [`docs/README.md`](docs/README.md)。

## 三人团队（产品 / 设计 / 开发）

- 角色分工、**PRD 固定目录**、**Figma 入口**、**改 demo 必改 PRD** 等流程见 [`docs/team-workflow.md`](docs/team-workflow.md)。  
- **PRD** 见 [`docs/prd/README.md`](docs/prd/README.md)；**设计** 见 [`docs/design/README.md`](docs/design/README.md)。

## 单仓布局

- `demo/web`：演示与 H5 资产；MVP 可内嵌于 **WebView 薄壳**；**长期** 由 `clients/flutter` 逐步接棒核心体验（见 `docs/tech-stack.md`）。
- `backend`：正式业务与 AI 网关、用户数据、订单等，**为商用主路径**。
- `clients/android`、`clients/ios`：MVP 阶段可放 **WebView 薄壳**；**正式期** 主工程在 `clients/flutter`（Flutter 双端）。

## 设计原则

1. **可演进的 MVP**：首版可小，但目录与模块边界要允许扩展，不押注一次性脚本。
2. **密钥与 Prompt 不落在客户端仓库的明文里**；通过环境变量与后端管理。
3. **重大技术选择必须留痕**：写入 [`docs/decisions/`](docs/decisions/)。
4. **任务可接力**：大任务拆到 [`docs/tasks/`](docs/tasks/)，新会话以任务文件为“恢复点”。

## 请求 AI 实现代码时的建议写法

- 先指明要读的设计文档或任务号，例如：「先读 `docs/tasks/xxx.md` 和 `docs/architecture.md`」。
- 单次会话尽量围绕**一个任务**（实现 / 联调 / 排错 分开）。
- 完成一段工作后，**更新对应任务文件**（进度、已改文件、未决问题）。

## 与本文冲突时

以 [`docs/tech-stack.md`](docs/tech-stack.md) 与 [`docs/architecture.md`](docs/architecture.md) 的已定稿版本为准；**决策摘要** 见 [`docs/QUESTIONS.md`](docs/QUESTIONS.md) 与 [`docs/decisions/`](docs/decisions/)。
