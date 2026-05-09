# Requirements: FavorMe — Android 三问洞察 MVP

**Defined:** 2026-05-09  
**Core Value:** 用户提问 → 三问带选项 → 选答 → 倾向结论（端到端可演示）

## v1 Requirements

### Client (Android)

- [ ] **CLI-01**: 用户可在 App 内输入一段自然语言问题并提交到后端
- [ ] **CLI-02**: 用户可看到后端返回的 **三道题** 及每题的 **可选答案**（含文案）
- [ ] **CLI-03**: 用户可对每道题选择一个选项并一次性提交作答
- [ ] **CLI-04**: 提交后用户可看到服务端返回的 **倾向性结论**（文案展示即可）
- [ ] **CLI-05**: 请求失败或超时时用户看到明确错误提示（非空白界面）

### API & Backend

- [x] **API-01**: 提供接收「用户原始问题」的接口（含鉴权占位或开发用固定 token，需文档说明）
- [ ] **API-02**: 提供接收「三问作答（每题所选选项 id）」的接口并返回结论（Phase 1 verification gap: submit must enforce complete three-question answers）
- [x] **API-03**: 对无效/非问题类输入返回 **4xx** 与可读错误信息，不强行生成三问

### AI & Orchestration

- [x] **AI-01**: 后端调用大模型，按 `docs/tasks/002-ai-insight-question-generation.md` 的框架生成 **恰好三道** 带选项的题目
- [x] **AI-02**: 三问在语义上分别对应：**剥离外界干扰**、**直面恐惧底线**、**区分主动与逃避**（可在响应中携带维度字段便于校验）
- [x] **AI-03**: 根据用户选项生成 **倾向性结论** 文本（禁止医疗诊断与替用户下命令式断言）

### Quality & Observability

- [ ] **QAS-01**: 单次端到端流程可在测试环境手动跑通（问题 → 三问 → 作答 → 结论）
- [x] **QAS-02**: 关键请求具备 request id 或等价关联 id，便于后端日志排查

## v2 Requirements

### Authentication

- **AUTH-01**: 手机号 / 微信 / Apple 等正式登录与账号体系
- **AUTH-02**: 用户画像中心（MBTI、生日等）与个性化进 prompt

### Product

- **PRO-01**: 可选「补充背景」步骤与无背景时的 generic 模式细化
- **PRO-02**: 会员分层结论（免费摘要 vs 完整解析）

## Out of Scope

| Feature | Reason |
|---------|--------|
| iOS 客户端首发 | 试水期资源与策略：Android 优先 |
| 小程序/WebView 作为唯一交付形态 | 当前产品路径为原生 Android MVP |
| 长对话、多轮 Chat 主流程 | 与问卷式三问 MVP 冲突 |
| 付费闭环 | MVP 验证链路为主，支付另阶段 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| API-01 | Phase 1 | Complete in 01-01 |
| API-02 | Phase 1 | Gap found in 01-VERIFICATION.md |
| API-03 | Phase 1 | Complete in 01-03 |
| AI-01 | Phase 1 | Complete in 01-02 |
| AI-02 | Phase 1 | Complete in 01-02 |
| AI-03 | Phase 1 | Complete in 01-02 |
| CLI-01 | Phase 2 | Pending |
| CLI-02 | Phase 2 | Pending |
| CLI-03 | Phase 2 | Pending |
| CLI-04 | Phase 2 | Pending |
| CLI-05 | Phase 2 | Pending |
| QAS-01 | Phase 3 | Pending |
| QAS-02 | Phase 1 | Complete in 01-03 |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-05-09*  
*Last updated: 2026-05-09 after gsd-new-project*
