# Phase 2: Android 对话与选题 UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 2-Android 对话与选题 UI
**Areas discussed:** 客户端技术栈方向, 主页面交互形态, 视觉还原优先级, 错误与加载体验

---

## 客户端技术栈方向

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Phase 2 客户端技术栈方向 | Kotlin + Jetpack Compose; Flutter; WebView / H5 壳; 先不锁死，由研究阶段比较后定 | Flutter |
| Flutter 工程落点 | `clients/flutter` Android-only; `clients/android` Flutter module/app; `clients/flutter` plus `clients/android` README pointer | `clients/flutter` Android-only |
| iOS 复用程度 | Android-only 交付但结构可复用; 完全按 Android MVP 快速做; Android + iOS 双端标准 | Android-only 交付但结构可复用 |
| 状态/API 层复杂度 | 轻量内建方案; Riverpod + dio; Bloc/Cubit + dio | 轻量内建方案 |

**User's choice:** Flutter 优先，工程放在 `clients/flutter`，Phase 2 只交付 Android，代码结构保持 iOS 可复用，状态/API 层走轻量内建方案。
**Notes:** 这会改变现有 `docs/tech-stack.md`、`clients/android/README.md`、`clients/flutter/README.md` 的旧方向，需要后续同步文档。

---

## 主页面交互形态

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| 主页面整体交互形态 | 单页状态机 + 对话感; 完整聊天列表; 问卷卡片式 | 单页状态机 + 对话感 |
| 三问展示方式 | 三题同屏卡片; 逐题推进; 展开式完成三题 | 逐题推进 |
| 返回/修改规则 | 允许上一题返回修改; 不允许返回; 返回 + 总览确认页 | 允许上一题返回修改 |
| 结论后的动作 | 再问一次/回到首页; 同页继续输入下一问; 只展示结果 | 再问一次/回到首页 |

**User's choice:** 单页状态机 + 对话感；逐题推进，一题一屏/一卡；允许上一题返回修改；结论后回首页开启下一轮。
**Notes:** 该选择与 Phase 1 “不呈现 session / 一轮结束后回主页”的产品约束一致。

---

## 视觉还原优先级

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| Phase 2 视觉目标 | 高保真接近参考图; 功能可用 + 基础风格; 严格按 Figma 走 | 高保真接近参考图 |
| 输入框左侧图标处理 | 换成吉祥物/文本图标; 移除左侧图标; 保留麦克风但禁用 | 移除左侧图标 |
| 视觉动效和质感 | 轻动效; 静态为主; 更强动效 | 轻动效 |
| Figma 使用方式 | Figma 作为参考不阻塞; 必须读取 Figma 节点; 只看截图 | Figma 作为参考不阻塞 |

**User's choice:** 高保真接近参考图但不要求像素级完全一致；无语音入口；文本输入 + 绿色发送按钮；轻动效；Figma 作为参考资料而非阻塞条件。
**Notes:** 用户提供了 Figma URL 和两张截图，分别用于整体流程/视觉氛围与底部输入框样式。

---

## 错误与加载体验

| Question | Options Considered | Selected |
|----------|--------------------|----------|
| 加载态 | 卡片内加载态 + 输入区禁用; 全屏 Loading; 只在按钮上 loading | 卡片内加载态 + 输入区禁用 |
| 错误展示 | 卡片内错误 + 可重试; Toast; 弹窗 Alert | 卡片内错误 + 可重试 |
| 无效问题 4xx | 回到输入态并保留原文; 显示错误并清空; 错误 + 示例 | 回到输入态并保留原文 |
| 重试策略 | 按失败步骤重试; 全部回首页; 只允许重新输入 | 按失败步骤重试 |

**User's choice:** 使用卡片内加载和错误状态；无效问题保留原文便于修改；网络/服务端失败按当前失败步骤重试。
**Notes:** 该策略避免全屏跳转和只靠 Toast 的易丢失反馈，更贴近参考图的柔和流程。

---

## Claude's Discretion

- Flutter HTTP 客户端可由 planner 在 `http` 与 `dio` 间按轻量和维护成本选择。
- 颜色、字号、阴影、间距可按 Figma/截图与 Flutter 实现习惯微调。

## Deferred Ideas

- 语音输入。
- 完整聊天历史和多轮上下文会话。
- iOS 真机验收与发布配置。
- 正式账号体系、付费、会员分层和长篇分析能力。
