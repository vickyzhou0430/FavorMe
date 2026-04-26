# 模块：AI Chat 编排（控制平面 + 执行占位）

> **状态**：草案，随实现与 ADR-004 更新。与 [`docs/decisions/004-agent-backend-control-plane.md`](../decisions/004-agent-backend-control-plane.md) 一致。  
> 鉴权与用户表的**权威细节**以后续 [`auth.md`](auth.md) 为准；本文列出 chat 主链路的**表名与接口**以便联调。

## 目标

- 提供 **端云聊天**、**登录/鉴权**、**进模型前预处理**、**记忆**、**会话**、**持久化** 的最小闭环。  
- 控制平面与执行平面边界清晰，**后续**可接 tool loop、subagent、多 provider 路由，而不推翻 `conversation` / `message` 主模型。  

## 非目标（本阶段不做）

- 内层 model-tool 多轮循环、subagent 调度、独立意图分类服务、多 LLM 智能路由。  
- 生产级 RAG/向量库（可预留表或 JSON 字段，首版不依赖）。  

## 依赖

- **上游**：`demo/web`、Flutter/WebView 客户端、HTTPS 网关。  
- **下游**：`PostgreSQL`（主存）、`Redis`（限流/会话热数据/短缓存）、大模型 **HTTP API**（经统一 AI 网关模块调用）。  
- **横向**：`auth`（用户与 token）、`ai-gateway` 或同目录下的 LLM 客户端抽象（与本文 `LlmClient` 对齐）。  

## 数据模型（表 / 实体草案）

命名倾向 **Prisma 风格 snake_case 表名**；字段类型为示意，实作时以 `schema.prisma` 为准。

| 表名 | 说明 |
|------|------|
| `users` | 用户主档（与 auth 定稿一致；本模块仅 FK 引用）。 |
| `agent_profiles` | 可复用的 **Agent 配置**：默认模型、system 提示/模板版本、策略/安全 `policy_version`、是否默认等。MVP 通常一行 `default`。 |
| `conversations` | 会话头：`user_id`、`agent_profile_id`、展示用 `title`、状态（active/archived）、时间戳。 |
| `messages` | 单条消息：`conversation_id`、**role**（`user` \| `assistant` \| `system` 若需落库）、**content**（`text` 或 JSONB 多段）、`seq` 或 `created_at` 排序、**client_message_id**（幂等，见下）。 |
| `conversation_memories` | 长期记忆载体（MVP 可用**滚动摘要 + 少量结构化 JSON**）：`conversation_id`、**summary**、**facts**（JSONB 可选）、`version`、`updated_at`。 |
| `llm_invocations` | 审计与成本：**request_id**、外键到 `user_id` / `conversation_id` / 触发的 `message_id`（可空）、model、**prompt_tokens**、**completion_tokens**、**latency_ms**、错误码、**prompt_hash**（可存 hash 不存原文）。 |
| `idempotency_keys` | （可选独立表，或与 `messages` 唯一约束二选一）记录 `Idempotency-Key` + 用户/路由 + 已创建资源 id，防弱网重放。 |

**建议约束**

- `messages`：在 `(conversation_id, client_message_id)` 上 **UNIQUE**（`client_message_id` 为客户端生成 UUID 时）。  
- `conversations`：与 `user_id` 的列表查询索引。  

**Redis 键（非表，占位）**

- 限流：`rate:{ip}`、`rate:{user_id}`。  
- 可选会话尾消息缓存：`conv:{conversation_id}:tail`（TTL 短、PG 为准）。  

## API（草案·REST + JSON）

前缀示例：`/v1`；**真实路径与 DTO 以实现为准**。`Authorization: Bearer <access_token>` 除登录外均需。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/v1/auth/login` | 登录（具体 provider 与 body 以 auth 定稿为准）；返回 `access_token`、`refresh_token`、`expires_in`。 |
| `POST` | `/v1/auth/refresh` | 刷新 access token。 |
| `GET` | `/v1/me` | 当前用户概要。 |
| `GET` | `/v1/conversations` | 分页列表（可选 `cursor` / `limit`）。 |
| `POST` | `/v1/conversations` | 创建会话；body 可含 `agent_profile_id`（缺省用默认 profile）、`title`（可空）。 |
| `GET` | `/v1/conversations/{id}` | 会话详情。 |
| `GET` | `/v1/conversations/{id}/messages` | 历史消息分页（`before_seq` 或 `before` 时间游标）。 |
| `POST` | `/v1/conversations/{id}/messages` | 用户发一条；**必须**带 `client_message_id`（UUID v4）或头 `Idempotency-Key` 二选一封顶；响应含 assistant 一条（非流式）或 `202 + job`（若未来异步，本期可不实现）。 |
| `GET` | `/v1/conversations/{id}/stream` 或 `POST .../completions` | **流式**（SSE）：首版可后上，但路径与 `Accept: text/event-stream` 宜提前约定。 |

**统一响应建议**

- 错误体：`{ "error": { "code": "string", "message": "string", "request_id": "string" } }`（`request_id` 与日志关联）。  
- 成功时 header 可带 `X-Request-Id`（与 `llm_invocations` 一致）。  

## 编排与实现边界（接口草图）

以下用 **TypeScript 风格**描述模块内边界，**非**已存在源码。

### Inbound 与预处理

```ts
/** 进管道前的统一入站视图（多渠道时可扩展） */
type InboundContext = {
  userId: string;
  conversationId: string;
  rawText: string;
  /** 面向大模型的正文（经规范化/截断后） */
  bodyForModel: string;
  /** 与「命令/控制」分轨时的预留；MVP 可与 raw 相同 */
  bodyForCommands: string;
  clientMessageId: string;
  metadata: Record<string, unknown>;
};

type PreprocessResult = {
  context: InboundContext;
  /** 截断/拒绝/需审核等 */
  action: "continue" | "reject";
  rejectReason?: string;
};

type PreprocessPipeline = (ctx: InboundContext) => Promise<PreprocessResult>;
```

### 控制平面：一轮 Turn

```ts
type RunTurnInput = {
  userId: string;
  conversationId: string;
  agentProfileId: string;
  /** 预处理完成后的 user 文本 */
  userContent: string;
  clientMessageId: string;
};

type RunTurnOutput = {
  assistantMessageId: string;
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
};

/**
 * 编排：加载 profile → 拼记忆与工作窗口 → 调 LlmClient → 落库 → 更新 memory 快照
 * 未来在此处插入多段 tool 循环，而不改 API 面。
 */
interface TurnOrchestrator {
  runTurn(input: RunTurnInput): Promise<RunTurnOutput>;
}
```

### 执行平面：大模型与占位

```ts
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface LlmClient {
  complete(params: {
    model: string;
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;

  /** 后续流式 + tool，与 complete 并列扩展 */
  stream?(...args: unknown[]): unknown;
}

/** 本期可 export 单例 no-op；未来接 MCP/HTTP tools */
interface ToolExecutor {
  execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ result: string }>;
}
```

### 记忆

```ts
interface MemoryService {
  /** 拼进 prompt 的短期窗口 + 长期摘要/要点 */
  buildForPrompt(
    userId: string,
    conversationId: string,
    maxRecentMessages: number,
  ): Promise<{ recent: ChatMessage[]; longContextBlock?: string }>;
  /** 在 assistant 落库后异步或同步更新摘要 */
  onTurnCompleted?(conversationId: string): Promise<void>;
}
```

### Provider 选择（本阶段单路）

```ts
interface ModelProviderResolver {
  /** MVP：返回 agent_profile 上配置的 model；以后按策略扩展 */
  resolveForProfile(agentProfileId: string): Promise<{ model: string; provider: string }>;
}
```

## 与请求路径的对应（概念）

1. 鉴权 → `user_id`。  
2. `resolve` 或创建 `conversation` + 默认/指定 `agent_profile`。  
3. 写 `inbound` → **PreprocessPipeline** → `RunTurn` → `LlmClient` → 写 `messages` + `llm_invocations` → `MemoryService` 更新。  

## 错误与边界

- **幂等**：`client_message_id` 或 `Idempotency-Key` 重复时返回**同一**已创建 user/assistant 对或 409 + 已存在资源指针（实现选一种并写清）。  
- **超长输入**：在预处理中硬截断或 `413`，并打审计日志。  
- **限流**：HTTP 429 + 统一 `error` body。  

## 安全与隐私

- **密钥与完整 system prompt 策略**不落客户端；仅服务端与配置中心。  
- `llm_invocations` 存**用量与可选 hash**；全量 prompt 存日志需**分级**与脱敏（上线前定）。  

## 待决问题

- 登录方式（短信/微信/Apple）对 API 与 `users` 表字段的影响。  
- 流式 SSE 是否在 MVP 与 WebView/Flutter 同步排期。  
- `conversation_memories` 的摘要是否异步队列（BullMQ 等）在首版引入。  

## 变更记录

- 2026-04-26：初版（ADR-004 + 表名/API/接口草图）。  
