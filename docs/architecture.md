# 系统架构（目标态）

> 状态：**与实现同步演进**。**MVP** 在 **WebView 薄壳**中内嵌 `demo/web` H5；**正式期** 主 C 端为 **`clients/flutter`（Flutter）**；`backend` 为商用主路径。详见 [`tech-stack.md`](tech-stack.md)。

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

## 2. AI Chat 与编排（控制平面 / 执行平面）

- **决策摘要**：[ADR-004：AI Chat 控制平面与初版可演进](decisions/004-agent-backend-control-plane.md)。  
- **接口与表名草案**：[`modules/ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)（含 REST 草图、表清单、`LlmClient` / `TurnOrchestrator` 等边界）。  

逻辑上：`API 与鉴权` → **编排（会话、profile、预处理、记忆）** → **执行（本期为薄 LLM 调用；以后可接 tool 循环）** → 持久化与审计。

## 3. 边界原则

| 层 | 职责 | 非职责（首版） |
|----|------|----------------|
| 客户端 | 展示、输入、本地弱缓存、调 API | 存储长期密钥、完整 Prompt 商业策略、权益判定最终源 |
| 业务服务 | 用户、资料、内容记录、收藏、订单（若上）、限流、审计 | 在客户端直连大模型 |
| AI 网关 | 统一模型调用、记录成本、脱敏/过滤、失败降级、路由多供应商 | 替代产品运营与法务策略 |
| 数据层 | 持久化、缓存、文件 | 业务规则混写在 SQL 中（应适度收敛到服务层） |

## 4. 与仓库目录的对应

| 目录 | 对应 |
|------|------|
| `demo/web` | 产品/交互验证；可继续作为 H5 或内嵌页 |
| `backend` | 业务 + AI 网关 + 管理接口（随选型落地） |
| `clients/android`、`clients/ios` | **MVP** 可：WebView 薄壳，内嵌 H5；仅经 **HTTPS** 调 `backend` |
| `clients/flutter` | **正式期** 双端主工程（MVP 后可建），经 API 访问 `backend` |

## 5. 数据流（示例：心安指南）

1. 客户端提交问题 + 用户身份 token
2. `backend` 校验身份与配额
3. `AI 网关` 选取模型、组装系统提示、调用 `LLM`
4. 返回结构化或半结构化结果，落库与返回
5. 记录调用日志（供成本与问题排查）

**AI 对话主链**的 API/表名草案见 [`modules/ai-chat-orchestration.md`](modules/ai-chat-orchestration.md)；其它业务模块仍见 `docs/modules/` 与后续 ADR。

## 6. 安全与合规（占位）

- 传输：HTTPS
- 鉴权：TBD（JWT、Session、设备绑定等，见 `docs/modules/auth.md` 待建）
- 秘密：`backend` 环境变量 + 云密钥管理
- 隐私：在隐私政策/上架材料中**随阶段** 补全；需求变更时回写 [`product-scope.md`](product-scope.md)
