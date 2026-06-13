# 系统架构（目标态）

> 状态：**与实现同步演进**。当前 Phase 2 试水阶段采用 `clients/flutter` 的 **Flutter-first Android MVP**，聚焦「AI 心理洞察三问」主链路；`backend` 为商用主路径。详见 [`tech-stack.md`](tech-stack.md)。

## 1. 逻辑视图

```mermaid
flowchart LR
  subgraph clients [客户端]
    A[Android]
    I[iOS]
    W[Web Demo 可选]
  end

  subgraph edge [边缘与入口]
    CDN[静态资源 CDN]
    API[API 网关 / HTTPS]
  end

  subgraph backend [后端]
    S[业务服务]
    G[AI 网关]
    C[配置与运营]
  end

  subgraph data [数据与外部]
    DB[(PostgreSQL)]
    R[(Redis)]
    OBJ[对象存储]
    LLM[大模型供应商]
  end

  A --> API
  I --> API
  W --> CDN
  W --> API
  API --> S
  S --> DB
  S --> R
  S --> OBJ
  S --> G
  G --> LLM
```

## 2. 核心编排：点醒 · 动态问卷状态机（当前主线）

- **决策摘要**：[ADR-005：动态问卷状态机 + 有状态会话端点](decisions/005-dynamic-questionnaire-state-machine.md)（升级自 [ADR-004](decisions/004-agent-backend-control-plane.md)）。
- **权威模块文档**：[`modules/insight-v2-dynamic-questionnaire.md`](modules/insight-v2-dynamic-questionnaire.md)（状态机、`/v1/insight-v2/*` 契约、8 策略、五级量表、历史、Prompt 运行时调参）。

逻辑上（有状态，逐轮编排）：`API 与鉴权` → 加载会话 transcript → **取运行时生效 Prompt**（默认内置，可被 debug 覆盖）→ 调 LLM（强制 JSON）→ **四重解析 + 收题/策略护栏** → 落库 → 返回 `status`（`need_info`/`questioning`/`finished`）。每次决策约 4–7 次 LLM 调用。

- **数据**：`InsightV2Session`（会话 transcript / 题目轨迹 / 策略序列 / 报告）+ `PromptOverride`（运行时提示词覆盖，`INSIGHT_V2_PROMPT_OVERRIDE_ENABLED` 默认关闭）。
- **历史阶段（固定三问，deprecated 保留兼容）**：`/v1/insight/*` 编排见 [`modules/ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)。

## 3. 边界原则

| 层 | 职责 | 非职责（首版） |
|----|------|----------------|
| 客户端 | 展示、输入（文字/语音转文字）、三问作答交互、本地弱缓存、调 API | 存储长期密钥、完整 Prompt 商业策略、权益判定最终源 |
| 业务服务 | 用户、画像、问题记录、三问结果、限流、审计 | 在客户端直连大模型 |
| AI 网关 | 统一模型调用、三问生成约束执行、记录成本、脱敏/过滤、失败降级 | 替代产品运营与法务策略 |
| 数据层 | 持久化、缓存、文件 | 业务规则混写在 SQL 中（应适度收敛到服务层） |

## 4. 与仓库目录的对应

| 目录 | 对应 |
|------|------|
| `demo/web` | 产品/交互验证；可继续作为 H5 原型与实验场 |
| `backend` | 业务 + AI 网关 + 管理接口（随选型落地） |
| `clients/android` | Android 平台说明入口；Phase 2 不在此目录承载 MVP 功能实现 |
| `clients/ios` | 试水期暂不强制；验证后再并行推进 |
| `clients/flutter` | **当前 Phase 2 Android MVP 实现**：Flutter-first 单屏三问流程、API 联调与后续 iOS 可复用结构 |

## 5. 数据流（示例：AI 三问洞察）

1. 客户端提交问题 + 用户身份 token
2. `backend` 校验身份、输入有效性与配额
3. 用户可选补充背景（可跳过）
4. `AI 网关` 根据场景生成 3 个关键问题（遵守三问约束）
5. 客户端完成三问作答并回传
6. `backend` 产出倾向性结论并落库
7. 记录调用日志（供成本、质量与问题排查）

**AI 对话主链**的 API/表名草案见 [`modules/ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)；其它业务模块仍见 `docs/modules/` 与后续 ADR。

## 6. 安全与合规（占位）

- 传输：HTTPS
- 鉴权：TBD（JWT、Session、设备绑定等，见 `docs/modules/auth.md` 待建）
- 秘密：`backend` 环境变量 + 云密钥管理
- 隐私：在隐私政策/上架材料中**随阶段** 补全；需求变更时回写 [`product-scope.md`](product-scope.md)
