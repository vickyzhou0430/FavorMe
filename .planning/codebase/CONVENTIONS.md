# Coding Conventions

**Analysis Date:** 2026-05-09

## Naming Patterns

**Files:**
- Frontend UI components use PascalCase filenames in `demo/web/src/components/ui/` (for example `demo/web/src/components/ui/Button.tsx`, `demo/web/src/components/ui/Card.tsx`).
- Next.js route files follow App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`) under lowercase directories in `demo/web/src/app/`.
- Backend NestJS files use kebab-case plus role suffixes (`*.module.ts`, `*.controller.ts`, `*.service.ts`) in `backend/src/`.

**Functions:**
- Functions and methods use camelCase in both packages (for example `chatComplete` in `demo/web/src/lib/ai-service.ts`, `getHealth` in `backend/src/health/health.controller.ts`).
- React components use PascalCase function names (for example `RootLayout` in `demo/web/src/app/layout.tsx`, `UserProvider` in `demo/web/src/components/UserContext.tsx`).

**Variables:**
- Local variables use camelCase (for example `lifeNumber` in `demo/web/src/app/api/calculate/route.ts`, `port` in `backend/src/main.ts`).
- Shared constants use UPPER_SNAKE_CASE when global/reused (for example `USER_STORAGE_KEY` in `demo/web/src/lib/user-store.ts`, `MOCK_SMS_CODE` in `demo/web/src/lib/user-store.ts`).

**Types:**
- Type aliases and object types use PascalCase (`UserProfile`, `FocusArea`, `Body`) in `demo/web/src/lib/user-store.ts` and `demo/web/src/app/api/ai/route.ts`.
- Narrow string unions are preferred for domain enums in frontend types (`Gender`, `FocusArea`) in `demo/web/src/lib/user-store.ts`.

## Code Style

**Formatting:**
- No dedicated Prettier config is detected (`.prettierrc*` not present at repo root or package level).
- Use package-local established style:
  - `demo/web` consistently uses double quotes and no semicolons (for example `demo/web/src/app/layout.tsx`, `demo/web/src/components/ui/Button.tsx`).
  - `backend` consistently uses single quotes and semicolons (for example `backend/src/main.ts`, `backend/src/health/health.service.ts`).

**Linting:**
- Frontend linting extends `next/core-web-vitals` in `demo/web/.eslintrc.json`.
- Backend linting uses `eslint:recommended` + `plugin:@typescript-eslint/recommended` in `backend/.eslintrc.cjs`.
- Backend explicitly allows `console` and disables explicit return type enforcement in `backend/.eslintrc.cjs`.
- Backend ignores generated/runtime folders (`dist`) and seed script (`prisma/seed.ts`) in `backend/.eslintrc.cjs`.

## Import Organization

**Order:**
1. External/framework imports first (for example `next/server`, `@nestjs/common`).
2. Internal alias imports next in frontend (`@/...`) as seen in `demo/web/src/app/layout.tsx`.
3. Relative imports for local backend modules as seen in `backend/src/app.module.ts`.

**Path Aliases:**
- Frontend alias `@/*` is configured in `demo/web/tsconfig.json` and used across `demo/web/src/` files.
- No alias usage is configured in backend `backend/tsconfig.json`; use relative imports there.

## Error Handling

**Patterns:**
- Prefer explicit fallback behavior for user-facing flows (for example fallback text path in `demo/web/src/lib/ai-service.ts` and `demo/web/src/app/api/ai/route.ts`).
- Use `try/catch` around infra calls and throw framework exceptions for API contracts (for example `ServiceUnavailableException` in `backend/src/health/health.service.ts`).
- Use safe JSON parsing with `.catch(() => ({}))` for request/response boundaries in `demo/web/src/app/api/ai/route.ts`.

## Logging

**Framework:** `console` in both packages.

**Patterns:**
- Backend startup logs are currently console-based (`backend/src/main.ts`).
- Seed/bootstrap scripts log fatal errors and exit non-zero (`backend/prisma/seed.ts`).
- Keep console logs minimal and boundary-focused until a structured logger is introduced.

## Comments

**When to Comment:**
- Comments are used for rationale and constraints, not for restating obvious code (for example Framer Motion typing rationale in `demo/web/src/components/ui/Button.tsx`).
- Architecture/ops caveats are documented inline when behavior is intentional (for example DB-connect decision in `backend/src/prisma/prisma.service.ts`).

**JSDoc/TSDoc:**
- Lightweight JSDoc blocks appear on exported utilities and data contracts in `demo/web/src/lib/user-store.ts`.
- Backend uses occasional block comments for operational context in `backend/src/prisma/prisma.service.ts`.

## Function Design

**Size:** Keep functions focused on one responsibility; split protocol-specific calls into helpers (for example `callArkResponses` and `callOpenAIChat` in `demo/web/src/app/api/ai/route.ts`).

**Parameters:** Prefer typed object parameters for multi-argument APIs (for example `chatComplete(params)` in `demo/web/src/lib/ai-service.ts`, `callOpenAIChat(params)` in `demo/web/src/app/api/ai/route.ts`).

**Return Values:** Return explicit, typed objects for API/service boundaries (for example health response shape in `backend/src/health/health.service.ts`).

## Module Design

**Exports:** Use named exports by default across frontend utility/component modules (for example `export function useUser` in `demo/web/src/components/UserContext.tsx` and `export const AI_CONFIG` in `demo/web/src/lib/ai-config.ts`).

**Barrel Files:** Not detected in current source trees (`demo/web/src/` and `backend/src/`); imports target concrete module files directly.

---

*Convention analysis: 2026-05-09*
