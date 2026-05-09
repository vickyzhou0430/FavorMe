# Roadmap: FavorMe — Android 三问洞察 MVP

## Overview

在 brownfield 仓库上交付 **Android 原生客户端 + Nest 后端** 的最小闭环：用户提问、服务端按规则生成三问、客户端选答、展示倾向结论。Phase 1 优先打通 API 与 LLM 编排；Phase 2 落地 Android UI；Phase 3 做端到端验收与可观测性补强。

## Phases

- [x] **Phase 1: 后端三问与结论 API** — HTTP 契约、LLM 调用、输入校验、结构化三问与结论
- [ ] **Phase 2: Android 对话与选题 UI** — 最小聊天壳、展示三问、提交选项、展示结论
- [ ] **Phase 3: E2E 与质量** — 真机联调、错误场景、抽检与日志

## Phase Details

### Phase 1: 后端三问与结论 API
**Goal:** 后端可独立用 curl/脚本验证：提问 → 三问 JSON → 提交选项 → 结论文本。  
**Depends on:** Nothing（与现有 `backend` 工程衔接）  
**Mode:** mvp  
**Requirements:** API-01, API-02, API-03, AI-01, AI-02, AI-03, QAS-02  
**Success Criteria**（what must be TRUE）:
  1. 有效问题请求返回恰好 3 道题，每题含多个可选项，且含维度/标签可映射到三问框架
  2. 无效输入返回 4xx 与明确错误体，不返回编造的三问
  3. 提交完整作答后返回倾向结论文本，且表述符合非医疗、非命令式产品红线
**Plans:** 3（3/3 complete；`01-01`…`01-03` 见 `.planning/phases/01-api/*-PLAN.md`）

Plans:
**Wave 1**
- [x] 01-01: 定义/实现 DTO 与路由（提问、提交作答、错误码） — Summary: `.planning/phases/01-api/01-01-SUMMARY.md`

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02: 接入 AI 网关或 LlmClient，实现三问 + 结论 prompt 与 JSON 解析 — Summary: `.planning/phases/01-api/01-02-SUMMARY.md`

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03: 输入校验、日志与 request id — Summary: `.planning/phases/01-api/01-03-SUMMARY.md`

### Phase 2: Android 对话与选题 UI
**Goal:** Android App 完成与 Phase 1 API 的联调，用户可走完主流程。  
**Depends on:** Phase 1  
**Mode:** mvp  
**Requirements:** CLI-01, CLI-02, CLI-03, CLI-04, CLI-05  
**Success Criteria**:
  1. 用户可输入问题并看到加载态，成功后看到三问与选项
  2. 用户可选完三题并提交，看到结论文案
  3. 网络/服务端错误时有 Toast 或对话框提示
**Plans:** TBD

Plans:
- [ ] 02-01: 工程初始化与基础网络层（Base URL、开发证书/明文策略按需）
- [ ] 02-02: 对话列表式 UI + 三问卡片/选项组件
- [ ] 02-03: 与 Phase 1 联调与最小错误处理

### Phase 3: E2E 与质量
**Goal:** 可重复演示的 MVP，具备基本可观测性与抽检清单。  
**Depends on:** Phase 2  
**Mode:** mvp  
**Requirements:** QAS-01  
**Success Criteria**:
  1. 在目标 Android 版本上至少一条「黄金路径」手动测试通过并记录步骤
  2. 三问维度抽检表可用（产品/开发各至少 2 条样例）
**Plans:** TBD

Plans:
- [ ] 03-01: 黄金路径 UAT 清单与问题修复
- [ ] 03-02: 日志/监控占位（如必要）

---
*Roadmap created: 2026-05-09*
