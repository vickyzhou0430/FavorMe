# Codebase Concerns

**Analysis Date:** 2026-05-09

## Tech Debt

**MVP architecture-to-code gap (Severity: High):**
- Issue: Product and architecture docs define a full "question -> three-question generation -> answer -> result" chain, but backend code only exposes root and health endpoints.
- Files: `docs/product-scope.md`, `docs/architecture.md`, `docs/modules/ai-chat-orchestration.md`, `backend/src/app.controller.ts`, `backend/src/health/health.controller.ts`
- Impact: Delivery risk for the stated MVP target because core value path is not yet implemented in executable code.
- Fix approach: Implement minimal vertical slice modules under `backend/src/` for auth, conversations, question intake, three-question generation, answer submission, and result retrieval; keep API contract aligned with `docs/modules/ai-chat-orchestration.md`.

**Data model/document drift (Severity: High):**
- Issue: Docs describe domain tables like `questions`, `question_backgrounds`, `insight_question_sets`, `insight_answers`, and `insight_results`, but current Prisma schema omits them.
- Files: `docs/modules/ai-chat-orchestration.md`, `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260426120000_init/migration.sql`
- Impact: High rework probability when implementing business logic; API and persistence may diverge and break downstream clients.
- Fix approach: Decide canonical MVP schema in `backend/prisma/schema.prisma`, add migration(s), and update docs to match exact persisted entities.

**Redis dependency not integrated (Severity: Medium):**
- Issue: Redis is selected as MVP baseline for rate limiting/session hot state, but no backend Redis client or usage exists.
- Files: `docs/tech-stack.md`, `docs/decisions/002-backend-stack.md`, `docs/modules/ai-chat-orchestration.md`, `backend/src/app.module.ts`
- Impact: Missing anti-abuse, quota, and transient-state capability in first production cut.
- Fix approach: Add Redis module in `backend/src/`, centralize key patterns, and wire rate limiting + idempotency before public traffic.

## Known Bugs

**No confirmed runtime defects recorded in source (Current):**
- Symptoms: Not detected from current code and docs snapshot.
- Files: `backend/src/`, `docs/tasks/001-backend-initialization.md`
- Trigger: Not applicable.
- Workaround: Not applicable.

## Security Considerations

**Authentication and authorization are not implemented (Severity: Critical):**
- Risk: API surface currently has no auth guard strategy even though product flow requires user identity and protected resources.
- Files: `backend/src/main.ts`, `backend/src/app.module.ts`, `docs/backend-roadmap.md`, `docs/architecture.md`
- Current mitigation: None in code; documented as TODO/TBD.
- Recommendations: Add auth module (`/v1/auth/*`, `/v1/me`), JWT/session validation guards, and per-route authorization checks before exposing business endpoints.

**Safety/compliance controls exist only as policy text (Severity: High):**
- Risk: Content-safety requirements (self-harm/illegal/medical boundaries) are documented but no enforcement pipeline exists in backend code.
- Files: `docs/product-scope.md`, `docs/tech-stack.md`, `docs/modules/ai-chat-orchestration.md`, `backend/src/`
- Current mitigation: Documentation intent only.
- Recommendations: Implement preprocess safety pipeline, policy versioning, rejection taxonomy, and auditable enforcement results.

**Cross-border model usage allowed without finalized compliance controls (Severity: High):**
- Risk: Docs explicitly allow overseas model providers while legal/privacy controls are still marked TBD.
- Files: `docs/tech-stack.md`, `docs/deployment.md`, `docs/architecture.md`
- Current mitigation: None codified; "later review" noted.
- Recommendations: Gate provider rollout behind completed data-classification, retention, legal basis, and regional routing decisions.

## Performance Bottlenecks

**No rate limiting or idempotency in request path (Severity: High):**
- Problem: Planned protections for duplicate submits and abuse are absent in implementation.
- Files: `docs/modules/ai-chat-orchestration.md`, `backend/src/`, `backend/prisma/schema.prisma`
- Cause: Backend currently initialized as infrastructure shell only.
- Improvement path: Add idempotency key store, user/ip throttling, and retry-safe write semantics for message creation endpoints.

**Cold-path DB dependency on health/readiness only (Severity: Medium):**
- Problem: Service starts without eager DB connect; readiness quality depends on runtime probe usage.
- Files: `backend/src/prisma/prisma.service.ts`, `backend/src/health/health.service.ts`, `backend/README.md`
- Cause: Startup intentionally avoids `onModuleInit` connect.
- Improvement path: Keep lazy mode for local dev, but introduce production readiness gates and startup failure policy by environment.

## Fragile Areas

**Single thin module surface with rapid upcoming expansion (Severity: Medium):**
- Files: `backend/src/app.module.ts`, `backend/src/`
- Why fragile: Current structure is minimal and will absorb auth, orchestration, safety, and provider routing soon; without early module boundaries, coupling will increase quickly.
- Safe modification: Introduce feature modules now (`auth`, `conversations`, `insight`, `ai-gateway`, `observability`) and keep DTO/service boundaries strict.
- Test coverage: No automated tests detected for backend paths.

**Planning docs are authoritative but partially placeholder (Severity: Medium):**
- Files: `docs/deployment.md`, `docs/architecture.md`, `docs/backend-roadmap.md`
- Why fragile: Critical operational/security choices remain TBD while implementation is beginning, increasing chance of mid-stream architecture shifts.
- Safe modification: Treat unresolved ADR/doc sections as blockers for production-facing changes and close them in short decision cycles.
- Test coverage: Not applicable (documentation concern).

## Scaling Limits

**Single-service baseline with no worker/offload path yet (Severity: Medium):**
- Current capacity: One NestJS process model with direct API handling only (`backend/src/main.ts`).
- Limit: AI calls, moderation, and persistence on the same synchronous path will increase latency variance under load.
- Scaling path: Add queue-backed async jobs for heavy tasks and isolate gateway/provider calls from user-facing request SLA.

**Observability stack not implemented (Severity: High):**
- Current capacity: Console startup log and health endpoint only.
- Limit: Incident triage and SLO management degrade quickly once real users generate traffic.
- Scaling path: Implement structured logs, request correlation IDs, metrics, and error tracking per `docs/deployment.md` targets.

## Dependencies at Risk

**Model provider contract unresolved in code (Severity: Medium):**
- Risk: Seed data uses placeholder model identifier; no provider SDK/client integration exists.
- Impact: Integration uncertainty for latency, token accounting, retries, and fallback behavior.
- Migration plan: Implement `LlmClient` adapter layer in backend and validate against at least one real provider before client integration.
- Files: `backend/prisma/seed.ts`, `docs/tech-stack.md`, `docs/modules/ai-chat-orchestration.md`

## Missing Critical Features

**Core MVP product flow not implemented server-side (Severity: Critical):**
- Problem: Required endpoints for question intake, background enrichment, three-question generation, answer submission, and result retrieval are absent.
- Blocks: Android/iOS/WebView client integration, UAT of primary value proposition, and any meaningful release readiness.
- Files: `docs/product-scope.md`, `docs/modules/ai-chat-orchestration.md`, `backend/src/`

**Release controls incomplete for production operation (Severity: High):**
- Problem: Deployment, secret rotation ownership, backup/rollback, and monitoring tooling are still placeholder-level.
- Blocks: Reliable staging/prod promotion and operational compliance for launch.
- Files: `docs/deployment.md`, `docs/backend-roadmap.md`

## Test Coverage Gaps

**Backend has no automated tests detected (Severity: High):**
- What's not tested: Health service behavior, Prisma interactions, API contracts, validation, and failure handling.
- Files: `backend/src/`, `.github/workflows/ci.yml`
- Risk: Regressions and contract breaks will be detected late, especially during rapid feature build-out.
- Priority: High

**Safety and policy behavior has zero executable validation (Severity: High):**
- What's not tested: Invalid input rejection, sensitive content refusal, and policy-versioned response behavior described in docs.
- Files: `docs/tasks/002-ai-insight-question-generation.md`, `docs/modules/ai-chat-orchestration.md`, `backend/src/`
- Risk: High compliance and trust risk when AI features are introduced without guardrail tests.
- Priority: High

---

*Concerns audit: 2026-05-09*
