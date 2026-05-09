<!-- refreshed: 2026-05-09 -->
# Architecture

**Analysis Date:** 2026-05-09

## System Overview

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                     Experience + Interaction Layer                         │
├──────────────────────────────┬─────────────────────────────────────────────┤
│   Web UI (Next App Router)   │   Product/Architecture Contract Docs       │
│   `demo/web/src/app`         │   `docs/`                                  │
└───────────────────┬──────────┴─────────────────────────────┬──────────────┘
                    │                                        │
                    ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        Runtime Service Layer                               │
│  Frontend BFF routes: `demo/web/src/app/api`                              │
│  Backend API service: `backend/src`                                        │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      Persistence / External Layer                          │
│ Prisma schema + migrations: `backend/prisma`                               │
│ DB dependency boundary: PostgreSQL via `DATABASE_URL`                      │
│ LLM provider boundary: `/api/ai` proxy in `demo/web/src/app/api/ai`       │
└────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web app shell + route guard | Global layout, app chrome, auth/onboarding redirects | `demo/web/src/app/layout.tsx`, `demo/web/src/components/AppShell.tsx` |
| User session/state boundary | Hydrate user from localStorage and expose update API | `demo/web/src/components/UserContext.tsx`, `demo/web/src/lib/user-store.ts` |
| AI interaction surface | Build prompt payloads and call app-local AI route | `demo/web/src/lib/ai-config.ts`, `demo/web/src/lib/ai-service.ts` |
| Frontend AI BFF route | Hide provider details and return unified text response/stream | `demo/web/src/app/api/ai/route.ts` |
| Backend HTTP entry + module graph | Nest bootstrap, global validation, module registration | `backend/src/main.ts`, `backend/src/app.module.ts` |
| Backend health + DB liveness | Health endpoint and DB connectivity probe | `backend/src/health/health.controller.ts`, `backend/src/health/health.service.ts` |
| Persistence contract | Domain models and DB migration source of truth | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260426120000_init/migration.sql` |

## Pattern Overview

**Overall:** Monorepo with a docs-defined target architecture and two executable runtime slices (`demo/web` and `backend`) evolving in parallel.

**Key Characteristics:**
- UI concerns are separated into route pages (`demo/web/src/app`) and reusable UI/state modules (`demo/web/src/components`, `demo/web/src/lib`).
- API boundaries are explicit: frontend server routes live in `demo/web/src/app/api`, backend domain API lives in `backend/src`.
- Data contracts are centralized in Prisma (`backend/prisma/schema.prisma`) while docs in `docs/modules` define intended module boundaries.

## Layers

**Presentation Layer (Web Demo):**
- Purpose: Render user-facing flows (login, onboarding, fortune, guide, favorites, profile).
- Location: `demo/web/src/app`
- Contains: App Router pages and API route handlers.
- Depends on: `demo/web/src/components`, `demo/web/src/lib`, Next runtime.
- Used by: Browser clients.

**Application/State Layer (Web):**
- Purpose: Local user state, prompt construction, AI request orchestration, local favorites/caches.
- Location: `demo/web/src/components`, `demo/web/src/lib`
- Contains: Context provider, state helpers, prompt builders, domain utility functions.
- Depends on: Browser APIs (`localStorage`, `navigator`), app-local API routes.
- Used by: Page components under `demo/web/src/app`.

**Service Layer (Backend Nest):**
- Purpose: Host versioned REST entry points and module-level business services.
- Location: `backend/src`
- Contains: Bootstrap (`main.ts`), module wiring (`app.module.ts`), controllers/services.
- Depends on: Nest DI container, Prisma service.
- Used by: HTTP clients (future mobile apps and any web client targeting backend).

**Data Layer (Backend Prisma):**
- Purpose: Persist users, conversations, messages, memories, invocation audits.
- Location: `backend/prisma`
- Contains: Prisma schema, SQL migrations, seed script.
- Depends on: PostgreSQL (`DATABASE_URL`).
- Used by: `backend/src/prisma/prisma.service.ts` and injected services (for now health probe).

**Contract/Planning Layer:**
- Purpose: Define target architecture and module scopes used by implementation tasks.
- Location: `docs/architecture.md`, `docs/tech-stack.md`, `docs/modules/ai-chat-orchestration.md`
- Contains: Layering decisions, API/table drafts, roadmap constraints.
- Depends on: Human process, ADR/task updates.
- Used by: Engineering changes across `demo/web`, `backend`, and future `clients/*`.

## Data Flow

### Primary Request Path (Current web AI guide/fortune)

1. UI event submits user text from page components (`demo/web/src/app/board/page.tsx`, `demo/web/src/app/fortune/page.tsx`).
2. Client helper calls local BFF route using `fetch("/api/ai")` (`demo/web/src/lib/ai-service.ts:35`).
3. Server route reads request and composes system prompt/provider settings (`demo/web/src/app/api/ai/route.ts:115`).
4. Route selects Ark Responses or OpenAI-compatible Chat API and executes upstream HTTP call (`demo/web/src/app/api/ai/route.ts:136`).
5. Route normalizes output and returns JSON or text stream back to browser (`demo/web/src/app/api/ai/route.ts:159`).
6. Page parses response JSON and updates UI/caches/favorites (`demo/web/src/app/fortune/page.tsx:223`, `demo/web/src/app/board/page.tsx:135`).

### Secondary Flow (Backend health + DB dependency)

1. Nest bootstrap registers global prefix `/v1` and validation pipe (`backend/src/main.ts:7`).
2. `GET /v1/health` is routed to health controller (`backend/src/health/health.controller.ts:8`).
3. Health service executes DB liveness query through Prisma (`backend/src/health/health.service.ts:13`).
4. Success returns `{status:"ok", database:"up"}`; DB failure maps to 503 via `ServiceUnavailableException` (`backend/src/health/health.service.ts:15`).

**State Management:**
- Web state is client-side and localStorage-backed via `UserContext` and helpers in `demo/web/src/lib/user-store.ts` and `demo/web/src/lib/handbook.ts`.
- Backend state is relational and schema-driven in `backend/prisma/schema.prisma`, with runtime access through `PrismaService` (`backend/src/prisma/prisma.service.ts`).

## Key Abstractions

**User Session Abstraction (Web local profile):**
- Purpose: Represent logged-in demo user, onboarding completion, and scoped storage keys.
- Examples: `demo/web/src/lib/user-store.ts`, `demo/web/src/components/UserContext.tsx`
- Pattern: Context + utility functions with browser storage persistence.

**AI Prompt + Provider Abstraction:**
- Purpose: Separate prompt templates and provider invocation mechanics from page UI.
- Examples: `demo/web/src/lib/ai-config.ts`, `demo/web/src/lib/ai-service.ts`, `demo/web/src/app/api/ai/route.ts`
- Pattern: Client-side request helper + server-side proxy handler.

**Backend Module + Service Abstraction:**
- Purpose: Keep controllers thin and push operational logic into injectable services.
- Examples: `backend/src/health/health.controller.ts`, `backend/src/health/health.service.ts`, `backend/src/prisma/prisma.module.ts`
- Pattern: Nest module DI with global Prisma provider.

## Entry Points

**Web application entry:**
- Location: `demo/web/src/app/layout.tsx`
- Triggers: Browser request into Next App Router.
- Responsibilities: Register providers, base styles, root shell container.

**Web root redirect gate:**
- Location: `demo/web/src/app/page.tsx`
- Triggers: Navigation to `/`.
- Responsibilities: Route user to `/login`, `/onboarding`, or `/fortune` based on local user state.

**Frontend AI BFF endpoint:**
- Location: `demo/web/src/app/api/ai/route.ts`
- Triggers: POST from `chatComplete` / `chatStream`.
- Responsibilities: Validate request body, call upstream model provider, apply fallback, stream if requested.

**Backend HTTP bootstrap:**
- Location: `backend/src/main.ts`
- Triggers: `npm run start` / `npm run start:dev`.
- Responsibilities: Build Nest app, set global prefix/pipes, start listener.

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop model in both Next server handlers and Nest process (`demo/web/src/app/api/*`, `backend/src/main.ts`).
- **Global state:** Browser localStorage acts as authoritative session/cache state in demo flows (`demo/web/src/lib/user-store.ts`, `demo/web/src/lib/handbook.ts`).
- **Circular imports:** Not detected from current import graph under `backend/src` and `demo/web/src`.
- **API versioning:** Backend routes are version-prefixed via `app.setGlobalPrefix("v1")` in `backend/src/main.ts`.
- **Config loading:** Backend env loading is centralized with `ConfigModule.forRoot` in `backend/src/app.module.ts`; frontend reads env via `demo/web/src/lib/ai-config.ts`.

## Anti-Patterns

### Dual Source of Runtime Architecture

**What happens:** `docs/modules/ai-chat-orchestration.md` defines richer orchestrator abstractions while runtime code currently implements only a thin route/service subset.
**Why it's wrong:** Future implementers may assume modules already exist and place code in inconsistent locations.
**Do this instead:** Add new backend orchestration code under `backend/src` module directories, and update docs together with code (`docs/modules/ai-chat-orchestration.md`, `backend/src/*`).

### Local Demo Identity as Business Identity

**What happens:** Core user flows rely on client-side localStorage profile/session without backend authority (`demo/web/src/lib/user-store.ts`).
**Why it's wrong:** This bypasses server-side auth and can diverge from future production user/account semantics.
**Do this instead:** Keep demo-local state for prototype routes only; place production auth/session logic in `backend/src` modules and consume via HTTP from clients.

## Error Handling

**Strategy:** Fail soft for user-facing demo AI flows, fail fast for backend health checks.

**Patterns:**
- Frontend AI route returns deterministic positive fallback text when upstream provider fails or key is missing (`demo/web/src/app/api/ai/route.ts:130`).
- Backend health path throws service-level exception to surface infrastructure readiness issues (`backend/src/health/health.service.ts:15`).

## Cross-Cutting Concerns

**Logging:** Minimal console logging in backend bootstrap (`backend/src/main.ts:18`); no centralized logger module yet.
**Validation:** Global `ValidationPipe` is enabled in backend (`backend/src/main.ts:8`); web API routes perform manual shape checks.
**Authentication:** Web demo uses local profile/session state (`demo/web/src/lib/user-store.ts`); backend auth module is not implemented yet (documented in `docs/modules/ai-chat-orchestration.md` and `docs/tasks/001-backend-initialization.md`).

---

*Architecture analysis: 2026-05-09*
