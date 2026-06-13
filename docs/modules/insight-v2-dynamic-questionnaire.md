# 模块：点醒 · 动态问卷状态机（insight-v2）

> **状态**：已实现（2026-06-13）。权威依据 [ADR-005](../decisions/005-dynamic-questionnaire-state-machine.md) 与 [任务 004](../tasks/004-dianxing-dynamic-questionnaire.md)。
> 代码：后端 `backend/src/insight-v2/`、`backend/src/prompt/`；客户端 `clients/flutter/lib/src/features/insight_v2/`。
> 这是当前**产品主线**；旧的「固定三问」编排见 [`ai-chat-orchestration.md`](ai-chat-orchestration.md)（`/v1/insight/*`，保留兼容、标记 deprecated）。

## 目标

把核心链路从「固定三问」升级为**有状态的动态问卷**：逐题实时生成、**动态 3–5 道收题**、**五级量表**作答、结构化「点醒报告」（5 部分）、完整会话自动落库与历史复盘。

## 状态机

每一轮（turn）由后端：加载会话 transcript → 取**运行时生效提示词**（见下「Prompt 运行时调参」）→ 调 LLM（强制 JSON）→ 四重解析 → 收题/策略护栏校验 → 落库 → 返回 `status` + `content`。

| status | 含义 | 客户端动作 |
|---|---|---|
| `need_info` | 信息不足，追问（≤2 次，2 次后强制出题） | 展示 `clarifyQuestion`，走 `action=reply` |
| `questioning` | 出一道题（五级量表） | 展示题面 + `ScaleSelector`，走 `action=answer` |
| `finished` | 收题，产出报告 | 展示 5 部分报告 + 轨迹 |

**计题与收题（服务端判定，前端不判）**：以历史中 `status=questioning` 条数为「已出题数」。

- 已出题数 = 0：识别 A/B；信息不足 → `need_info`，足够 → 出第 1 题。
- 已出题数 = 1：必须继续 `questioning`（未达最低 2 题）。
- 已出题数 = 2/3/4：满足**收题标准**可 `finished`，否则继续。
- 已出题数 = 5：强制 `finished`（上限）。

**收题标准（同时满足）**：① ≥ 2 题；② ≥ 2 题指向同一倾向（一致性信号）；③ ≥ 1 题用了深层策略（`behavioral_verification` / `identity_based` / `self_determination` / `regret_minimization`）。

护栏：模型过早 `finished`（<2 题）或返回连续重复策略 → 纠正性重试一次；=5 题强制收题。

## API（前缀 `/v1`，鉴权头 `Authorization: Bearer` + `X-Device-Id` 必填 + `X-Request-Id` 可选）

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/v1/insight-v2/sessions` | 开启会话并跑首轮 |
| `POST` | `/v1/insight-v2/sessions/{id}/turns` | 提交作答 / 补充 / 换一题（`action`: `answer`\|`reply`\|`regenerate`）|
| `GET` | `/v1/insight-v2/sessions/{id}` | 会话详情 / 断线恢复 / 复盘 |
| `GET` | `/v1/insight-v2/sessions?cursor=&limit=` | 历史列表（分页）|
| `GET` | `/v1/insight-v2/prompt` | 读取生效提示词 + 覆盖状态（debug 调参）|
| `PUT` | `/v1/insight-v2/prompt` | 上传覆盖提示词（需开启覆盖功能）|
| `DELETE` | `/v1/insight-v2/prompt` | 清除覆盖，回退默认（需开启覆盖功能）|

**turn 响应（客户端面，camelCase）**：`sessionId` / `status` / `askedCount` / `clarifyCount` / `content{...}`；`content` 按 status 分别含 `clarifyQuestion` | `questionId,strategy,questionText,optionA,optionB` | `awakeningQuote,tendency,analysis,actionAdvice,trajectory[]`。

**LLM 输出契约（模型 → 后端，snake_case，参考 demo `decision.ts`）**：
`need_info{clarify_question}` / `questioning{question:{question,option_a,option_b,strategy,reasoning}}` / `finished{report:{awakening_quote,tendency,analysis,action_advice}}`。其中 `reasoning` 仅内部使用，**不下发客户端**。

**五级回拼**（服务端拼回模型，PRD 避坑）：`a/lean_a/middle/lean_b/b` → 携带「程度 + 完整选项原文」，而非只传 `A/B`。

## 8 策略库

| key | 中文 | 深层（维度覆盖用）|
|---|---|---|
| `loss_aversion` | 损失厌恶测试 | 否 |
| `construal_level_shift` | 心理距离拉伸 | 否 |
| `extreme_scenario` | 极端情境假设 | 否 |
| `behavioral_verification` | 行为核查 | 是 |
| `sunk_cost_isolation` | 沉没成本剥离 | 否 |
| `identity_based` | 价值观拉升 / 身份认同 | 是 |
| `regret_minimization` | 遗憾最小化 | 是 |
| `self_determination` | 自我决定论核查 | 是 |

策略**不可连续重复**。System Prompt 中每条策略保留完整的「心理学原理 / 适用场景 / 出题思路 / 选项两端 / 禁止」五段（与 demo 同深度，仅 `strategy` 用英文 key 便于服务端校验）——这部分是产品核心 IP，刻意写满以保证出题质量。

## 数据模型

- `InsightV2Session`（`backend/prisma/schema.prisma`）：`status` / `dilemma` / `transcriptJson`（完整消息历史）/ `answersJson`（题目轨迹）/ `strategiesJson`（已用策略序列）/ `clarifyCount` / `awakeningQuote` / `tendency` / `analysis` / `actionAdvice` / `requestId`，FK→`User`（设备维度）。
- `PromptOverride`：`key`(PK) / `content` / `updatedAt` / `updatedBy`——运行时提示词覆盖（见下）。

## Prompt 运行时调参（debug）

默认提示词内置在代码 `backend/src/insight-v2/prompts/insight-v2.prompt.ts`（随构建发布）。为便于**频繁调参而不重新部署**：

- 后端 `PromptService`（`backend/src/prompt/`）在每次调用 LLM 时**运行时读取**生效提示词：开启覆盖且存在非空覆盖 → 用覆盖，否则用内置默认。
- 覆盖功能由环境变量 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true` 总开关控制（默认关闭，保证生产不被随意改写）。关闭时 `GET /prompt` 仍可只读查看，`PUT`/`DELETE` 返回 `403 PROMPT_OVERRIDE_DISABLED`。
- 客户端 **debug 模式**（`kDebugMode` 或 `--dart-define=FAVORME_PROMPT_DEBUG=true`）下，「点醒」首页显示调参入口（`PromptDebugScreen`）：拉取生效/默认提示词 → 编辑 → 上传（即时生效）/ 清除覆盖 / 载入默认。
- 覆盖内容上限 40000 字符；`updatedBy` 记录设备 id。

> 安全：覆盖能力是**内网/开发调参**用途，默认关闭、仅服务端持久化、不经任何公网暴露；完整商用 Prompt 仍不下发到客户端明文（延续 ADR-004 / tech-stack 边界）。

## 健壮性

- **四重 JSON 解析**：直接解析 → 移除控制字符 → 转义换行 → 提取 `{...}` 块；全失败返回 `LLM_OUTPUT_INVALID`。
- LLM 调用 `response_format={"type":"json_object"}`（`LlmService.completeChat` 透传）。

## 测试

- 后端：`backend/src/insight-v2/insight-v2.service.test.ts`（状态机/动态收题/四重解析/五级回拼/覆盖生效）、`backend/src/prompt/prompt.service.test.ts`（覆盖开关/读写/空回退）。`npm run test:insight-v2`、`npm run test:prompt`。
- 客户端：`clients/flutter/test/insight_v2_flow_test.dart`、`insight_v2_models_test.dart`、`prompt_debug_test.dart`。

## 成本 / 风险

- 逐题调用使单次决策约 4–7 次 LLM 调用，成本与时延上升，需在审计中观测、限流。
- 旧 `/v1/insight/*` 双链路保留期的维护成本。
