# FavorMe — AI 心理洞察助手（Android MVP）

## What This Is

FavorMe 是一款面向日常「小而即时纠结」的 **AI 心理洞察助手**：不替用户下结论，而是通过 **三道带选项的结构化问题** 引导用户自我探索，最后给出 **倾向性反馈**（帮助用户看见内心约 `51%` 的那一侧）。当前 GSD 工作重心是 **Android 原生客户端 + 自建后端** 的最小闭环，与仓库内 `docs/product-scope.md` 的产品口径一致。

## Core Value

**用户提问 → 后端按既定规则生成三问 → 用户在客户端快速选答 → 展示模型生成的倾向结论** —— 这一条链路必须端到端可演示、可复现。

## Requirements

### Validated

（来自当前仓库已实现能力，见 `.planning/codebase/`）

- ✓ **Monorepo 与文档骨架** — `docs/`、`AGENTS.md`、架构与产品范围文档可协作迭代
- ✓ **演示 Web（demo/web）** — Next.js 应用与本地 AI BFF 等（用于产品验证，非本 MVP 主端）
- ✓ **后端空壳（backend）** — NestJS + Prisma、健康检查、首版 schema 与迁移、本地 Docker 依赖说明
- ✓ **代码库地图** — `.planning/codebase/*` 七文档便于 brownfield 规划

### Active

（本里程碑要 toward 的假设性需求；未上线前均为假设）

- [ ] **Android 客户端**：基础「对话式」窗口（输入问题、展示服务端返回的三问与选项、展示结论），可先不做完整账号体系
- [ ] **后端**：接收用户问题，调用大模型，按既定规则（三问框架：剥离外界干扰 / 恐惧底线 / 主动 vs 逃避）生成 **三个带选项的问题**
- [ ] **客户端展示**：将三问与选项以可点选或可滑选的方式呈现（MVP 可用列表+按钮）
- [ ] **提交作答与结论**：用户完成选择后，客户端将选项回传，展示模型生成的 **倾向性结论**（非医疗/非替用户做决定表述）
- [ ] **异常输入**：对明显非问题/无效输入由后端或编排层拦截并返回可理解错误（与 `docs/product-scope.md` 一致）

### Out of Scope

- **iOS 首发、小程序、纯 WebView 首发** — 试水期策略为 Android 优先（见 `docs/product-scope.md`）；其他形态待验证后排期
- **完整生产级登录（短信/微信/Apple）与画像中心** — MVP 可 mock 或极简 token；商用级鉴权另立阶段
- **会员付费、完整解析分层商业化闭环** — 可预留接口字段，本阶段不实现支付
- **长对话陪聊、多轮 Chat 产品形态** — 与「问卷式三问」MVP 冲突，明确不做
- **医疗诊断、精神治疗替代、迷信恐吓话术** — 产品红线

## 目标用户与使用场景

- **谁**：18–35 岁、常被小事纠结、希望快速厘清「我更偏向哪边」的年轻用户（与产品文档一致，可后续用数据修正）。
- **典型场景**：二选一或多选一的生活小事（买不买、去不去、选 A 还是 B），需要 **几分钟内** 完成一次「提问 → 三问 → 结论」。
- **非场景**：需要长文对比、参数表格、严肃心理咨询或医疗决策 —— 明确不服务。

## 成功标准（MVP）

1. **功能**：在真机或模拟器上，用户能完成一次完整流程：输入问题 → 看到三问与选项 → 选择 → 看到倾向结论。
2. **规则**：三问在内容维度上可追溯到「外界干扰 / 恐惧底线 / 主动 vs 逃避」三类意图（可由 PM/开发抽检或自动化契约测试兜底）。
3. **稳定**：弱网或模型失败时有可感知错误提示，不白屏、不死循环；无效输入被拦截而非强行生成三问。
4. **可追溯**：至少有一条请求链路日志（请求 id、耗时、错误码），便于调试与成本核算。

## Context

- **Brownfield**：仓库已有 `demo/web`、`backend`、Prisma 模型与 `docs/modules/ai-chat-orchestration.md` 等；Android 主客户端路径预计为 `clients/android`（待建或与现有目录对齐）。
- **规则来源**：三问生成逻辑见 `docs/tasks/002-ai-insight-question-generation.md`，与 `docs/product-scope.md` 方法论一致。
- **技术方向**：后端 Nest + PostgreSQL + 经服务端调用 LLM；密钥与 prompt 策略留在服务端（见 `docs/tech-stack.md`）。
- **GSD**：`gsd-sdk` 检测 `agents_installed: false` 时，研究/路线图子代理可能不可用；规划与执行可在本会话或后续 `/gsd-plan-phase` 中人工推进。

## Constraints

- **客户端**：试水期 **Android 原生优先**，`minSdk` 与具体工程初始化时落地。
- **合规与表述**：结论为「倾向/洞察」表述，避免替用户做决定与医疗承诺。
- **依赖**：LLM 调用经后端；开发期供应商与密钥以环境变量管理，不提交密钥。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Android 原生作为 MVP 主端 | 会议纪要：快速验证核心链路 | — Pending |
| 三问问卷式交互，非长对话 | 产品差异化与轻量化 | — Pending |
| 后端统一 LLM 与规则 | 安全与 prompt 可控 | — Pending |
| Brownfield 先 map codebase | GSD 流程要求 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-09 after gsd-new-project (expanded definition, option 2)*
