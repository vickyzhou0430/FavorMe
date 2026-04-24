# FavorMe Android

## 已拍板（2026-04-24）

- **MVP/首版**：可在此目录建 **WebView 薄壳**，内嵌 [`../../demo/web`](../../demo/web) 构建产物或线上 H5。  
- **MVP 之后** 正式 C 端主工程为 **[`../flutter`](../flutter)（Flutter 双端）**；本目录**可**保留为壳、工具模块或**过渡**，不必与 Flutter 长期并存同一套实现。

## 与仓库其它部分

- 通过 `backend` 的 **HTTPS API** 与统一鉴权访问业务与内容，详见 [`../../docs/architecture.md`](../../docs/architecture.md) 与 [`../../docs/tech-stack.md`](../../docs/tech-stack.md)。
- 不将**厂商主密钥、完整可商用 prompt 配置** 长期**唯一**放客户端；演示 Key 仅开发期且须标注。

## 初始化薄壳时

- 在 [`../../docs/tech-stack.md`](../../docs/tech-stack.md) 已商定的**系统版本**策略下，写入具体 **minSdk** 与**包名**。  
- 备案、**网络安全配置**、**权限** 与 H5/原生边界见 [`../../docs/deployment.md`](../../docs/deployment.md) 后续补充。
