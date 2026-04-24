# Backend

正式 **API 与 AI 网关** 将放在此目录（待初始化）。

## 当前状态

- 空目录占位；**已拍板** 技术栈见 [`../docs/tech-stack.md`](../docs/tech-stack.md) 与 ADR [`../docs/decisions/002-backend-stack.md`](../docs/decisions/002-backend-stack.md)。

## 初始化时建议任务

1. 在 [`../docs/QUESTIONS.md`](../docs/QUESTIONS.md) 确认框架与首版范围。
2. 新建 `Task-001`（或等价 issue）：脚手架、健康检查、`docker compose` 本地依赖。
3. 将首版技术选型记录为 ADR，例如 `docs/decisions/002-backend-stack.md`。

## 与 Demo 的关系

- `../demo/web` 可继续并行迭代产品体验。
- 商用后客户端与 Demo 应通过**本目录暴露的 API** 访问数据与模型，而不是依赖浏览器 `localStorage`。
