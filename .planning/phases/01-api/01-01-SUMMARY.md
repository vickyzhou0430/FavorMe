---
phase: 01-api
plan: "01-01"
subsystem: api
tags: [nestjs, prisma, validation, bearer-token, request-id]
requires: []
provides:
  - "Device-scoped user bootstrap endpoint"
  - "Bearer token and X-Device-Id guard for Phase 1 routes"
  - "Stub insight questions and submit endpoints"
  - "requestId-aware 4xx error response shape"
affects: [01-api, 02-android-client, e2e]
tech-stack:
  added: []
  patterns:
    - "Business controllers use ApiTokenGuard for Authorization and X-Device-Id"
    - "RequestIdMiddleware attaches request.requestId and X-Request-Id response header"
    - "ApiExceptionFilter normalizes error bodies to code/message/requestId"
key-files:
  created:
    - backend/src/common/filters/api-exception.filter.ts
    - backend/src/common/guards/api-token.guard.ts
    - backend/src/common/middleware/request-id.middleware.ts
    - backend/src/users/users.controller.ts
    - backend/src/users/users.service.ts
    - backend/src/insight/insight.controller.ts
    - backend/src/insight/insight.service.ts
    - docs/tasks/003-phase1-api-auth-headers.md
  modified:
    - backend/prisma/schema.prisma
    - backend/src/app.module.ts
    - backend/src/main.ts
    - backend/.env.example
    - backend/README.md
key-decisions:
  - "Use a single API_TOKEN environment variable for Phase 1 Bearer validation."
  - "Keep health/root routes public while applying ApiTokenGuard to user and insight controllers."
  - "Accept both rawQuestion and raw_question while normalizing internally, because plan and source docs used different field casing."
patterns-established:
  - "Guarded business routes require Authorization: Bearer <API_TOKEN> and non-empty X-Device-Id."
  - "All HTTP exceptions are serialized as { code, message, requestId }."
requirements-completed: [API-01, API-02]
duration: 5min
completed: 2026-05-09T11:17:54Z
---

# Phase 01 Plan 01-01: API Routes and Stub Insight Flow Summary

**NestJS Phase 1 API contract with device bootstrap, guarded stub insight routes, Prisma device identity, and requestId-aware error bodies.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-09T11:12:00Z
- **Completed:** 2026-05-09T11:17:54Z
- **Tasks:** 5/5
- **Files modified:** 31

## Accomplishments

- Added nullable unique `User.deviceId` with a committed Prisma migration so MVP users can be keyed by stable device id.
- Documented Phase 1 headers and env configuration: `Authorization: Bearer <API_TOKEN>`, required `X-Device-Id`, optional/generated `X-Request-Id`.
- Added reusable guard and middleware for Bearer auth, device id enforcement, and request id propagation.
- Implemented `POST /v1/users/bootstrap` with Prisma upsert by `deviceId`, returning `{ userId }`.
- Implemented guarded `POST /v1/insight/questions` and `POST /v1/insight/submit` stubs with DTO validation and consistent 4xx error bodies.

## Task Commits

1. **T1 - Prisma: User.deviceId + migration** - `932acba` (`feat`)
2. **T2 - Config: API_TOKEN + document** - `b7ec1b3` (`docs`)
3. **T3 - Guards: Bearer + DeviceId + RequestId** - `ba6417d` (`feat`)
4. **T4 - POST /v1/users/bootstrap** - `6bf3ca2` (`feat`)
5. **T5 - Insight routes with stub services** - `7b35a9e` (`feat`)

## Files Created/Modified

- `backend/prisma/schema.prisma` - adds nullable unique `User.deviceId`.
- `backend/prisma/migrations/20260509111500_add_user_device_id/migration.sql` - adds `deviceId` column and unique index.
- `backend/src/common/guards/api-token.guard.ts` - validates Bearer token and required device id.
- `backend/src/common/middleware/request-id.middleware.ts` - sets request id context and response header.
- `backend/src/common/filters/api-exception.filter.ts` - normalizes error responses to `{ code, message, requestId }`.
- `backend/src/users/*` - adds device bootstrap module/controller/service.
- `backend/src/insight/*` - adds DTOs, controller, service, and stub response shapes.
- `backend/src/app.module.ts` and `backend/src/main.ts` - wires modules, middleware, and filter.
- `backend/.env.example`, `backend/README.md`, `docs/tasks/003-phase1-api-auth-headers.md` - document env and curl contract.

## Decisions Made

- Used `API_TOKEN` as the single env var name to avoid `DEV_API_TOKEN`/`API_TOKEN` drift.
- Kept auth guard controller-scoped for Phase 1 business routes, leaving `GET /v1` and `GET /v1/health` public for local diagnostics.
- Supported both `rawQuestion` and `raw_question` on incoming DTOs because plan text and source task docs disagreed on casing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided database-dependent migration generation**
- **Found during:** Task 1 (Prisma device id)
- **Issue:** `prisma migrate dev` requires a live development database, but the plan allowed an equivalent SQL migration.
- **Fix:** Created an equivalent timestamped SQL migration manually and ran `npx prisma validate` plus `npx prisma generate`.
- **Files modified:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260509111500_add_user_device_id/migration.sql`
- **Verification:** `npx prisma validate`
- **Committed in:** `932acba`

**2. [Rule 3 - Blocking] Removed dependency on missing Express type package**
- **Found during:** Task 3 (guard/request id build)
- **Issue:** importing Express request/response types failed under strict TS because `@types/express` was not installed.
- **Fix:** Replaced Express type imports with local minimal request/response interfaces and direct header access.
- **Files modified:** `backend/src/common/request-context.ts`, `backend/src/common/middleware/request-id.middleware.ts`, `backend/src/common/guards/api-token.guard.ts`
- **Verification:** `npm run build`
- **Committed in:** `ba6417d`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were required for local build/verification and did not expand Phase 01-01 behavior.

## Issues Encountered

- Shell `rg` was unavailable, so string checks used Python and the IDE ripgrep tool instead.
- Manual curl sequence was documented in `backend/README.md`; it was not executed because the plan environment did not require starting a local database/server for final verification.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `backend/src/insight/insight.service.ts` | Fixed 3-question response | Required by Plan 01-01; live LLM generation is deferred to Plan 01-02. |
| `backend/src/insight/insight.service.ts` | Fixed conclusion text | Required by Plan 01-01; LLM conclusion generation is deferred to Plan 01-02. |

## Threat Flags

None - new auth, device header, and request id surfaces were explicitly covered by the plan threat model.

## Verification

- `cd backend && npm run build` - passed
- `cd backend && npm run lint` - passed
- `cd backend && npx prisma validate` - passed

## User Setup Required

- Set `API_TOKEN` in `backend/.env` before calling guarded Phase 1 endpoints.
- Ensure `DATABASE_URL` points to a PostgreSQL database and run migrations before using `POST /v1/users/bootstrap`.

## Next Phase Readiness

Plan 01-02 can replace the fixed insight stubs with the OpenAI-compatible LLM path using the already documented `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` environment variables.

## Self-Check: PASSED

- Expected summary, endpoint, filter, and migration files exist.
- Task commits `932acba`, `b7ec1b3`, `ba6417d`, `6bf3ca2`, and `7b35a9e` exist in git history.

---
*Phase: 01-api*
*Completed: 2026-05-09T11:17:54Z*
