# Phase 1: 后端三问与结论 API - Context

**Gathered:** 2026-05-09  
**Status:** Ready for planning

## Phase Boundary

在现有 Nest + Prisma 后端上交付可独立用 curl/脚本验证的链路：**提问 → 结构化三问 JSON → 提交选项 → 倾向结论文本**；含输入校验、LLM 调用、鉴权占位、无效输入 4xx。交互上不暴露「会话」概念；一轮结束后整轮入库，客户端回主页。本文件约束实现取舍，不扩大路线图范围。

## Implementation Decisions

### 两阶段 API、无 session 与成本

- **D-01:** 产品交互不呈现 session；一轮 = 用户提问 → 三问 → 作答 → 结论 → **整轮一次入库** → UI 回新主页。
- **D-02:** 对外契约**不引入**面向客户端的 `sessionId`。两步 HTTP 之间 **无状态**：第一步返回三问 JSON，客户端持有；第二步提交 `raw_question` + `questions` 快照 + 作答；服务端校验 schema 与三维度后生成结论。
- **D-03:** **最小化服务器成本**：进行中轮次**不落库、不用 Redis 存快照**；避免为「生成↔提交」维护服务端会话或缓存层（除非后续独立优化）。不增加专用会话基础设施。

### 鉴权、设备 ID、用户生命周期与文档

- **D-04:** Phase 1 使用 **`Authorization: Bearer <token>`**，token 来自服务端环境变量（如 `DEV_API_TOKEN` / 统一 API token 名在实现与 `.env.example` 中固定）。
- **D-05:** **`X-Device-Id` 必填**；缺失返回 **400**。用于追踪与关联（满足 QAS-02 链路与日志串联）；不是可选头。
- **D-06:** **User 在用户每次进入应用并完成初始化时创建/确保存在**（客户端发起初始化；服务端对稳定设备标识做 upsert 或等价逻辑）。具体路由与字段由实现落地，但约束为：**非完整登录体系**，MVP 以设备维度身份为主。
- **D-07:** 鉴权与环境说明同时落在 **`backend/README.md`**、**`backend/.env.example`**，并增加 **文档中的独立小节**（如 `docs/tasks/` 下 API 鉴权与头部约定，或与现有 module 文档交叉引用）——即 README + env 示例 + 短文档次文档（A+B）。

### LLM 接入（Nest，成本与复杂度）

- **D-08:** Phase 1 在 Nest 侧采用 **单一 OpenAI 兼容 HTTP 调用路径**（环境变量配置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL` 等与仓库现有演示一致的可维护命名）。**不在 Phase 1 复制** `demo/web` 中多供应商分支逻辑；通过 **更换 base URL/模型** 切换供应商，保持实现单一路径以降低运维与代码成本。
- **D-09:** 若后续必须显式支持第二供应商，单列为后续任务/adapter，不阻塞本阶段「一条兼容协议跑通」。

### Phase 1 持久化深度（与 QAS-02）

- **D-10:** **仅在「一轮成功结束」时**写业务持久化：用户问题、三问快照、作答、结论文本、关联 `userId`、时间戳等；不在生成与提交两条请求之间写入「进行中」状态表。
- **D-11:** **请求关联**：每个请求 **携带或生成 `X-Request-Id`**（或等价），并写入结构化日志，满足 **QAS-02**。
- **D-12:** LLM 调用审计：**优先结构化日志**（输入摘要、耗时、错误码、request id）。若与现有 Prisma **`LlmInvocation`** 模型对齐且增量成本可接受，可写入审计行；**非** Phase 1 强制（以低成本为先）。

### Claude's Discretion

- Bootstrap 用户的确切路径（专用 `POST /v1/.../bootstrap`  versus 首次业务请求隐式创建）由 planner/实现按 Nest 模块边界决定，须满足 **D-05、D-06**。
- 完成轮次落库映射到现有 `Conversation`/`Message` 或新表，由实现选择，须满足 **D-10** 与现有 schema 演进成本。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements

- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirement IDs（API-01–03, AI-01–03, QAS-02）
- `.planning/REQUIREMENTS.md` — 可追溯需求与 Phase 映射

### Product & AI behavior

- `docs/tasks/002-ai-insight-question-generation.md` — 三问框架、维度枚举、无效输入与输出 JSON 形态
- `docs/product-scope.md` — 产品红线与非医疗、非命令式表述
- `docs/modules/ai-chat-orchestration.md` — 编排与后端意图（与实现落地对照，避免双源架构 drift）

### Architecture & stack

- `docs/architecture.md` — 与已定稿架构一致处为准
- `docs/tech-stack.md` — Nest、Prisma、LLM 经后端等约束
- `.planning/codebase/STACK.md` — 当前仓库技术栈事实
- `.planning/codebase/ARCHITECTURE.md` — 分层与全局前缀 `/v1` 等
- `.planning/codebase/INTEGRATIONS.md` — 外部依赖与 env 线索

### Backend seed / tasks

- `docs/tasks/001-backend-initialization.md` — 后端初始化上下文（若与 Phase 1 重叠则交叉引用）
- `backend/prisma/schema.prisma` — 持久化与 `User` / `LlmInvocation` 等现状

## Existing Code Insights

### Reusable Assets

- `demo/web/src/app/api/ai/route.ts` — OpenAI 兼容与上游 HTTP 模式可参考；Phase 1 Nest 实现应 **单路径简化**，不照搬多分支。
- `backend/src/main.ts` — 全局前缀 `v1`、`ValidationPipe`。
- `backend/src/prisma/prisma.service.ts` — Prisma 接入。
- `backend/prisma/schema.prisma` — `User`、`Conversation`、`Message`、`LlmInvocation` 等；完成轮次如何映射由实现决定。

### Established Patterns

- 配置经 `@nestjs/config` 与环境变量；密钥不进客户端仓库。
- 健康检查已在 `GET /v1/health`。

### Integration Points

- 新路由挂在 Nest `AppModule` 下，遵循 `/v1`。
- CI：`.github/workflows/ci.yml` 当前偏后端构建；新增依赖需在流水线可安装、可构建。

## Specific Ideas

- 用户明确：**最小化服务器成本**；与无状态两阶段、无会话基础设施一致。
- 鉴权：**Bearer + 强制 `X-Device-Id` + 应用初始化时确保 User + README/env/文档三段说明**。

## Deferred Ideas

- 服务端短时快照 / 内部 correlation id（客户端不传大 JSON）——若将来成本与带宽成为问题再评估；当前 **deferred**。
- 多供应商 LLM 分支、完整账号体系、会员分层 —— 见 `.planning/REQUIREMENTS.md` v2 / Out of Scope。

---

*Phase: 1-后端三问与结论 API*  
*Context gathered: 2026-05-09*
