# 任务 003：Phase 1 API 鉴权与请求头约定

## 目标

为 Phase 1 后端业务接口固定一套最小、可 curl 验证的请求头契约：开发期 Bearer token、设备级用户标识、请求关联 id。

## 必填请求头

| Header | 必填 | 行为 |
|--------|------|------|
| `Authorization: Bearer <API_TOKEN>` | 是 | 服务端将 Bearer token 与环境变量 `API_TOKEN` 比对；缺失、格式错误或值不匹配返回 401。 |
| `X-Device-Id` | 是 | 稳定设备标识；缺失或空字符串返回 400。用户 bootstrap 以该值 upsert 用户。 |
| `X-Request-Id` | 否 | 客户端可传入用于排查；未传时服务端生成 UUID，并在响应头回写同一个值。 |

## 错误体

所有 Phase 1 业务 4xx 错误应返回统一 JSON：

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "requestId": "uuid-or-client-provided-id"
}
```

## 开发环境变量

`backend/.env` 必须配置：

```env
API_TOKEN=replace-with-local-dev-token
```

Plan 01-02 接入 LLM 时继续使用同一 `.env` 中的 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。

## 最小调用顺序

1. `POST /v1/users/bootstrap`，带 `Authorization` 与 `X-Device-Id`，返回 `{ "userId": "<cuid>" }`。
2. `POST /v1/insight/questions`，带同样请求头与 JSON body，返回恰好 3 个 `questions`。
3. `POST /v1/insight/submit`，提交原问题、问题快照与答案，返回 stub `conclusion`。
