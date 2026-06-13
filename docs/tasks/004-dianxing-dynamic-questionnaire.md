# 任务 004：「点醒」动态问卷（状态机）实现

- **状态**：实现完成（后端 + Flutter + docs；待真机/真实 LLM 联调）
- **负责人**：Jimmy Sun
- **创建日期**：2026-06-13
- **目标完成**：TBD
- **依据**：PRD V2.0 + 参考实现 demo（`demo/dianxing-demo`）+ [ADR-005](../decisions/005-dynamic-questionnaire-state-machine.md)

> **参考实现**：`demo/dianxing-demo`（Manus 出品，React + tRPC + Express + Drizzle/MySQL）是 PRD 对应的可运行原型。其 **System Prompt 全文、LLM JSON 契约、五级回拼格式、四重 JSON 解析、`decisionSessions` 表** 是本任务的权威参考来源（见 `server/routers/decision.ts`、`client/src/hooks/useDecisionAI.ts`、`server/routers/history.ts`）。
>
> **本项目与 demo 的差异（按产品决策）**：① 题量由 demo 的**固定 5 道**改回**动态 3–5 道收题**（最多 5，服务端判定）；② 后端由 demo 的**无状态**改为**有状态会话**（ADR-005）；③ LLM JSON 形态参考 demo 但由本项目定稿；④ **视觉设计交由实现方**（demo 的深色极简+琥珀金仅作灵感）。本仓技术栈不变：后端 NestJS + Prisma + **PostgreSQL**、客户端 **Flutter**。

## 目标

把核心链路从**固定三问**升级为**动态问卷**：逐题生成、**动态 3–5 道收题**、**五级量表**、结构化点醒报告（5 部分）、完整会话落库 + 历史复盘。覆盖 **backend** + **clients/flutter**，并同步相关 `docs`。

## 不在此任务范围内

- `demo/web`（老「心安指南」产品，本任务不改）。
- 旧 `/v1/insight/*` 端点的**下线**（本期仅标记 deprecated 保留兼容）。
- 「分享金句卡片」「换一题」（demo 标记为📋规划中 → 本期 API 预留 `regenerate`，UI 可后置）。
- 会员计费闭环、深度报告多天引导、B 端接入。
- 通用多轮 chat（`Conversation/Message` 表）落地；正式登录账号体系（继续匿名/设备维度）。

## 前置条件

- [ ] 确认 ADR-005：**动态 3–5 道收题**、五级量表、追问 ≤2、有状态端点、保留旧端点、新增 `InsightV2Session` 表。
- [ ] 确认逐题调用 LLM 的成本/时延（单次决策约 4–7 次调用）。
- [ ] 确认结果页 5 部分结构即最终验收口径。

---

## 一、API 契约（草案，实现以此为准）

前缀 `/v1`，命名空间 `insight-v2`，沿用现有鉴权头：`Authorization: Bearer <API_TOKEN>` + `X-Device-Id`（必填）+ `X-Request-Id`（可选）。

> 命名约定：「点醒」为产品名（仅文案）；路由 / 代码模块 / 表名统一用 `insight-v2` / `InsightV2`。

### 1. `POST /v1/insight-v2/sessions` — 开启会话并跑首轮

请求：`{ "dilemma": "用户的纠结描述", "inputMode": "text" }`

响应：见下「turn 响应结构」。

### 2. `POST /v1/insight-v2/sessions/{id}/turns` — 提交输入 / 作答 / 换一题

请求（按当前 `status` 三选一）：
```jsonc
// 回答 questioning（五级量表，仅传 level；服务端按存档选项原文回拼给模型）
{ "action": "answer", "questionId": "uuid", "level": "a" | "lean_a" | "middle" | "lean_b" | "b" }

// 回答 need_info 的追问
{ "action": "reply", "replyText": "用户补充内容" }

// 换一题（规划中；不计入已答题数，AI 换策略重出当前题）
{ "action": "regenerate", "questionId": "uuid" }
```

响应：见下「turn 响应结构」。

### 3. `GET /v1/insight-v2/sessions/{id}` — 会话详情 / 断线恢复 / 历史复盘

响应：会话头 + 完整 transcript（追问 Q&A + 已出题轨迹含五级与策略）+（已 finished 时）report。

### 4. `GET /v1/insight-v2/sessions?cursor=&limit=` — 历史列表

响应：分页列表，每条含 `id`、`dilemma`、`awakeningQuote`、`tendency`、`askedCount`、`createdAt`。

### turn 响应结构（客户端面，camelCase）

```jsonc
{
  "sessionId": "uuid",
  "status": "need_info" | "questioning" | "finished",
  "askedCount": 0,     // 已出题数 0..5（= 历史中 questioning 条数）
  "clarifyCount": 0,   // 已追问数 0..2
  "content": {
    // need_info
    "clarifyQuestion": "（≤30字）",

    // questioning
    "questionId": "uuid",
    "strategy": "behavioral_verification",
    "questionText": "（≤50字，不内嵌选项）",
    "optionA": "极端立场A",
    "optionB": "极端立场B",

    // finished
    "awakeningQuote": "金句（20-40字）",
    "tendency": "内心倾向标签（≤15字）",
    "analysis": "潜意识分析（100-200字，引用具体选择为证据）",
    "actionAdvice": "行动建议（30-50字，今天可做的小行动）",
    "trajectory": [
      { "questionId": "...", "strategy": "...", "questionText": "...",
        "optionA": "...", "optionB": "...", "level": "lean_a" }
    ]
  }
}
```

### LLM 输出契约（模型 → 后端，snake_case，参考 demo `decision.ts` 定稿）

```jsonc
{ "status": "need_info", "clarify_question": "..." }
{ "status": "questioning", "question": { "question": "...", "option_a": "...", "option_b": "...", "strategy": "behavioral_verification", "reasoning": "内部推理，用户不可见" } }
{ "status": "finished", "report": { "awakening_quote": "...", "tendency": "...", "analysis": "...", "action_advice": "..." } }
```

- `reasoning` 仅内部使用 / 入审计日志，**不下发客户端**。客户端面（上文 turn 结构）用 camelCase 映射；`action_advice` → `actionAdvice`。

- 错误体沿用现有：`{ "error": { "code", "message", "request_id" } }`。
- 五级回拼格式（服务端拼给模型，PRD 避坑 2/3）：
  - `a` → `我选A（完全认同）：{option_a}`
  - `lean_a` → `我偏A（但不完全确定）：{option_a}`
  - `middle` → `我选中间（两边都有共鸣，难以明确偏向）：A是'{option_a}'，B是'{option_b}'`
  - `lean_b` → `我偏B（但不完全确定）：{option_b}`
  - `b` → `我选B（完全认同）：{option_b}`

---

## 二、计题与收题规则（服务端判定，最高优先级）

以会话历史中 `status=questioning` 条数为「已出题数」：

| 已出题数 | 动作 |
|---|---|
| 0 | Stage 1 / Stage 2：识别纠结结构；信息不足则 `need_info`（**追问 ≤2 次**，2 次后强制出题），足够则出第 1 题 |
| 1 | **必须 `questioning`**（未达收题最低 2 题）|
| 2 / 3 / 4 | 满足**收题标准**则可 `finished`，否则继续 `questioning` |
| 5 | **必须 `finished`**（题量上限）|

**收题标准（同时满足才允许 `finished`）**：
1. 已出题数 ≥ 2；
2. ≥ 2 题选项指向同一倾向（一致性信号）；
3. ≥ 1 题用了深层策略（`behavioral_verification` / `identity_based` / `self_determination` / `regret_minimization`）。

- 服务端校验模型返回的 `status` 与上述规则一致：已出题数 < 2 却返回 `finished` → 纠正为继续出题（重试一次）；已出题数 = 5 → 强制 `finished`。
- 策略**不可连续重复**（记录 `strategy` 序列，连续相同则重试一次）。
- 前端**不做**收题判断。
- > 对比 demo：demo 的提示词「强制检查」是「数满 5 才收题」；本项目改写为上述「收题标准 + 最多 5」的判定，并在服务端兜底。

---

## 三、8 策略枚举 + 冲突类型组合（后端常量 + 提示词）

| key | 中文 | 深层（维度覆盖用） |
|-----|------|----|
| `loss_aversion` | 损失厌恶测试 | 否（情绪反应）|
| `construal_level_shift` | 心理距离拉伸 | 否 |
| `extreme_scenario` | 极端情境假设 | 否（情绪反应）|
| `behavioral_verification` | 行为核查 | **是（实际行动）** |
| `sunk_cost_isolation` | 沉没成本剥离 | 否 |
| `identity_based` | 价值观拉升 / 身份认同 | **是（深层动机）** |
| `regret_minimization` | 遗憾最小化 | **是（深层动机）** |
| `self_determination` | 自我决定论核查 | **是（深层动机）** |

**维度覆盖建议（非硬门槛）**：5 题建议至少各含 1 道「情绪反应（损失厌恶/极端情境）」「实际行动（行为核查）」「深层动机（价值观/遗憾）」。

**冲突类型 → 优先组合 + 推荐前 3 题顺序**（写入提示词）：

| 冲突类型 | 优先策略组合 | 推荐前 3 题顺序 |
|---|---|---|
| A 还是 B（势均力敌）| 损失厌恶 + 遗憾最小化 | 损失厌恶 → 行为核查 → 价值观拉升 |
| 做还是不做 | 行为核查 + 极端情境假设 | 行为核查 → 极端情境 → 心理距离拉伸 |
| 放弃还是坚持 | 沉没成本剥离 + 极端情境假设 | 沉没成本剥离 → 极端情境 → 价值观拉升 |
| 外界期待 vs 内心渴望 | 自我决定论核查 + 价值观拉升 | 自我决定论 → 行为核查 → 价值观拉升 |

---

## 四、后端实现要点（NestJS）

新增 `backend/src/insight-v2/` 模块（与现有 `insight/` 并存）：

- `insight-v2.module.ts` / `insight-v2.controller.ts` / `insight-v2.service.ts`
- `prompts/insight-v2.prompt.ts`：以 demo `server/routers/decision.ts` 的 `SYSTEM_PROMPT` 全文为蓝本移植九节（输出格式 / 强制检查 / Stage1-3 / 冲突识别与策略优先级 / 8 策略库 / 出题规则 / 点醒报告策略）；**改写「强制检查」一节**：由 demo 的「数满 5 才收题」改为本项目「收题标准（≥2 题 + 一致性信号 + ≥1 深层策略）+ 最多 5 题」。`buildTurnUserPrompt(history)` 拼接历史（含五级选择原文）。
- `dto/`：`StartSessionDto`、`SubmitTurnDto`（`action` 判别联合：answer/reply/regenerate；`level` 五档枚举）。
- `validators/`：复用 `normalizeAndValidateRawQuestion`（规范化与上限）。
- **四重健壮 JSON 解析**：直接解析 → 移除控制字符 → 转义换行 → 提取 `{...}` JSON 块；任一成功即用。
- LLM 输出 zod 校验：按 `status` 分支校验；`questioning` 必须含 `question/option_a/option_b/strategy`，选项口语化且严禁「都行/不知道」。
- **计题护栏**（见第二节）：校验模型 `status` 与已出题数一致；过早 finished / 超 5 / 连续同策略 → 重试一次或纠正。
- `LlmService.completeChat` 增加 `responseFormat?: 'json_object'` 透传。
- 旧 `insight.controller`/`service` 加 `@deprecated` 注释与日志标记（行为不变）。
- **策略库写满（核心 IP）**：`insight-v2.prompt.ts` §七 8 条策略均保留 demo 同深度的「心理学原理 / 适用场景 / 出题思路 / 选项两端 / 禁止」五段（仅 `strategy` 用英文 key），不做精简——压缩这部分会显著降低出题质量。

### 四之二、Prompt 运行时调参（debug，新增）

为便于频繁调 Prompt 而不重新部署：

- 新增 `backend/src/prompt/`：`PromptService` 在每轮调 LLM 时**运行时读取**生效提示词（覆盖优先，空则回退内置默认）；总开关 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED`（默认关闭）。
- 新增 `PromptOverride` 表（`key`/`content`/`updatedAt`/`updatedBy`）+ 迁移 `20260613210000_add_prompt_override`。
- `InsightV2Controller` 新增 `GET/PUT/DELETE /v1/insight-v2/prompt`：GET 只读返回 `{key,enabled,hasOverride,defaultPrompt,effectivePrompt,override}`；PUT/DELETE 需开启覆盖，否则 `403 PROMPT_OVERRIDE_DISABLED`。`UpdatePromptDto` 限长 40000 字符。
- `InsightV2Service` 调模型处由内置常量改为 `prompts.getEffectivePrompt(KEY, INSIGHT_V2_SYSTEM_PROMPT)`。

### 数据模型（Prisma 迁移，对齐 V2.0 `decisionSessions` 语义）

新增 `InsightV2Session`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid PK | |
| `userId` | FK→User | 设备维度用户（匿名亦落到设备 user）|
| `status` | enum(`need_info`,`questioning`,`finished`) | 当前状态 |
| `dilemma` | text | 原始纠结描述 |
| `optionA` / `optionB` | text? | 识别出的两端（可空，need_info 阶段）|
| `clarifyJson` | Json | 追问 Q&A 列表（≤2 条 `{question,answer}`）|
| `answersJson` | Json | 3–5 题轨迹 `{questionId,strategy,questionText,optionA,optionB,level}` |
| `strategiesJson` | Json | 已用策略序列（防连用）|
| `awakeningQuote` | text? | 点醒金句（finished）|
| `tendency` | varchar? | 内心倾向标签 |
| `analysis` | text? | 潜意识分析 |
| `actionAdvice` | text? | 行动建议 |
| `requestId` | text | 审计关联 |
| `createdAt`/`updatedAt` | ts | |

- 迁移：`backend/prisma/migrations/<ts>_add_insight_v2_session/`。
- 审计：逐轮可选写 `LlmInvocation`（model/tokens/latency/requestId）。

### 后端测试（Node 内置 test runner）

- `insight-v2-start-session.test.ts`：识别 A/B → 首轮 `questioning`；信息不足 → `need_info`。
- `insight-v2-statemachine.test.ts`：已出题数 < 2 不允许 finished；满足收题标准可 finished；=5 强制 finished；追问 ≤2；策略不连用。
- `insight-v2-output-validation.test.ts`：非 JSON / 缺字段 / 缺 strategy → `LLM_OUTPUT_INVALID`；四重解析各分支命中。
- `insight-v2-level-passback.test.ts`：五级 → 回拼文本格式正确。
- LLM 用 fake 注入（参考现有 `insight-*.test.ts`）。

---

## 五、Flutter 实现要点

新增 `clients/flutter/lib/src/features/insight_v2/`（与现有 `insight/` 并存；`favorme_app.dart` 默认入口切到 insight_v2，insight 暂保留不接线）：

- `insight_v2_models.dart`：`InsightV2Status`（needInfo/questioning/finished）、`InsightV2Level`（a/leanA/middle/leanB/b）、`InsightV2Turn`、`InsightV2Content`、`TrajectoryItem`、`InsightV2Report`、`SessionSummary`。
- `insight_v2_api_client.dart`：`startSession()` / `submitTurn(action,…)` / `getSession()` / `listSessions()`；沿用现有 `InsightApiClient` 的 TLS/超时/错误处理与请求头。
- `insight_v2_view_model.dart`（ChangeNotifier）：状态 `idle / starting / needInfo / answering / submitting / showingResult / error`，由**服务端 status 驱动**（不硬编码题数；askedCount 来自服务端）。请求序号防竞态沿用现有 `_requestSeq`。
- UI / 设计（**视觉由实现方决定**；demo 的「深色极简 + 琥珀金 + 打字机」可作灵感，不强制照搬）：
  - 入口：大输入框 + **预设场景卡片**（若干静态场景：辞职创业、两个 offer、感情关系、出国读研、消费决策、主动联系等，点击填充输入框）。
  - need_info：展示 `clarifyQuestion` + 文本输入框，提交走 `action=reply`。
  - questioning：一屏一题、**五级量表选择器**（A / 偏A / 中间 / 偏B / B）、进度指示（动态题量，最多 5；建议圆点而非数字，避免暴露固定题数）、过渡动效（如「正在深入分析…」）、「换一题」按钮（`regenerate`，可后置）。
  - finished：结果页 5 部分 —— 金句（大字、可打字机）/ 内心倾向标签 / 潜意识分析 / 选择轨迹回顾（每题五级+策略标签）/ 行动建议。
  - 历史：`history` 列表页（dilemma/金句/倾向标签/时间/答题数）+ `history/:id` 详情复盘页（完整轨迹回放）。需引入简单 `Navigator` 多页导航。
  - 错误/重试沿用现有 `loading_error_card` 模式。
- 移除「必须正好 3 题」相关断言；新模块按 askedCount 驱动。
- **Prompt 调参屏（debug）**：`debug/prompt_debug_screen.dart` + client `getPrompt/updatePrompt/resetPrompt`；入口仅在 `kDebugMode || --dart-define=FAVORME_PROMPT_DEBUG=true` 时在首页头部显示（`tune` 图标）。
- 测试：`insight_v2_flow_test.dart`（need_info→questioning→finished/重试/换一题）、`insight_v2_models_test.dart`（turn/历史解析）、`prompt_debug_test.dart`（调参屏加载/上传/只读态），用 fake client 注入。

---

## 六、docs 同步（与代码同 PR）

- [x] `docs/modules/insight-v2-dynamic-questionnaire.md`：新增，落 API/表/状态机/五级/历史 + Prompt 运行时调参契约（**本模块权威文档**）。
- [x] `docs/product-scope.md`：顶部加 V2.0 主线说明，指向新模块文档。
- [x] `docs/architecture.md`：加 insight-v2 状态机 + PromptOverride 说明。
- [x] `docs/decisions/005-…`：增订决策点（Prompt 运行时覆盖）。
- [x] `docs/prd/README.md` / `docs/decisions/README.md` / `docs/modules/README.md`：索引登记。

## 验收标准（UAT）

- [ ] 可识别 A/B → 直接进入 `questioning`；信息不足 → `need_info`，追问 ≤2 次后强制出题。
- [ ] **动态 3–5 题收题**：< 2 题不会 finished；满足收题标准（一致性信号 + ≥1 深层策略）即收题；最多 5 题。
- [ ] 每题为**五级量表**，选「中间」下一题换更有穿透力的策略。
- [ ] 策略不连续重复；5 题维度覆盖建议基本满足。
- [ ] 结果页含**全部 5 部分**（金句/倾向标签/分析/轨迹回顾/行动建议），金句与分析打字机呈现。
- [ ] 会话**自动落库**；历史列表与详情复盘可用。
- [ ] LLM 输出异常时四重解析兜底；仍失败返回 `LLM_OUTPUT_INVALID`。
- [ ] 旧 `/v1/insight/*` 行为不变（保留兼容）。

## 进度

- 2026-06-13（方案）：完成 PRD 拆解、现状盘点、ADR-005 与本任务单；结合 `demo/dianxing-demo` 定稿动态 3–5 题收题 + 五级量表 + 追问 ≤2 + 结果 5 部分 + 历史 + 四重解析；LLM JSON 用 demo snake_case 契约。
- 2026-06-13（后端）：实现 `src/insight-v2/*`、`InsightV2Session` 迁移、`LlmService.completeChat` 多轮+JSON；单测 12 通过、build/lint 干净。
- 2026-06-13（Flutter）：实现 `features/insight_v2/*`（模型/client/viewmodel/五级量表/结果卡/历史页），默认入口切到 insight_v2；替换旧三问测试为 v2 测试。
- 2026-06-13（调参 + 收尾）：把 §七 策略库恢复到 demo 同深度（核心 IP，不精简）；新增 **Prompt 运行时覆盖**（`PromptService` + `PromptOverride` 表 + `GET/PUT/DELETE /v1/insight-v2/prompt` + Flutter debug 调参屏）；同步 docs。后端 17 测试通过、Flutter 11 测试通过。

## 已修改/新增文件（便于 code review）

- 文档：`docs/decisions/005-…`、本文件、`docs/modules/insight-v2-dynamic-questionnaire.md`（新）、`docs/product-scope.md`、`docs/architecture.md`、各 README 索引。
- 后端：`src/insight-v2/*`（module/controller/service/dto/prompts/test）、`src/prompt/*`（service/module/test）、`src/llm/llm.service.ts`、`prisma/schema.prisma`、迁移 `…_add_insight_v2_session`、`…_add_prompt_override`、`package.json`。
- Flutter：`lib/src/features/insight_v2/*`（models/api_client/view_model/screen/widgets/history/debug）、`lib/src/app/favorme_app.dart`、`test/insight_v2_*`、`test/prompt_debug_test.dart`。

## 阻塞与风险

- 逐题 LLM 调用的**成本与时延**：单次决策约 6–8 次调用，需限流 + 审计阈值。
- 完整 8 策略库 + 五级量表 + 收题标准使 Prompt 较长，需控制 token 与稳定性。
- 历史模块 + 多页导航是 Flutter 端新增工作量（当前为单屏无路由）。
- 旧端点保留期的双链路维护成本。

## 交接给下一会话

方案确认后，从 **backend `src/insight-v2/` 模块骨架 + `insight-v2.prompt.ts`（以 demo `decision.ts` 的 SYSTEM_PROMPT 为蓝本、改写收题一节）+ Prisma `InsightV2Session` 迁移** 开始；先用 fake LLM 打通「动态收题判定 + 五级回拼 + 四重解析」单测，再接 Flutter（五级量表 + 动态进度 + 打字机 + 历史页），最后同步 docs。
