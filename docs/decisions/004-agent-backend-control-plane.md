# ADR-004：AI Chat 采用「控制平面 + 执行平面」且初版可演进

- **状态**：已接受
- **日期**：2026-04-26
- **决策者**：Jimmy Sun

## 背景

在 PRD、设计稿与 demo 尚未定稿前，仍需要一版**符合主流 agent 产品形态**（控制平面、会话、预处理、记忆、持久化）的后端总结构，避免后期推翻。外部参考包括 OpenClaw 等 **Gateway-centric** 系统所强调的：消息不直连模型、显式 routing/session/policy、与「单轮/多轮 LLM 执行内核」解耦。详细接口与表名草案见 [`docs/modules/ai-chat-orchestration.md`](../modules/ai-chat-orchestration.md)。

## 决策

1. **分层**：后端将「编排与策略」**（控制平面）**与「调用大模型/未来 tool loop」**（执行平面）**分开；MVP 执行平面可为**薄封装**（非流式或 SSE 的 chat 补全），但必须预留可替换为带 tool loop 的状态机。  
2. **路由**：不引入单独「意图分类模型」作主路由；**agent 归属以确定性规则与配置为主**（默认单一 `agent_profile`，后续扩展为多 profile / 绑定规则）。  
3. **预处理**：所有用户输入在进模型前经过**可扩展预处理链**（规范化、安全与策略占位、**面向模型的文本**与其它用途字段分离），见模块文档中的 `InboundContext` / `PreprocessPipeline`。  
4. **MVP 必含**：端云 **chat**、**登录/鉴权**、**会话**、**记忆**（工作记忆 + 可落库的长期记忆占位）、**PostgreSQL 持久化**、**Redis** 用于限流/热数据等（与 ADR-002 一致）。  
5. **本阶段显式不实现**：**agent tool 循环**、**subagent**、**NLP 意图分类主路由**、**多 LLM 自动路由**；在接口与类边界上**预留**（`ToolExecutor` 空实现、`ProviderResolver` 单路默认等），避免后续大改。  

## 备选方案

- **强对标 OpenClaw 全能力一期落地**：对未定稿产品成本过高。  
- **无预处理、无记忆、消息直透模型**：迭代快，但与产品「陪伴/连续对话」及合规演进不一致，且后续难补控制平面。  
- **Python 单独做 agent 服务、Nest 只转发**：MVP 团队边界与 ADR-002 不一致；待确有独立算法/实验需求再**旁路**评估。  

## 后果

- **正面**：与 `NestJS` + `Prisma` + `Redis` 栈一致；模块边界清晰；后续接工具循环、多模型、子任务不必推翻 HTTP 与会话模型。  
- **负面 / 风险**：首版需维护「管道」与「profile 版本」等概念，比「一个 Controller 调 API」略重；需在初版就约定 **idempotency** 与**审计字段**，避免弱网与合规返工。  
- **待办**：实现时同步 `docs/modules/ai-chat-orchestration.md` 中的 API/表名变更；`auth` 与 `user` 详表在 [`docs/modules/auth.md`](../modules/auth.md)（待建）定稿时引用或拆分。
