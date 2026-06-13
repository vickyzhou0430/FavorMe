# ADR-005：核心链路升级为「动态问卷状态机」+ 有状态会话端点

- **状态**：已采纳并实现（2026-06-13）
- **日期**：2026-06-13
- **决策者**：Jimmy Sun（产品/开发）
- **关联**：升级 [ADR-004](004-agent-backend-control-plane.md) 的「单轮三问」执行形态；来源 PRD V2.0（`docs/prd/_点醒_…V2.0.pdf`）+ 对应参考实现 demo（`demo/dianxing-demo`，Manus 出品的 React+tRPC+Drizzle 原型）。
- **修订**：2026-06-13 综合 PRD V2.0 与 demo 定稿。**与 V2.0/demo 的差异（按产品决策）**：
  - 题量：V2.0/demo 用**固定 5 道**；本项目改回**动态 3–5 道收题**（满足收题标准即可结束，最多 5，由服务端判定）。
  - 五级量表、追问 ≤2 次、结果页 5 部分、历史记录模块、四重 JSON 解析：**沿用** demo。
  - LLM JSON 形态：参考 demo 的 snake_case 契约，由本项目定稿（非照搬 PDF 文案）。
  - 视觉设计：**交由实现方**（demo 的「深色极简 + 琥珀金」可作灵感，不强制）。

## 背景

现有实现是**固定三问**：后端 `POST /v1/insight/questions` 一次性生成正好 3 道题（固定 3 维度 `inner_preference / fear_boundary / active_vs_avoidance`），`POST /v1/insight/submit` 收齐答案后产出一段 `conclusion`；Flutter 客户端硬编码「必须正好 3 题」。这两个端点是**无状态**的。

PRD V2.0 把产品形态从「固定三问」升级为**「动态问卷（Dynamic Questionnaire）」**：

- 一屏一题、**逐题实时生成**、**动态 3–5 道**：满足收题标准即可结束，最多 5 道（由服务端判定）；
- 选项为**五级量表**：A / 偏A / 中间 / 偏B / B；选项文本只描述两端极端立场；
- AI 每轮在 **8 种心理学策略**中选择（**不可连续使用同一种**）；5 题须覆盖不同维度（建议 ≥1 情绪反应、≥1 行为核查、≥1 价值观/遗憾）；
- 入口层按「能否识别选项 A/B」分流（识别 → 出题；信息不足 → 追问，**最多 2 次**，2 次后强制出题；完全没方向 → 预设场景卡片引导）；
- 结果页结构化为 **5 部分**：点醒金句（20–40字）/ 内心倾向标签（≤15字）/ 潜意识分析（100–200字）/ 选择轨迹回顾（含五级+策略标签）/ 行动建议（30–50字）；
- 模型每轮输出固定 JSON，含 `status ∈ {need_info, questioning, finished}`；
- **完整会话自动落库**，支持历史列表与详情复盘。

这一形态与「一次性生成全部题目」的无状态端点**不兼容**：必须逐题生成、把历史（含五级选择原文）回传模型，由后端按计题规则控制收题。

> **栈澄清**：PRD V2.0 的「✅ 已实现」与技术栈（React 19 + tRPC + Express + MySQL/Drizzle）描述的是**另一套参考 Web 实现**；本仓库后端继续 **NestJS + Prisma + PostgreSQL**（ADR-002），客户端为 **Flutter**，本仓内这些能力**均为待实现**。

## 决策

1. **核心控制结构改为服务端状态机**：每一轮（turn）由后端加载会话历史 → 调 LLM（强制 JSON）→ 校验 → 落库 → 返回 `status` 与 `content`。`status` 三态与 PRD 一致：`need_info` / `questioning` / `finished`。

2. **新增有状态「会话」端点（命名空间 `/v1/insight-v2`），旧 `insight` 端点暂保留**（不破坏现有 Flutter 旧链路与已上线行为）：
   - `POST /v1/insight-v2/sessions`：开启会话，跑首轮，返回 `sessionId` + 首个 turn。
   - `POST /v1/insight-v2/sessions/{id}/turns`：提交用户作答 / 补充信息 / 「换一题」，返回下一个 turn。
   - `GET /v1/insight-v2/sessions/{id}`：拉取会话状态与历史（断线恢复 / 结果回看）。
   - 旧 `/v1/insight/questions`、`/v1/insight/submit` 标记为 **deprecated（保留兼容）**，待 Flutter 全量切换后再评估下线（另开 ADR/任务）。
   - **命名约定**：「点醒」为产品名（仅出现在文案）；路由、代码模块、表名统一用 `insight-v2` / `InsightV2`。

3. **回传完整选项文本 + 五级程度**：用户选择后，服务端按五级量表把「程度 + 完整选项原文」拼回模型（如 `我偏A（但不完全确定）：{option_a}`、`我选中间（两边都有共鸣）：A是'{option_a}'，B是'{option_b}'`），不只传 `"A"/"B"`（PRD 工程避坑第 2、3 条）。

4. **强制 JSON 输出 + 四重健壮解析**：LLM 调用加 `response_format={ "type": "json_object" }`；解析实现四重兜底（直接解析 → 移除控制字符 → 转义换行 → 提取 JSON 块）。**模型输出契约**（snake_case，参考 demo 定稿）：`need_info{clarify_question}` / `questioning{question:{question,option_a,option_b,strategy,reasoning}}` / `finished{report:{awakening_quote,tendency,analysis,action_advice}}`；其中 `reasoning` 仅内部使用、不下发客户端。

5. **计题与收题由服务端控制**（前端不判收题）：以会话历史中 `status=questioning` 条数为「已出题数」。
   - **收题标准（同时满足才允许 `finished`）**：① 已出题数 ≥ 2；② ≥ 2 题选项指向同一倾向（一致性信号）；③ ≥ 1 题用了深层策略（行为核查 / 价值观拉升 / 自我决定论 / 遗憾最小化）。
   - **硬约束**：已出题数 < 2 时**禁止** `finished`（过早收题则纠正为继续出题）；已出题数 = 5 时**强制** `finished`（上限）。
   - 追问 `need_info` **最多 2 次**，2 次后强制出题。
   - 策略**不可连续重复**（提示词约束 + 服务端软校验，连续相同则重试一次）。

6. **持久化新增 `InsightV2Session` 表**：自动落库完整会话（纠结描述、追问 Q&A、5 题的五级选择+策略轨迹、最终报告），支撑历史列表与详情复盘。字段语义对齐 PRD V2.0 的 `decisionSessions`（`dilemma`/`clarifyQuestion`/`clarifyAnswer`/`answers`/`awakeningQuote`/`analysis`/`tendency`/`actionAdvice`）。现有 `Conversation/Message/ConversationMemory` 通用 chat 表**继续保留为未来多轮 chat 预留**，本期不复用。

7. **8 策略、冲突类型识别与推荐出题顺序**沉淀到后端提示词模板（`backend/src/insight-v2/prompts/`），与 PRD V2.0 的九节「核心 System Prompt」对齐；客户端**不**持有完整商业 Prompt（延续 ADR-004 / tech-stack 边界）。

8. **策略深层标记（用于 5 题维度覆盖建议，非收题门槛）**：深层集合 = `{behavioral_verification, identity_based, self_determination, regret_minimization}`；浅层 = `{loss_aversion, construal_level_shift, extreme_scenario, sunk_cost_isolation}`。判定原则：是否逼用户直面**选择背后的真实驱动力**（真实行为 / 身份 / 自主性 / 临终价值），而非仅靠改写情境勾出本能反应。5 题建议至少各覆盖：情绪反应（损失厌恶/极端情境）、实际行动（行为核查）、深层动机（价值观/遗憾）各 1 道。

9. **Prompt 运行时覆盖（debug 调参，2026-06-13 增订）**：默认 System Prompt 内置在代码并随构建发布；为便于频繁调参而不重新部署，引入可选的**运行时覆盖**：后端 `PromptService` 在每轮调 LLM 时读取生效提示词（有非空覆盖且开关开启则用覆盖，否则用内置默认），覆盖持久化到 `PromptOverride` 表。总开关 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED` **默认关闭**（生产不被随意改写）；客户端仅在 **debug 模式**暴露调参入口。这是内网/开发用途，不经公网暴露，且完整商用 Prompt 仍不下发客户端明文（延续 ADR-004 边界）。同时确认：§七 8 策略库在提示词中保留与 demo 同深度的五段结构（核心 IP，不精简），仅 `strategy` 改用英文 key 便于服务端校验。

## 备选方案

- **无状态「下一步」端点（每次回传完整历史，前端持有状态）**：实现更轻、后端无需落 session 表，但历史在客户端易被篡改、断线恢复与审计弱、与 ADR-004「控制平面在服务端」方向不一致。→ 备选，未选。
- **直接替换旧 insight 端点**：最干净，但会立即破坏现网 Flutter 旧链路，过渡期无回退。→ 未选（选择保留兼容）。
- **复用 `Conversation/Message` 通用 chat 表**：省一张表，但需把问卷 turn 语义映射进自由 chat 结构，查询与校验更绕。→ 未选。

## 后果

- **正面**：与 PRD 形态一一对应；服务端掌握收题逻辑与审计；旧链路保留可灰度切换；提示词与策略集中在后端，便于调优与合规。
- **负面 / 风险**：后端需维护 session 状态机与收题判定（比无状态端点重）；逐题调用 LLM 使单次决策的总调用数从 2 次上升到约 4–7 次（3–5 题 + 最多 2 追问，**成本与时延上升**，需在审计中观测）；Flutter 需较大改造（固定 3 题 → 动态 3–5 + 五级量表 + 历史模块）。
- **与 demo 的差异成本**：demo 用「固定 5 题 + 纯提示词计题 + 无状态」，本项目用「动态收题 + 服务端护栏 + 有状态」；提示词的「强制检查」一节需从「数满 5」改写为「收题标准判定」，并在服务端兜底校验。
- **待办**：
  - [x] 同步 `docs/product-scope.md`、`docs/architecture.md`、`docs/modules/insight-v2-dynamic-questionnaire.md`（新增）。
  - [x] 在 `docs/prd/README.md` / `docs/decisions/README.md` 索引登记。
  - 实现细节与拆解见 `docs/tasks/004-dianxing-dynamic-questionnaire.md`。
  - [ ] 成本/时延上限与限流策略（逐题调用）在联调期定阈值并写入审计。
