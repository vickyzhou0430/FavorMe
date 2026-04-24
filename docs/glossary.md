# 术语表

| 术语 | 定义 |
|------|------|
| 心安指南 | 用户输入困扰后，由服务端经 AI 生成的多段式建议（与 demo 中 `/board` 等对应） |
| 今日运势 | 按日生成的轻量内容卡片；商用后由服务端生成与持久化策略 TBD |
| Web Demo / H5 资产 | `demo/web` 的 Next 应用，用于验证体验；MVP 可**内嵌于 WebView** |
| WebView 薄壳 | 原生 App 中仅提供容器与**系统能力**（如 Keychain/权限），**业务 UI** 以 H5 或后续 Flutter 页为主 |
| Flutter 正式端 | 见 `clients/flutter/`，MVP 之后**双端主**工程，见 [ADR-003](decisions/003-client-mvp-webview-flutter.md) |
| AI 网关 | 后端中统一对接大模型、做路由/限流/日志/降级的服务层，具体模块名实现时定 |
| MVP | 可对外小范围试用的最小可用版本，范围见 `product-scope.md` |

持续补充新词；与对外文案不一致时，以产品文档为准。
