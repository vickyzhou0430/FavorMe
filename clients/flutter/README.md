# FavorMe Flutter 客户端（正式期）

> **定稿**（见 [`../docs/tech-stack.md`](../docs/tech-stack.md)、[`../docs/decisions/003-client-mvp-webview-flutter.md`](../docs/decisions/003-client-mvp-webview-flutter.md)）  
> **MVP/首版** 不依赖本目录：先用 **`WebView` 薄壳 + `demo/web` H5** 跑通全链路与上架。  
> **MVP 之后** 在此目录初始化 **单工程** **Flutter** 应用，替代或迁移薄壳 H5 体验。

## 初始化时建议

- 在 [`../docs/QUESTIONS.md`](../docs/QUESTIONS.md) / [`product-scope.md`](../docs/product-scope.md) 已拍板的 **近 2 个系统大版本** 上，写入具体 `minSdk`、iOS 最低版本。  
- 与 `backend` 的 **Base URL、鉴权、证书固定** 策略一致。  
- 可逐步将 H5 中页面 **替换** 为原生 Flutter 页，**保留** `WebView` 作个别页面或回退（按阶段决定）。

## 与 `android` / `ios` 子目录

- 二者可用于 **MVP 薄壳工程**；**不与** 未来 Flutter 工程**必须**同构，以「先上市再演进」为优先。
