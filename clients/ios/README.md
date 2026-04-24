# FavorMe iOS

## 已拍板（2026-04-24）

- **MVP/首版**：可在此目录建 **WebView 薄壳（WKWebView）**，内嵌 [`../../demo/web`](../../demo/web) 的 URL 或本地包。  
- **MVP 之后** 正式 C 端主工程为 **[`../flutter`](../flutter)（Flutter 双端）**；本目录**可**仅作壳/过渡期。

## 与仓库其它部分

- 与 `backend` 的 **HTTPS、ATS、鉴权** 策略一致，详见 [`../../docs/architecture.md`](../../docs/architecture.md) 与 [`../../docs/tech-stack.md`](../../docs/tech-stack.md)。
- 不将**厂商主密钥、完整可商用 prompt 配置** 长期**唯一**放客户端。

## 初始化薄壳时

- 在 [`../../docs/tech-stack.md`](../../docs/tech-stack.md) 策略下，确定 **iOS 最低系统版本**、**Bundle ID**、**签名与 Team**。  
- App Store 隐私与权限说明随薄壳**相机/相册/网络** 等**实际**能力迭代。
