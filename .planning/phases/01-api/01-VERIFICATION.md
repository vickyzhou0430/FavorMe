---
phase: 01-api
verified: 2026-05-10T02:19:59Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "Submit validates and uses the complete three-question answer set before generating a conclusion"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Golden-path curl flow"
    expected: "Bootstrap returns userId; questions returns exactly three dimensioned questions; submit returns non-empty conclusion text."
    why_human: "Requires reachable PostgreSQL, applied migrations, running Nest server, and valid LLM credentials."
  - test: "Migration apply against development PostgreSQL"
    expected: "Prisma migrations apply cleanly and /v1/health reports database up."
    why_human: "Source schema and migrations exist, but database reachability is environment-dependent."
---

# Phase 1: 后端三问与结论 API Verification Report

**Phase Goal:** 后端可独立用 curl/脚本验证：提问 -> 三问 JSON -> 提交选项 -> 结论文本。  
**Verified:** 2026-05-10T02:19:59Z  
**Status:** human_needed  
**Re-verification:** Yes — after 01-04 gap closure

## MVP Mode Note

Roadmap marks Phase 1 as `mvp`, but the goal is not in canonical user-story form (`As a ..., I want to ..., so that ...`). I verified the concrete backend curl/script flow requested by this phase and preserved human verification for the live DB/LLM runtime checks.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /v1/users/bootstrap` can create/ensure a device-scoped user and return JSON with `userId`. | VERIFIED | `UsersController.bootstrap` is guarded by `ApiTokenGuard` and calls `UsersService.bootstrapByDevice`, which upserts `User` by `deviceId` and returns `{ userId }`. |
| 2 | Valid question requests return exactly 3 questions with options and dimensions mapped to the三问 framework. | VERIFIED | `InsightService.generateQuestions` calls `LlmService.completeChat`; `questionsResponseSchema` enforces `.length(3)`, required dimension order, and 2-4 options. |
| 3 | Questions endpoint uses a single OpenAI-compatible upstream path instead of fixed stubs. | VERIFIED | `LlmService.completeChat` posts to `${AI_BASE_URL}/chat/completions`; no insight stub or placeholder patterns were found. |
| 4 | Malformed LLM question JSON fails controlled instead of silently inventing shapes. | VERIFIED | `parseJsonObject` and zod validation throw `BadGatewayException` with `LLM_OUTPUT_INVALID`. |
| 5 | Invalid/nonsense `rawQuestion` returns `422 INVALID_QUESTION_INPUT` before LLM work. | VERIFIED | `normalizeAndValidateRawQuestion` runs before `ensureUserId` and before `completeChat` in both insight service paths. |
| 6 | Submit generates a conclusion through the LLM using raw question, question snapshot, and selected answers. | VERIFIED | `submitInsight` validates input, then calls `buildConclusionUserPrompt` with `rawQuestion`, `questions`, and `answers`, and returns trimmed non-empty LLM text. |
| 7 | Conclusion prompt enforces non-medical and non-command product boundaries. | VERIFIED | `CONCLUSION_SYSTEM_PROMPT` explicitly forbids medical diagnosis, treatment replacement, and command-style assertions. |
| 8 | Successful submit persists one completed round with user, raw question, questions, answers, conclusion, and requestId. | VERIFIED | `InsightRound` schema fields exist; `submitInsight` writes `prisma.insightRound.create` only after validated payload and non-empty conclusion. |
| 9 | Submit validates complete three-question answers before generating conclusion. | VERIFIED | 01-04 closed the previous gap: `SubmitInsightDto` requires exactly three questions/answers, and `assertAnswerShape` rejects wrong counts, wrong dimension order, duplicate question IDs, duplicate option IDs, duplicate answers, missing questions, missing options, and incomplete answered question coverage before user upsert, LLM, or persistence. |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/insight/insight.controller.ts` | `/insight/questions` and `/insight/submit` guarded routes | VERIFIED | Both POST routes exist and pass `requestId`/`deviceId` context into `InsightService`. |
| `backend/src/insight/insight.service.ts` | LLM-backed questions, submit validation, logging, and persistence | VERIFIED | Submit validation now precedes `ensureUserId`, `completeChat`, and `insightRound.create`; question generation and submit use the injected `LlmService`. |
| `backend/src/insight/dto/submit-insight.dto.ts` | Exact three-question and three-answer DTO boundary | VERIFIED | `questions` and `answers` both use `@ArrayMinSize(3)` and `@ArrayMaxSize(3)`. |
| `backend/src/insight/insight-submit.validation.test.ts` | Regression tests for valid, incomplete, duplicate, and tampered submit payloads | VERIFIED | Node test suite asserts invalid payloads return 422 `INVALID_INSIGHT_ANSWER` with zero fake LLM, user upsert, or persistence calls. |
| `backend/src/llm/llm.service.ts` | Single OpenAI-compatible HTTP path | VERIFIED | Uses env-driven `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` and one `/chat/completions` fetch path. |
| `backend/prisma/schema.prisma` | `User.deviceId` and `InsightRound` persistence model | VERIFIED | `User.deviceId` is unique/nullable; `InsightRound` stores user, raw question, JSON snapshots, conclusion, and requestId. |
| `backend/src/common/filters/http-exception.filter.ts` | Stable error JSON with requestId | VERIFIED | Serializes exceptions as `{ code, message, requestId }`. |
| `backend/src/common/middleware/request-id.middleware.ts` | Request id propagation | VERIFIED | Reads or generates request id and writes `X-Request-Id`. |
| `backend/src/common/guards/api-token.guard.ts` | Bearer token and `X-Device-Id` enforcement | VERIFIED | Rejects missing/wrong token and missing device id; attaches `request.deviceId`. |
| `backend/src/users/users.controller.ts` / `backend/src/users/users.service.ts` | Device bootstrap endpoint | VERIFIED | Upserts user by device id and returns `{ userId }`. |
| `backend/README.md` | Curl flow documentation | VERIFIED | Submit curl now includes all three dimensioned questions and exactly one answer per `q1`, `q2`, and `q3`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppModule` | `InsightModule`, `UsersModule`, `RequestIdMiddleware` | imports + middleware registration | WIRED | App module imports insight/users modules and applies request id middleware to all routes. |
| `main.ts` | `/v1` prefix, validation, error filter | `setGlobalPrefix`, `ValidationPipe`, `useGlobalFilters` | WIRED | Global prefix, whitelist validation, transform, and exception filter are registered. |
| `InsightController` | `ApiTokenGuard` | `@UseGuards(ApiTokenGuard)` | WIRED | Insight routes require bearer auth and device id. |
| `InsightService` | `LlmService` | injected service and `completeChat` calls | WIRED | Both question generation and conclusion generation delegate to the single LLM service. |
| `SubmitInsightDto` | `InsightService.assertAnswerShape` | exact array sizing + semantic validation | WIRED | DTO catches wrong array size; service enforces dimension/order/uniqueness/membership/completeness. |
| `InsightService.submitInsight` | Prisma `InsightRound` | `prisma.insightRound.create` | WIRED | Persistence happens only after validation and successful non-empty LLM conclusion. |
| `insight-submit.validation.test.ts` | `InsightService.submitInsight` | fake LLM/Prisma counters | WIRED | Tests prove invalid shapes stop before user upsert, LLM, and persistence. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InsightService.generateQuestions` | `questions` | `LlmService.completeChat` response parsed by `parseQuestions` | Yes, when upstream/env are valid | FLOWING |
| `LlmService.completeChat` | `text` | OpenAI-compatible `choices[0].message.content` | Yes, when upstream/env are valid | FLOWING |
| `InsightService.submitInsight` | `questions` / `answers` | Client-provided snapshot, validated against canonical `QUESTION_DIMENSIONS` and option membership | Yes, validated before side effects | FLOWING |
| `InsightService.submitInsight` | `conclusion` | LLM conclusion completion, trimmed and checked non-empty | Yes, when upstream/env are valid | FLOWING |
| `InsightService.submitInsight` | `InsightRound` row | Prisma `insightRound.create` after valid conclusion | Yes, when DB migration is applied | FLOWING |
| `UsersService.bootstrapByDevice` | `userId` | Prisma `user.upsert` by `deviceId` | Yes, when DB migration is applied | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Submit validation boundary | `cd backend && npm run test:insight-submit` | 6 tests passed; invalid submit cases produced 422 and zero fake LLM/user/persistence calls | PASS |
| Backend lint | `cd backend && npm run lint` | ESLint exited 0 | PASS |
| Backend build | `cd backend && npm run build` | Nest build exited 0 | PASS |
| IDE diagnostics | `ReadLints` on edited insight files | No linter errors found | PASS |
| Live DB migration | `cd backend && npx prisma migrate deploy` against a reachable dev DB | Not run in this verification pass | SKIP_ENV |
| Golden-path curl | Start server, bootstrap, questions, submit | Not run in this verification pass | SKIP_ENV |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| API-01 | `01-01-PLAN.md` | 提供接收用户原始问题的接口，含鉴权占位或开发 token 文档 | SATISFIED | `POST /v1/insight/questions` exists, is guarded by Bearer + `X-Device-Id`, and README/env docs describe the headers. |
| API-02 | `01-01-PLAN.md`, `01-02-PLAN.md`, `01-04-PLAN.md` | 提供接收三问作答并返回结论的接口 | SATISFIED | Submit endpoint now requires a complete three-question snapshot and one valid answer per question before LLM conclusion and persistence. |
| API-03 | `01-03-PLAN.md` | 无效/非问题输入返回 4xx 与可读错误，不强行生成三问 | SATISFIED | `normalizeAndValidateRawQuestion` throws `422 INVALID_QUESTION_INPUT` before DB/LLM work. |
| AI-01 | `01-02-PLAN.md` | 后端调用大模型生成恰好三道带选项题目 | SATISFIED | Questions path calls `LlmService.completeChat`; zod validates exactly three questions with 2-4 options. |
| AI-02 | `01-02-PLAN.md` | 三问语义分别对应三类维度并携带维度字段 | SATISFIED | Prompt and zod schema enforce `inner_preference`, `fear_boundary`, `active_vs_avoidance` in order. |
| AI-03 | `01-02-PLAN.md` | 根据用户选项生成倾向性结论，禁止医疗诊断与命令式断言 | SATISFIED | Conclusion prompt includes selected labels and explicit non-medical / non-command constraints. |
| QAS-02 | `01-03-PLAN.md` | 关键请求具备 request id 或等价关联 id | SATISFIED | Middleware attaches request id to request/response; insight logs and error filter include requestId. |

Note: `.planning/REQUIREMENTS.md` still contains stale text saying API-02 has a Phase 1 verification gap. Source-level verification shows that gap is now closed by 01-04.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/insight/*` | n/a | TODO/FIXME/placeholder/null/empty-return scan | INFO | No matches found in insight source. |
| `backend/src/llm/llm.service.ts` | fetch call | No timeout/abort around upstream request | WARNING | Provider hangs can hold Nest requests; tracked from code review as non-blocking for Phase 1 source-level goal. |
| `backend/src/common/middleware/request-id.middleware.ts` | request id handling | Client request id echoed/logged without format or length validation | WARNING | Can pollute logs/headers; tracked from code review as non-blocking for Phase 1 source-level goal. |

### Human Verification Required

These checks need a live PostgreSQL database, applied migrations, a running Nest server, and valid LLM credentials:

1. **Golden-path curl flow**  
   **Test:** `POST /v1/users/bootstrap`, then `POST /v1/insight/questions`, then submit all three answers to `POST /v1/insight/submit`.  
   **Expected:** Bootstrap returns `{ userId }`; questions returns exactly three dimensioned questions; submit returns non-empty `{ conclusion }`.  
   **Why human:** Requires local/server environment plus live LLM credentials.

2. **Migration apply and health check**  
   **Test:** Run `cd backend && npx prisma migrate deploy` against a reachable dev PostgreSQL, start the server, then call `GET /v1/health`.  
   **Expected:** Migrations apply cleanly and health reports database up.  
   **Why human:** Database reachability and credentials are environment-dependent.

### Gaps Summary

The previous source-level blocker is closed. `POST /v1/insight/submit` now rejects incomplete, duplicated, reordered, and tampered three-question snapshots with stable `422 INVALID_INSIGHT_ANSWER` before user upsert, LLM generation, or `InsightRound` persistence. Automated source-level verification is green, but full phase completion still needs a live environment curl smoke because the roadmap goal is explicitly curl/script-verifiable.

---

_Verified: 2026-05-10T02:19:59Z_  
_Verifier: Claude (gsd-verifier)_
