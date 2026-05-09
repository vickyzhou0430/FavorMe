---
phase: 01-api
plan: "01-03"
subsystem: api
tags: [nestjs, prisma, validation, observability, request-id]
requires:
  - phase: 01-api/01-02
    provides: "LLM-backed insight question generation and conclusion prompts"
provides:
  - "InsightRound persistence for completed submit flows"
  - "Pre-LLM invalid-question gate with stable INVALID_QUESTION_INPUT 422 responses"
  - "requestId/userId/route/duration structured logs for insight requests"
  - "HttpExceptionFilter preserving { code, message, requestId } error bodies"
affects: [01-api, 02-android-client, e2e]
tech-stack:
  added: []
  patterns:
    - "Validate rawQuestion before any database or LLM work"
    - "Persist completed insight rounds only after successful conclusion generation"
    - "Log JSON-string fields without raw user question bodies"
key-files:
  created:
    - backend/prisma/migrations/20260509112500_add_insight_round/migration.sql
    - backend/src/insight/validators/question-input.validator.ts
    - backend/src/common/filters/http-exception.filter.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/insight/insight.service.ts
    - backend/src/insight/insight.controller.ts
    - backend/src/common/filters/api-exception.filter.ts
    - backend/src/main.ts
    - backend/README.md
key-decisions:
  - "Use a dedicated InsightRound table instead of Conversation/Message for completed MVP rounds."
  - "Reject invalid rawQuestion before database lookup or LLM calls so invalid input is a deterministic 422 path."
  - "Keep error bodies as { code, message, requestId } even though the plan mentioned statusCode, because the phase contract requires the stable body shape."
patterns-established:
  - "Insight service methods receive request context from RequestIdMiddleware/ApiTokenGuard."
  - "Insight request logs include requestId, route, userId, durationMs, and optional errorCode, but never rawQuestion."
requirements-completed: [API-03, QAS-02]
duration: 5min
completed: 2026-05-09T11:29:51Z
---

# Phase 01 Plan 01-03: Input Validation, Logging, and Persistence Summary

**Completed-round InsightRound persistence with pre-LLM invalid-input rejection and requestId-correlated logs/errors.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-09T11:24:47Z
- **Completed:** 2026-05-09T11:29:51Z
- **Tasks:** 4/4
- **Files modified:** 9

## Accomplishments

- Added `InsightRound` Prisma model and SQL migration with `userId` and `requestId` indexes.
- Added MVP raw-question validation before LLM calls, returning stable `INVALID_QUESTION_INPUT` 422 errors for empty, too-short, too-long, noisy, or non-decision inputs.
- Added request-scoped insight logs containing `requestId`, route, `userId`, duration, and error code without logging raw question bodies.
- Persisted one `InsightRound` only after successful submit conclusion generation, with no questions-only or in-flight round persistence.
- Registered `HttpExceptionFilter` globally while preserving `{ code, message, requestId }` error bodies.

## Task Commits

Each task was committed atomically:

1. **T1 - Prisma: InsightRound model** - `c77b0e4` (`feat`)
2. **T2 - Invalid question gate** - `d7265ea` (`feat`)
3. **T3 - Structured logging + persist on submit** - `ca2884b` (`feat`)
4. **T4 - Exception filter: requestId on all errors** - `a8b86de` (`feat`)
5. **Validation-order fix** - `0c12253` (`fix`)

**Plan metadata:** committed separately after state/roadmap updates.

## Files Created/Modified

- `backend/prisma/schema.prisma` - adds `InsightRound` and `User.insightRounds`.
- `backend/prisma/migrations/20260509112500_add_insight_round/migration.sql` - creates completed-round persistence table and indexes.
- `backend/src/insight/validators/question-input.validator.ts` - centralizes MVP raw-question validation and `INVALID_QUESTION_INPUT` responses.
- `backend/src/insight/insight.service.ts` - validates before LLM/DB work, logs request outcomes, resolves device users, and creates `InsightRound` after submit success.
- `backend/src/insight/insight.controller.ts` - passes request id and device id context into insight service methods.
- `backend/src/common/filters/http-exception.filter.ts` - ensures requestId is included in all HTTP error responses.
- `backend/src/common/filters/api-exception.filter.ts` - keeps the prior filter name as a compatibility export.
- `backend/src/main.ts` - registers `HttpExceptionFilter` globally.
- `backend/README.md` - documents rawQuestion limits and invalid-input behavior.

## Decisions Made

- Used a new `InsightRound` table because the MVP round snapshot is distinct from the existing chat-control-plane `Conversation`/`Message` models.
- Kept validation before both database lookup and LLM invocation so invalid/nonsense input never depends on database availability and never calls the LLM.
- Kept the existing `{ code, message, requestId }` response contract instead of adding `statusCode`, because the plan constraints explicitly required that body shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed validation order before database lookup**
- **Found during:** Final verification review after Task 4
- **Issue:** The first T3 implementation resolved/upserted the user before validating `rawQuestion`, so an invalid question could fail on database connectivity instead of returning deterministic `422 INVALID_QUESTION_INPUT`.
- **Fix:** Moved raw-question validation before user lookup in both questions and submit paths; validation failures still log `requestId` without raw body content.
- **Files modified:** `backend/src/insight/insight.service.ts`
- **Verification:** `npm run build`
- **Committed in:** `0c12253`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required to satisfy the invalid-input contract and did not expand scope.

## Issues Encountered

- `npx prisma migrate deploy` could not connect to `localhost:5432` (`P1001`). The migration file was created and `prisma validate`/`prisma generate` passed; applying migrations still requires a running PostgreSQL dev database.

## Known Stubs

None.

## Threat Flags

None - new logging, validation, and persistence surfaces were covered by the plan threat model.

## Verification

- `cd backend && npx prisma validate && npx prisma generate` - passed
- `cd backend && npx prisma migrate deploy` - failed with `P1001` because local PostgreSQL at `localhost:5432` was not reachable
- `cd backend && npm run build` - passed
- `cd backend && npm run lint` - passed
- Acceptance checks passed by source inspection: `InsightRound` exists in schema, migration exists, `insightRound.create` occurs only in submit success path, logs include `requestId`, and `main.ts` registers `HttpExceptionFilter`.

## User Setup Required

- Start or configure PostgreSQL for `backend/.env` and run `cd backend && npx prisma migrate deploy` to apply `InsightRound`.
- Continue setting `API_TOKEN`, `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` for live endpoint smoke tests.

## Next Phase Readiness

Phase 1 backend API is now ready for phase-level verification and Android client integration planning. Live invalid-input curl and golden-path submit smoke tests still need a running database plus valid LLM credentials.

## Self-Check: PASSED

- Expected schema, migration, validator, filter, and modified insight files exist.
- Task commits `c77b0e4`, `d7265ea`, `ca2884b`, `a8b86de`, and fix commit `0c12253` exist in git history.
- No stub patterns were found in modified backend source files.

---
*Phase: 01-api*
*Completed: 2026-05-09T11:29:51Z*
