# FavorMe Android

## Phase 2 目录角色

Phase 2 Android MVP 的主实现位于 [`../flutter`](../flutter)。本目录是 Android 平台说明入口，**不承载** Phase 2 提问、三问作答、结论展示等功能代码。

若后续需要补充 Android 平台专属配置、商店材料或原生桥接说明，可在本目录记录；业务 UI 与 Phase 1 后端联调仍以 `clients/flutter` 为准。

## 与仓库其它部分

- 通过 `backend` 的 **HTTPS API** 与统一鉴权访问业务与内容，详见 [`../../docs/architecture.md`](../../docs/architecture.md) 与 [`../../docs/tech-stack.md`](../../docs/tech-stack.md)。
- 不将**厂商主密钥、完整可商用 prompt 配置** 长期**唯一**放客户端；演示 Key 仅开发期且须标注。
