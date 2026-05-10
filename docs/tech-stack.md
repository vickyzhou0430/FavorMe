# 技术栈（已拍板）

> 更新日期：**2026-05-09（会议纪要同步）**  
> 变更须同步 [`product-scope.md`](product-scope.md) 与 [`decisions/`](decisions/)。

## 1. 单仓结构

- **Monorepo**：`demo/`、`backend/`、`clients/` 分目录，共享 `docs/` 与 [`AGENTS.md`](../AGENTS.md)。

## 2. 演示 Web（`demo/web`）

| 项 | 选择 |
|----|------|
| 位置 | `demo/web` |
| 框架 | Next.js 14（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + Framer Motion 等 |
| 说明 | 目前多为 **localStorage 演示**；MVP 客户端内嵌的 H5 将改为 **调用自建后端 API**，与商用模型对齐 |

## 3. 后端（`backend/`，**已建 NestJS+Prisma 空壳**）

| 项 | 定稿 |
|----|------|
| 语言 | **TypeScript** |
| 框架 | **NestJS** |
| 主数据库 | **PostgreSQL**（关系型、适合用户/收藏/订单预留/审计；**主业务不用 MongoDB**） |
| ORM | **Prisma** |
| 缓存 | **Redis**（**MVP 即上**：限流、配额、会话/临时态等） |
| 对外 API 风格 | **REST + JSON**（必要时加 SSE/流式端点给 AI 文本流） |
| 部署 | **Docker** 镜像 + 阿里云**容器化/托管**形态（如 SAE/ACK/弹性实例等，见 [`deployment.md`](deployment.md) 细化） |
| AI 调用 | **经服务端 AI 网关**；客户端/浏览器 **不** 直持厂商主 Key |

### 3.1 大模型与供应商

| 项 | 定稿 |
|----|------|
| 开发/联调优先 | **火山引擎**（你已有 API Key 的场景） |
| 境外模型 | **允许**接入境外模型 API，**不**以「数据不出境」为硬前提（上线前**合同/隐私/跨境**再单独立项评审） |
| 路由 | 网关内支持**多 provider**，便于比价、容灾、降级文本 |

## 4. 客户端

### 4.1 当前 Phase 2 Android MVP（已拍板）

| 项 | 定稿 |
|----|------|
| 形态 | **Flutter-first Android-only**（核心先实现提问、三问生成与作答链路） |
| 目的 | 用更接近设计稿的 Flutter UI 验证“心理洞察三问”是否有效，并保留后续 iOS 复用空间 |
| 实现位置 | 主实现落地 `clients/flutter`；`clients/android` 仅作为 Android 平台说明入口，不承载 Phase 2 功能代码 |

### 4.2 试水后扩展（按验证结果决策）

| 项 | 定稿 |
|----|------|
| iOS | Flutter 代码结构保持可复用，但 Phase 2 不做 iOS 验收或发布配置 |
| H5 / Web Demo | 作为实验页或运营页保留，不作为 Phase 2 主客户端 |
| 小程序 | 需先验证 chat 与交互能力是否满足，再决定是否进入排期 |
| Flutter | 当前已作为 Phase 2 Android MVP 主工程使用，后续是否扩展到 iOS 另行评审 |

### 4.3 系统版本（试水期）

- **政策**：优先覆盖 Android 近 2 个主要大版本（以商店审核与实机统计为准，工程初始化时写入 `minSdk` 并在此文档与客户端 README 更新具体数字）。

### 4.4 网络与安全

- 全链路 **HTTPS**；鉴权以 **Bearer Token**（如 JWT 存疑方案在 `docs/modules/auth.md` 定稿后补充）。

## 5. 与 AI 的边界

- **所有** 面向大模型的 `Prompt` 模板的**业务版本、密钥、路由、限流、日志** 放在 **`backend` + 配置/密钥管理**，不在 `demo` 与客户端长期硬编码为唯一真相（演示环境可临时，须标注）。

## 6. 内容安全（MVP 基线，已拍板）

- **不做**独立审核中台/人工审核工作流。  
- **必须做** 最小**规则/关键词**与**安全拒答/降级**模板，避免自伤/违法/医疗臆断等**底线风险**；后续若规模上升再迭模型审核/第三方 **API**。

## 7. 云与发布（首版方向）

- **云厂商**：**阿里云**（从创建账号、备案、域名、**TLS**、**RDS/Redis**、**OSS** 到**部署**，见 `deployment.md` 分步写清单）。

## 8. 不进入 MVP 的内容（技术侧）

- **管理后台**（与 [`product-scope.md`](product-scope.md) 一致：商用第一版及以后再规划）。
