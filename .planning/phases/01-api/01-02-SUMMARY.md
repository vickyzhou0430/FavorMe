---
phase: 01-api
plan: "01-02"
subsystem: api
tags: [nestjs, llm, openai-compatible, zod, prompt-engineering]
requires:
  - phase: 01-api/01-01
    provides: "Guarded insight endpoints, DTOs, requestId-aware API errors, and AI env placeholders"
provides:
  - "Single OpenAI-compatible LLM service using AI_BASE_URL, AI_API_KEY, and AI_MODEL"
  - "LLM-backed generation for exactly three validated insight questions"
  - "LLM-backed tendency conclusion generation from raw question, question snapshot, and selected answers"
affects: [01-api, 02-android-client, e2e]
tech-stack:
  added: [zod]
  patterns:
    - "InsightService delegates all upstream model calls to LlmService.completeChat"
    - "LLM JSON outputs are parsed and validated before returning API responses"
    - "Prompt templates are versioned as backend constants under insight/prompts"
key-files:
  created:
    - backend/src/llm/llm.module.ts
    - backend/src/llm/llm.service.ts
    - backend/src/insight/prompts/questions.prompt.ts
    - backend/src/insight/prompts/conclusion.prompt.ts
  modified:
    - backend/package.json
    - backend/package-lock.json
    - backend/src/insight/insight.module.ts
    - backend/src/insight/insight.service.ts
key-decisions:
  - "Kept one OpenAI-compatible chat/completions HTTP path in LlmService instead of copying demo/web provider branching."
  - "Used zod runtime validation to reject malformed question JSON as LLM_OUTPUT_INVALID."
  - "Kept deeper invalid-input semantics deferred to Plan 01-03 while retaining the existing empty-question guard."
patterns-established:
  - "Upstream LLM failures map to controlled 5xx response codes via ApiExceptionFilter."
  - "Questions must validate exactly three dimensions in order: inner_preference, fear_boundary, active_vs_avoidance."
requirements-completed: [AI-01, AI-02, AI-03, API-02]
duration: 2min
completed: 2026-05-09T11:22:37Z
---

# Phase 01 Plan 01-02: LLM Insight Generation Summary

**OpenAI-compatible Nest LLM path with validated three-question JSON generation and non-medical tendency conclusion prompts.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-09T11:20:16Z
- **Completed:** 2026-05-09T11:22:37Z
- **Tasks:** 3/3
- **Files modified:** 8

## Accomplishments

- Added `LlmService.completeChat` as the only upstream HTTP implementation for OpenAI-compatible `/chat/completions` calls.
- Replaced fixed insight question stubs with prompt-driven generation, markdown-fence stripping, JSON parsing, and zod validation for exactly three ordered dimensions.
- Replaced fixed submit conclusion text with an LLM prompt that includes raw question, full question snapshot, and selected answer labels while forbidding medical diagnosis and command-style advice.

## Task Commits

Each task was committed atomically:

1. **T1 - LlmService: OpenAI-compatible POST** - `eebc95d` (`feat`)
2. **T2 - Questions prompt + JSON schema validation** - `fed4cb4` (`feat`)
3. **T3 - Conclusion prompt** - `e234f30` (`feat`)

## Files Created/Modified

- `backend/src/llm/llm.module.ts` - exports the LLM integration module for backend services.
- `backend/src/llm/llm.service.ts` - implements the single OpenAI-compatible chat completion call path and controlled LLM error mapping.
- `backend/src/insight/prompts/questions.prompt.ts` - defines the strict three-question JSON prompt.
- `backend/src/insight/prompts/conclusion.prompt.ts` - defines the conclusion prompt and selected-answer payload builder.
- `backend/src/insight/insight.module.ts` - imports `LlmModule`.
- `backend/src/insight/insight.service.ts` - delegates generation and submit paths to `LlmService`, validates question JSON, and returns trimmed conclusion text.
- `backend/package.json` and `backend/package-lock.json` - add `zod` for runtime LLM output validation.

## Decisions Made

- Kept LLM integration to one `fetch` implementation in `LlmService`, with provider switching limited to `AI_BASE_URL`/`AI_MODEL`.
- Used `BadGatewayException` codes for upstream failures and malformed model outputs so the existing API filter returns `{ code, message, requestId }`.
- Preserved only the existing empty `rawQuestion` guard in this plan; richer invalid-input classification remains scoped to Plan 01-03.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Live curl smoke was not executed because no valid local `AI_API_KEY` was available in the execution environment. Static build/lint and schema-path verification passed.
- `npm install zod` reported existing dependency audit findings; no dependency repair was attempted because it is outside this plan's scope.

## Known Stubs

None - the Plan 01-01 fixed insight stubs were replaced by LLM-backed generation paths.

## Threat Flags

None - the new upstream network path, API-key handling, malformed output handling, and raw-question length control are covered by the plan threat model.

## Verification

- `cd backend && npm run build` - passed
- `cd backend && npm run lint` - passed
- T1 acceptance - `llm.service.ts` exists, contains `chat/completions`, and `LlmModule` is registered.
- T2 acceptance - `zod` dependency exists, questions path calls `LlmService.completeChat`, and required dimensions are referenced.
- T3 acceptance - conclusion prompt includes explicit non-medical constraints and submit path returns trimmed LLM text.

## User Setup Required

- Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in `backend/.env` for live LLM calls.
- Continue using the Phase 01-01 API headers: `Authorization: Bearer <API_TOKEN>` and `X-Device-Id`.

## Next Phase Readiness

Plan 01-03 can focus on richer invalid-question handling, request logging/observability, and persistence without adding another model-call implementation.

## Self-Check: PASSED

- Expected LLM service, prompt, and modified insight files exist.
- Task commits `eebc95d`, `fed4cb4`, and `e234f30` exist in git history.
- Final build and lint passed before writing this summary.

---
*Phase: 01-api*
*Completed: 2026-05-09T11:22:37Z*
