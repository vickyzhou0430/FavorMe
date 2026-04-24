# 技术栈（已拍板）

> 定稿日期：**2026-04-24**  
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

## 3. 后端（`backend/`，待初始化）

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

### 4.1 MVP / 首版应用商店（已拍板）

| 项 | 定稿 |
|----|------|
| 形态 | **各端 `WebView` 薄壳 + 内嵌 H5**（加载 `demo/web` 的构建产物或线上同构 URL） |
| 目的 | **最短时间**打通：壳 → **HTTPS 后端** → 登录/鉴权 → 上架**流程** |
| 实现位置 | 可先在 `clients/android`、`clients/ios` 各一壳工程，或二选一先上一端；不强制与后续 Flutter 同目录复用代码 |

### 4.2 MVP 之后：正式双端（已拍板）

| 项 | 定稿 |
|----|------|
| 跨端方案 | **Flutter** 单工程（目录占位：`clients/flutter/`，**待创建**） |
| 不选 Kotlin Multiplatform 为后续主线 | 见 [`decisions/003-client-mvp-webview-flutter.md`](decisions/003-client-mvp-webview-flutter.md) |

### 4.3 系统版本

- **政策**：各系统支持 **近 2 个主要大版本**（以商店审核与实机统计为准，工程初始化时写入 `minSdk` 与 iOS 最低版本并在此文档与客户端 README 更新**具体数字**）。

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
