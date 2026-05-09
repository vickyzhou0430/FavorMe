---
phase: 01-api
verified: 2026-05-09T11:34:00Z
status: gaps_found
score: 8/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Submit validates and uses the complete three-question answer set before generating a conclusion"
    status: failed
    reason: "submit only checks that each answer references a provided question option; it does not require exactly the three expected dimensions, one answer per question, or unique answered question IDs."
    artifacts:
      - path: "backend/src/insight/insight.service.ts"
        issue: "assertAnswerShape accepts incomplete or duplicated answer sets and does not enforce the required three-question structure."
      - path: "backend/src/insight/dto/submit-insight.dto.ts"
        issue: "DTO requires only one question and one answer via ArrayMinSize(1), not the full three-question snapshot and complete answers."
      - path: "backend/README.md"
        issue: "curl submit example shows a one-question payload, reinforcing an incomplete flow."
    missing:
      - "Require exactly three questions in the expected dimension order."
      - "Require exactly one answer per question with unique questionId values."
      - "Reject incomplete, duplicated, or tampered snapshots with a stable 4xx error."
      - "Update README submit curl to use all three generated questions and all three answers."
---

# Phase 1: 后端三问与结论 API Verification Report

**Phase Goal:** 后端可独立用 curl/脚本验证：提问 → 三问 JSON → 提交选项 → 结论文本。  
**Verified:** 2026-05-09T11:34:00Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## MVP Mode Note

Roadmap marks Phase 1 as `mvp`, but the goal is not in canonical user-story form (`As a ..., I want to ..., so that ...`). I still verified the concrete backend flow requested for this phase and recorded the user-flow coverage as a curl/script flow. A future MVP workflow should reformat the phase goal before using strict MVP user-story UAT generation.

## User Flow Coverage

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Bootstrap user | `POST /v1/users/bootstrap` with Bearer + `X-Device-Id` returns `{ userId }` | `UsersController.bootstrap` calls `UsersService.bootstrapByDevice`, which upserts by `deviceId` and returns `userId`. | VERIFIED |
| Ask valid question | `POST /v1/insight/questions` accepts a valid decision question and returns 3 question objects with options and dimensions | `InsightController.generateQuestions` delegates to `InsightService.generateQuestions`; service validates input, calls `LlmService.completeChat`, parses JSON, and zod-enforces exactly 3 questions with ordered dimensions and 2-4 options. | VERIFIED |
| Invalid question | Invalid or nonsense input returns 4xx and does not fabricate questions | `normalizeAndValidateRawQuestion` throws `UnprocessableEntityException` with `INVALID_QUESTION_INPUT` before user lookup or LLM call. | VERIFIED |
| Submit selected options | Complete three-question answers should generate conclusion text | `submitInsight` builds the conclusion prompt, calls `LlmService.completeChat`, trims non-empty text, persists `InsightRound`, and returns `{ conclusion }`. | PARTIAL |
| Enforce three-question completion | Backend rejects incomplete or tampered answer snapshots | `assertAnswerShape` only validates answer references against provided options; it does not require 3 questions, required dimension order, one answer per question, or unique answers. | FAILED |
| Persist completed round | Successful submit stores raw question, questions, answers, conclusion, userId, and requestId | `prisma.insightRound.create` occurs after successful LLM conclusion generation; schema and migration define `InsightRound` fields and indexes. | VERIFIED |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /v1/users/bootstrap` can create/ensure a device-scoped user and return JSON with `userId`. | VERIFIED | Guarded controller route calls Prisma `user.upsert` by `deviceId` and selects `id`. |
| 2 | Valid question requests return exactly 3 questions with options and dimensions mapped to the三问 framework. | VERIFIED | `questionsResponseSchema` enforces `.length(3)`, dimensions in order, and 2-4 options; prompt defines the same dimensions. |
| 3 | Questions endpoint uses a single OpenAI-compatible upstream path instead of fixed stubs. | VERIFIED | `InsightService.generateQuestions` calls `LlmService.completeChat`; `LlmService` posts to `${AI_BASE_URL}/chat/completions`. |
| 4 | Malformed LLM question JSON fails controlled instead of silently inventing shapes. | VERIFIED | `parseJsonObject` and zod validation throw `BadGatewayException` with `LLM_OUTPUT_INVALID`. |
| 5 | Invalid/nonsense `rawQuestion` returns `422 INVALID_QUESTION_INPUT` before LLM work. | VERIFIED | `normalizeAndValidateRawQuestion` checks empty, length, noise, and decision intent before `completeChat` is called. |
| 6 | Submit generates a conclusion through the LLM using raw question, question snapshot, and selected answers. | VERIFIED | `submitInsight` passes all three inputs into `buildConclusionUserPrompt` and returns trimmed LLM text. |
| 7 | Conclusion prompt enforces non-medical and non-command product boundaries. | VERIFIED | `CONCLUSION_SYSTEM_PROMPT` explicitly forbids medical diagnosis, treatment replacement, and command-style assertions. |
| 8 | Successful submit persists one completed round with user, raw question, questions, answers, conclusion, and requestId. | VERIFIED | `InsightRound` schema/migration exist; `submitInsight` writes `insightRound.create` only after non-empty conclusion text. |
| 9 | Submit validates complete three-question answers before generating conclusion. | FAILED | `assertAnswerShape` allows a single provided question and answer, duplicate answers, omitted dimensions, or tampered snapshots. |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/insight/insight.controller.ts` | `/insight/questions` and `/insight/submit` routes guarded by API token | VERIFIED | Controller exposes both POST routes and passes `requestId`/`deviceId` context. |
| `backend/src/insight/insight.service.ts` | LLM-backed questions, submit, validation, logging, and persistence | PARTIAL | Core flow exists, but submit completeness validation is incomplete. |
| `backend/src/llm/llm.service.ts` | Single OpenAI-compatible HTTP path | VERIFIED | Uses env-driven `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` and `/chat/completions`. |
| `backend/prisma/schema.prisma` | `User.deviceId` and `InsightRound` persistence model | VERIFIED | Both models/fields exist with indexes and relation wiring. |
| `backend/prisma/migrations/20260509111500_add_user_device_id/migration.sql` | Device id migration | VERIFIED | Adds `deviceId` and unique index. |
| `backend/prisma/migrations/20260509112500_add_insight_round/migration.sql` | Completed insight round migration | VERIFIED | Creates `InsightRound`, indexes `userId`/`requestId`, and FK to `User`. |
| `backend/src/common/filters/http-exception.filter.ts` | Stable error JSON with requestId | VERIFIED | Catches all exceptions and serializes `{ code, message, requestId }`. |
| `backend/src/common/middleware/request-id.middleware.ts` | Request id propagation | VERIFIED | Reads or generates request id and sets `X-Request-Id`. |
| `backend/src/common/guards/api-token.guard.ts` | Bearer token and `X-Device-Id` enforcement | VERIFIED | Rejects missing/wrong token and missing device id. |
| `backend/src/users/users.controller.ts` / `users.service.ts` | Bootstrap endpoint | VERIFIED | Upserts user by device id and returns `{ userId }`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppModule` | `InsightModule`, `UsersModule`, `RequestIdMiddleware` | imports + middleware registration | WIRED | `AppModule` imports both modules and applies request id middleware to all routes. |
| `main.ts` | `/v1` API prefix, validation, error filter | `setGlobalPrefix`, `useGlobalPipes`, `useGlobalFilters` | WIRED | Global prefix and filter are registered. |
| `InsightController` | `ApiTokenGuard` | `@UseGuards(ApiTokenGuard)` | WIRED | Both insight routes require auth and device id. |
| `InsightService` | `LlmService` | injected service and `completeChat` calls | WIRED | Both question generation and submit conclusion delegate to the same LLM service. |
| `InsightService.submitInsight` | Prisma `InsightRound` | `prisma.insightRound.create` | WIRED | Persistence happens after LLM success and before returning conclusion. |
| `SubmitInsightDto` / `assertAnswerShape` | Three-question completion contract | DTO + service validation | NOT_WIRED | No enforcement of exactly three required dimensions or one answer per question. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InsightService.generateQuestions` | `questions` | `LlmService.completeChat` response parsed by `parseQuestions` | Yes, with runtime schema validation | FLOWING |
| `LlmService.completeChat` | `text` | OpenAI-compatible `choices[0].message.content` | Yes when upstream/env are valid | FLOWING |
| `InsightService.submitInsight` | `conclusion` | LLM conclusion completion, trimmed and checked non-empty | Yes when upstream/env are valid | FLOWING |
| `InsightService.submitInsight` | `questions` / `answers` | Client-provided snapshot payload | Partial | HOLLOW_BOUNDARY: data is passed through but not validated for full three-question completion. |
| `UsersService.bootstrapByDevice` | `userId` | Prisma `user.upsert` by `deviceId` | Yes when DB migration is applied | FLOWING |
| `HttpExceptionFilter` | `requestId` | `RequestIdMiddleware` / request context | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Prisma schema and generated client | `cd backend && npx prisma validate && npx prisma generate` | Reported passed after all waves | PASS |
| Backend build | `cd backend && npm run build` | Reported passed after all waves | PASS |
| Backend lint | `cd backend && npm run lint` | Reported passed after all waves; IDE lint check also found no errors in inspected files | PASS |
| Live DB migration | `cd backend && npx prisma migrate deploy` | Reported blocked by local PostgreSQL not reachable at `localhost:5432` | SKIP_ENV |
| Golden-path curl | start server + bootstrap + questions + submit | Requires running PostgreSQL, applied migrations, and valid LLM credentials | SKIP_ENV |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| API-01 | `01-01-PLAN.md` | 提供接收用户原始问题的接口，含鉴权占位或开发 token 文档 | SATISFIED | `POST /v1/insight/questions` exists, is guarded by Bearer + `X-Device-Id`, and README/env docs describe the headers. |
| API-02 | `01-01-PLAN.md`, `01-02-PLAN.md` | 提供接收三问作答并返回结论的接口 | PARTIAL / BLOCKED | Endpoint exists and returns LLM conclusion, but does not enforce full three-question answers; the current implementation accepts incomplete/tampered payloads. |
| API-03 | `01-03-PLAN.md` | 无效/非问题输入返回 4xx 与可读错误，不强行生成三问 | SATISFIED | `normalizeAndValidateRawQuestion` throws `422 INVALID_QUESTION_INPUT` before DB/LLM work. |
| AI-01 | `01-02-PLAN.md` | 后端调用大模型生成恰好三道带选项题目 | SATISFIED | `LlmService.completeChat` is called; zod validates exactly three questions with 2-4 options. |
| AI-02 | `01-02-PLAN.md` | 三问语义分别对应三类维度并携带维度字段 | SATISFIED | Prompt and zod schema enforce `inner_preference`, `fear_boundary`, `active_vs_avoidance` in order. |
| AI-03 | `01-02-PLAN.md` | 根据用户选项生成倾向性结论，禁止医疗诊断与命令式断言 | SATISFIED | Conclusion prompt includes selected labels and explicit non-medical / non-command constraints. |
| QAS-02 | `01-03-PLAN.md` | 关键请求具备 request id 或等价关联 id | SATISFIED | Middleware attaches request id to request/response; insight logs and error filter include requestId. |

All requirement IDs requested for Phase 1 are accounted for. No additional Phase 1 requirement IDs were found in `.planning/REQUIREMENTS.md` beyond API-01, API-02, API-03, AI-01, AI-02, AI-03, and QAS-02.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/insight/insight.service.ts` | `assertAnswerShape` | Incomplete validation boundary | BLOCKER | Allows incomplete/tampered三问作答 to reach LLM conclusion and persistence. |
| `backend/package.json` | scripts | No automated backend test script | WARNING | Build/lint pass, but validation, LLM parsing, auth, and persistence regressions are not covered by tests. |
| `backend/src/llm/llm.service.ts` | `fetch` call | No timeout/abort around upstream request | WARNING | Provider hang can hold Nest requests indefinitely. |
| `backend/src/common/middleware/request-id.middleware.ts` | request id handling | Client request id echoed/logged without format or length validation | WARNING | Malformed or oversized request ids can pollute logs/headers. |

### Human Verification Required

These checks need a live PostgreSQL database, applied migrations, running Nest server, and valid LLM credentials:

1. **Golden-path curl flow**  
   **Test:** `POST /v1/users/bootstrap`, then `POST /v1/insight/questions`, then submit all three answers to `POST /v1/insight/submit`.  
   **Expected:** Bootstrap returns `{ userId }`; questions returns exactly three dimensioned questions; submit returns non-empty `{ conclusion }`.  
   **Why human:** Requires local DB/server and live LLM env.

2. **Invalid-input curl flow**  
   **Test:** Call `POST /v1/insight/questions` with noise or non-decision input.  
   **Expected:** HTTP 422 with `code: "INVALID_QUESTION_INPUT"` and `requestId`, and no LLM call.  
   **Why human:** Runtime verification requires a running server; source order is verified.

3. **Migration apply**  
   **Test:** Run `cd backend && npx prisma migrate deploy` against a reachable dev PostgreSQL.  
   **Expected:** Both Phase 1 migrations apply cleanly and `/v1/health` reports database up.  
   **Why human:** Current environment had no reachable PostgreSQL at `localhost:5432`.

### Gaps Summary

The backend has a real implemented flow for auth, device bootstrap, question generation, invalid input handling, LLM conclusion generation, request correlation, and completed-round persistence. The blocking gap is the submit validation boundary: the server does not prove that the submitted payload represents the complete three generated questions and exactly one selected option for each. Because the phase goal is specifically a三问 flow, accepting a one-question or tampered snapshot means the backend can return and persist a conclusion that did not come from the intended three-question process.

Fixing this should be scoped to `SubmitInsightDto`, `InsightService.assertAnswerShape`, and README curl examples, with tests added for complete, missing, duplicate, and tampered answer cases.

---

_Verified: 2026-05-09T11:34:00Z_  
_Verifier: Claude (gsd-verifier)_
