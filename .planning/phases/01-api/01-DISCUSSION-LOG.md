# Phase 1: 后端三问与结论 API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-09  
**Phase:** 1-后端三问与结论 API  
**Areas discussed:** 两阶段 API 与会话状态；鉴权与开发路径；LLM 接入与持久化（3–4 由原则推导并写入 CONTEXT）

---

## 两阶段 API 与会话状态

| Option | Description | Selected |
|--------|-------------|----------|
| A | 服务端 sessionId + 题目快照 | |
| B | 无状态：客户端持完整三问 JSON，提交时带回 | ✓（与产品组合） |
| C | 混合 | |
| — | 用户原则：交互无 session；一轮结束后入库回主页 | ✓ |
| — | 用户原则：最小化服务器成本 | ✓ |

**User's choice:** 交互上不呈现 session；一轮结束后整轮入库存储，UI 回新主页；并强调最小化服务器成本。  
**Notes:** 不在对外 API 中引入 sessionId；两步请求之间无状态；不引入会话类基础设施以控制成本。

---

## 鉴权与开发路径

| Question | Options | Selected |
|----------|---------|----------|
| 1 鉴权形态 | A Bearer env token / B X-Api-Key / C dev 无密钥 | **A** |
| 2 设备 ID | A 可选 / B 不要 / C 必填否则 400 | **C** |
| 3 User | A 不创建 / B 懒创建 / C 种子用户 / **用户表述：进应用初始化时创建** | **应用初始化时创建 User（具体 bootstrap 由实现定）** |
| 4 文档 | A README+env / B 独立 doc / A+B | **A+B** |

**User's choice:** 1A，2C，3 进应用初始化时创建 User，4 A+B。  
**Notes:** Bearer token；`X-Device-Id` 强制；文档三处（README、`.env.example`、单独文档小节）。

---

## LLM 接入与持久化（Phase 1）

**Source:** 与用户确认的低成本、无状态、两轮 HTTP 设计对齐；未逐项过选项表。

**Locked in CONTEXT.md as:** 单一 OpenAI 兼容路径与 env；无进行中持久化；结束时一次落库；`X-Request-Id` + 结构化日志满足 QAS-02；LlmInvocation 可选。

---

## Claude's Discretion

- User bootstrap 的精确路由命名与表映射。  
- 完成轮次落库选用现有表或新表的权衡。

## Deferred Ideas

- 服务端内部快照以减少第二次请求 body 大小。  
- Phase 1 完整多供应商适配层。
