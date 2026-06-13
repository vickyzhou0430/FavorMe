# 模块设计文档

每个业务模块一个 Markdown 文件，命名小写短横线，例如 `auth.md`、`ai-gateway.md`。

## 当前模块

- [`insight-v2-dynamic-questionnaire.md`](insight-v2-dynamic-questionnaire.md)：**点醒 · 动态问卷状态机（当前产品主线）**，`/v1/insight-v2/*` + Prompt 运行时调参，见 ADR-005。
- [`ai-chat-orchestration.md`](ai-chat-orchestration.md)：固定三问编排（`/v1/insight/*`，**已被 v2 取代、deprecated 保留兼容**），见 ADR-004。

## 何时创建

- 开始实现该模块前，先建文档或先写任务单中的设计小节
- 接口、表结构、错误码有变更时同步更新

## 模板

见 [`_template.md`](_template.md)。
