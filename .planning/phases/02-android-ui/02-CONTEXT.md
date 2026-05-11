# Phase 2: Android 对话与选题 UI - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

## Phase Boundary

本阶段交付 Flutter 客户端的 Android MVP 主流程：用户在会话主页面输入文本问题，客户端调用 Phase 1 后端生成三问，逐题展示并收集选择，最后提交作答并展示倾向性结论。首版只做这一条主业务闭环；不做语音输入、完整历史聊天、多轮长对话、正式账号体系、付费、iOS 真机验收或发布配置。

## Implementation Decisions

### 客户端技术栈与工程位置

- **D-01:** Phase 2 客户端采用 **Flutter 优先**，原因是更容易接近 Figma/截图视觉效果，并为后续 iOS 复用 UI 留路。
- **D-02:** 主工程落在 `clients/flutter`。Phase 2 只要求 Android 可运行、可联调；`clients/android` 作为说明入口，不承载主实现。
- **D-03:** 本阶段是 **Android-only 交付**，但 Flutter 代码结构应保持后续 iOS 可复用；不做 iOS 真机验收、不处理 iOS 发布配置。
- **D-04:** 首版状态/API 层采用轻量内建方案，例如 `ChangeNotifier`/简单 ViewModel + `http` 或 `dio` 封装；不引入 Riverpod、Bloc/Cubit 等重框架，除非 planner 发现 Flutter 工程约束要求调整。
- **D-05:** 后续 planning/implementation 必须同步修正与本决定冲突的文档，包括 `docs/tech-stack.md`、`clients/android/README.md`、`clients/flutter/README.md`。这些文件目前仍保留 Android 原生或 WebView/Flutter 后置的旧表述。

### 主页面与流程形态

- **D-06:** 主页面采用 **单页状态机 + 对话感**：空首页 → 用户问题气泡 → 三问卡片 → 结论卡片；视觉像对话，但不做完整聊天历史列表。
- **D-07:** 三问采用 **逐题推进，一题一屏/一卡**。客户端在生成三问后持有三题快照，用户完成三题后再一次性提交给后端。
- **D-08:** 逐题推进允许上一题返回修改；顶部显示 `1/3`、`2/3`、`3/3` 之类进度。不增加提交前总览确认页；第三题完成后直接提交生成结论。
- **D-09:** 结论页底部提供“再问一次/回到首页”动作。一轮结束后清空当前轮 UI 状态，回到初始输入态；不暗示连续上下文会话。
- **D-10:** 客户端必须遵循 Phase 1 的无 session 约束：第二步提交时带上 `raw_question`、三问 `questions` 快照与所选答案；不依赖客户端可见的 `sessionId`。

### 视觉与动效

- **D-11:** 视觉目标为 **高保真接近参考图，但不要求像素级完全一致**。需保留米白/浅绿背景、圆角白色卡片、柔和阴影、底部胶囊输入框、绿色发送按钮、逐题卡片的引导感。
- **D-12:** 首版不做语音输入；底部输入框移除左侧麦克风/图标位，只保留文本输入与绿色发送按钮，避免误导用户以为语音可用。
- **D-13:** 动效采用轻动效：卡片淡入/轻微上浮、按钮按压反馈、加载时小型 breathing/typing 动效；不做复杂转场或重动效系统。
- **D-14:** Figma URL 与用户截图作为视觉参考，不把精确解析 Figma 节点作为 Phase 2 阻塞条件。实现可读取 Figma 细节，但 planner 不应要求“必须 MCP 解析后才能开工”。

### 加载、错误与重试

- **D-15:** 三问生成与结论生成都使用 **卡片内加载态 + 输入区/按钮禁用**。提交问题后保留用户问题气泡，中间显示“正在整理你的三问…”；提交答案后显示“正在生成倾向分析…”。期间禁用重复提交。
- **D-16:** 网络失败、超时、后端 4xx/5xx 使用 **卡片内错误 + 可重试**，在当前流程位置展示错误卡片，不突然跳走或只用 Toast。
- **D-17:** 无效问题 4xx 时回到输入态并保留用户原文；错误卡片提示用户换个更具体的说法，输入框保留原文方便修改。
- **D-18:** 重试按失败步骤进行：三问生成失败就重试生成三问；结论生成失败就用已选答案重试提交。用户不需要重走前面步骤。

### Claude's Discretion

- Flutter HTTP 客户端可在 `http` 与 `dio` 间由 planner/implementer 按工程初始化成本选择，但必须保持轻量、可测试、容易替换 Base URL 与请求头。
- 具体颜色 token、字号、阴影参数、间距可以由实现根据 Figma/截图和 Flutter 组件习惯微调，只要满足 D-11 的视觉方向。

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements

- `.planning/ROADMAP.md` — Phase 2 goal, dependency on Phase 1, success criteria, and planned slices.
- `.planning/REQUIREMENTS.md` — CLI-01 至 CLI-05 的客户端需求，以及 v1/v2 scope 边界。
- `.planning/PROJECT.md` — MVP core value, Android-first context, product boundaries, and out-of-scope items.

### Prior phase API contract

- `.planning/phases/01-api/01-CONTEXT.md` — Phase 1 locked decisions: no client-visible session, `Authorization: Bearer <token>`, required `X-Device-Id`, two-step stateless submit shape, and persistence timing.
- `backend/README.md` — Backend local run, auth headers, and API usage documentation.
- `docs/tasks/003-phase1-api-auth-headers.md` — Phase 1 auth/header agreement for client integration.
- `docs/tasks/002-ai-insight-question-generation.md` — Three-question framework, dimensions, invalid input expectations, and conclusion boundaries.

### Architecture & stack

- `docs/architecture.md` — Target system architecture and client/backend responsibility split.
- `docs/tech-stack.md` — Current stack decisions; must be updated because this discussion changes Phase 2 from Android native to Flutter-first.
- `clients/android/README.md` — Current Android directory role; must be updated to point to `clients/flutter` for Phase 2 implementation.
- `clients/flutter/README.md` — Current Flutter directory role; must be updated because it currently says MVP/first version does not depend on Flutter.
- `.planning/codebase/STACK.md` — Existing repo stack facts and CI context.
- `.planning/codebase/STRUCTURE.md` — Existing `clients/` layout and where mobile code should live.
- `.planning/codebase/CONVENTIONS.md` — Repo style and documentation update expectations.

### Visual references

- `https://www.figma.com/design/IqgjnWBIiSRa0A2oUysUqN/VIE?node-id=0-1&t=JNRvKnxExoC8xL0t-1` — Figma visual reference for overall style.
- `/Users/80319084/.cursor/projects/Users-80319084-Work-Codes-FavorMe/assets/image-a461737b-047d-4e43-b8d1-fb5afaafa4c6.png` — User-provided input box reference; use for bottom text input shape while removing voice icon.
- `/Users/80319084/.cursor/projects/Users-80319084-Work-Codes-FavorMe/assets/image-9be2d7cb-0f33-4ded-8d5f-e96ddafcf384.png` — User-provided flow reference for homepage, question cards, result card, and modal-like visual tone.

## Existing Code Insights

### Reusable Assets

- `backend/src/insight/` — Phase 1 API implementation to integrate with; planner should inspect concrete request/response DTOs before writing Flutter models.
- `backend/README.md` and `.env.example` — Source of Base URL, API token, and required header documentation for local Android emulator/device integration.
- `demo/web` UI assets may be useful as visual inspiration only; Phase 2 should not reintroduce a WebView/H5 implementation path.

### Established Patterns

- Backend routes use `/v1` prefix and REST + JSON.
- Phase 1 uses development Bearer token plus mandatory `X-Device-Id`; the client must generate or persist a stable device id for requests.
- Planning docs and README files are expected to be updated when implementation direction changes.

### Integration Points

- Flutter app calls Phase 1 endpoints for question generation and answer submission.
- Request headers must include `Authorization: Bearer <API_TOKEN>` and non-empty `X-Device-Id`.
- Android local development must account for emulator/device Base URL differences and cleartext/HTTPS configuration as needed.

## Specific Ideas

- The bottom input should follow the provided image style: large rounded capsule, soft shadow, placeholder like “输入你纠结的问题…”, green circular send button, no microphone.
- The screen should feel soft and guided, not like a utilitarian form: light background, cards, gentle spacing, and small progress indicator for the three questions.
- The result screen should support a clean end to the round via “再问一次/回到首页”, preserving the product decision that a round is not a long-running chat session.

## Deferred Ideas

- Voice input is explicitly deferred.
- Full chat history and multi-round conversational context are deferred.
- iOS verification/release is deferred, though code should remain reusable.
- Formal auth/login, paid membership, and long-form analysis tiers remain out of scope for this phase.

---

*Phase: 2-Android 对话与选题 UI*
*Context gathered: 2026-05-10*
