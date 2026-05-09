# Codebase Structure

**Analysis Date:** 2026-05-09

## Directory Layout

```text
FavorMe/
├── demo/                  # Product demo applications
│   └── web/               # Next.js App Router demo (UI + local API routes)
├── backend/               # NestJS + Prisma backend service
├── clients/               # Mobile client workspaces/placeholders
│   ├── android/           # Android MVP entry (currently README-guided)
│   ├── ios/               # iOS placeholder
│   └── flutter/           # Future cross-platform client workspace
├── docs/                  # Product, architecture, ADRs, module/task docs
├── .github/               # CI workflow + PR template
├── docker-compose.yml     # Local Postgres/Redis dependency stack
└── README.md              # Monorepo overview and quickstart
```

## Directory Purposes

**`demo/web`:**
- Purpose: Ship the current interactive product demo and route-level AI UX.
- Contains: App Router pages (`src/app`), reusable UI (`src/components`), domain helpers (`src/lib`), and route handlers (`src/app/api`).
- Key files: `demo/web/src/app/layout.tsx`, `demo/web/src/app/api/ai/route.ts`, `demo/web/src/lib/user-store.ts`.

**`backend`:**
- Purpose: Host production-path API and AI gateway foundation.
- Contains: Nest application modules (`src`), Prisma schema/migrations (`prisma`), backend config and scripts (`package.json`, `tsconfig*.json`).
- Key files: `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/prisma/schema.prisma`.

**`clients`:**
- Purpose: Reserve mobile client delivery tracks and platform-specific handoff docs.
- Contains: Platform-specific README-guided directories.
- Key files: `clients/android/README.md`, `clients/ios/README.md`, `clients/flutter/README.md`.

**`docs`:**
- Purpose: Keep product and technical decisions synchronized with implementation.
- Contains: Architecture and stack docs, ADRs, module contracts, task handoffs.
- Key files: `docs/architecture.md`, `docs/tech-stack.md`, `docs/modules/ai-chat-orchestration.md`, `docs/tasks/001-backend-initialization.md`.

## Key File Locations

**Entry Points:**
- `demo/web/src/app/layout.tsx`: Web app root layout/provider mounting.
- `demo/web/src/app/page.tsx`: Root navigation gate (`/` redirect logic).
- `backend/src/main.ts`: Backend process bootstrap and global middleware/pipes.

**Configuration:**
- `demo/web/package.json`: Web scripts and dependencies.
- `demo/web/tsconfig.json`: Web TS strictness + alias (`@/*` to `src/*`).
- `backend/package.json`: Backend scripts + runtime dependencies.
- `backend/tsconfig.json`: Backend TS compiler policy.
- `.github/workflows/ci.yml`: CI checks for backend install/validate/lint/build.

**Core Logic:**
- `demo/web/src/app/fortune/page.tsx`: Fortune generation, caching, and interaction flow.
- `demo/web/src/app/board/page.tsx`: Guide generation and quota-controlled reveal flow.
- `demo/web/src/lib/ai-service.ts`: Client call surface for AI completion/stream.
- `demo/web/src/app/api/ai/route.ts`: Provider selection + fallback + stream response handler.
- `backend/src/health/health.service.ts`: DB liveness check through Prisma.
- `backend/src/prisma/prisma.service.ts`: DB client lifecycle boundary.

**Testing:**
- Not detected: no repository-level test directories or `*.test.*` / `*.spec.*` files in current tree.

## Naming Conventions

**Files:**
- Route files follow Next App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`) under `demo/web/src/app`.
- Backend modules follow Nest conventions (`*.module.ts`, `*.controller.ts`, `*.service.ts`) under `backend/src`.
- Utility/domain files use kebab-case in web lib/components (`user-store.ts`, `ai-config.ts`, `root-inline-styles.ts`).

**Directories:**
- Feature/page directories map to URL segments under `demo/web/src/app` (`fortune`, `board`, `profile`, `onboarding`).
- Backend subdirectories map to module domains (`health`, `prisma`) under `backend/src`.

## Where to Add New Code

**New Feature:**
- Primary code (web UI feature): `demo/web/src/app/<feature>/page.tsx` plus shared logic in `demo/web/src/lib/<feature>.ts`.
- Primary code (backend API feature): `backend/src/<feature>/<feature>.module.ts`, `backend/src/<feature>/<feature>.controller.ts`, `backend/src/<feature>/<feature>.service.ts`.
- Tests: add alongside target module once test framework is introduced (recommended `demo/web/src/**/__tests__` for web and `backend/src/**/*.spec.ts` for backend).

**New Component/Module:**
- Reusable web component: `demo/web/src/components/<ComponentName>.tsx` or `demo/web/src/components/ui/<ComponentName>.tsx`.
- Cross-page state provider: `demo/web/src/components/<Domain>Context.tsx` with wrapper wiring in `demo/web/src/components/Providers.tsx`.
- Backend shared infrastructure module: `backend/src/<infra>/<infra>.module.ts` and export provider from module.

**Utilities:**
- Shared frontend helper: `demo/web/src/lib/<domain>.ts`.
- Persistence/schema updates: `backend/prisma/schema.prisma` and migration SQL in `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
- Project policy/contract update accompanying behavior changes: `docs/modules/*.md` and relevant ADR/task files in `docs/decisions` or `docs/tasks`.

## Special Directories

**`backend/prisma/migrations`:**
- Purpose: Versioned DB change history.
- Generated: Yes.
- Committed: Yes.

**`backend/dist`:**
- Purpose: Local build output for Nest compile.
- Generated: Yes.
- Committed: No (ignored by `.gitignore` via `dist/`).

**`.cursor`:**
- Purpose: Local agent/editor metadata.
- Generated: Yes.
- Committed: No (ignored by `.gitignore`).

**`.planning/codebase`:**
- Purpose: Machine-readable mapping docs consumed by planning/execution workflows.
- Generated: Yes (by mapper workflows).
- Committed: Project-dependent; currently writable and used for orchestration context.

---

*Structure analysis: 2026-05-09*
