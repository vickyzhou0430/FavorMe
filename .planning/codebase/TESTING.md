# Testing Patterns

**Analysis Date:** 2026-05-09

## Test Framework

**Runner:**
- Not detected in package scripts or config files for `demo/web` and `backend`.
- Config: Not detected (`jest.config.*`, `vitest.config.*`, and test runner configs are absent).

**Assertion Library:**
- Not detected (no `expect`-based test dependencies configured in `demo/web/package.json` or `backend/package.json`).

**Run Commands:**
```bash
cd backend && npm run lint      # Static lint checks for backend TypeScript
cd backend && npm run build     # Backend compile check (Nest build)
cd demo/web && npm run lint     # Frontend lint checks via Next.js ESLint
```

## Test File Organization

**Location:**
- No test files are currently present in `backend/src/`, `demo/web/src/`, or adjacent package directories (`*.test.*` / `*.spec.*` not detected).

**Naming:**
- Not applicable yet; there is no committed test naming pattern.

**Structure:**
```
Not detected: no test directory or co-located test pattern exists yet.
```

## Test Structure

**Suite Organization:**
```typescript
// Not detected: no describe()/it() suites currently exist in repository source packages.
```

**Patterns:**
- Setup pattern: Not detected.
- Teardown pattern: Not detected.
- Assertion pattern: Not detected.

## Mocking

**Framework:** Not detected.

**Patterns:**
```typescript
// Not detected: no test mocks, spies, or stubs are present.
```

**What to Mock:**
- Not defined in codebase yet; establish once a runner is introduced.

**What NOT to Mock:**
- Not defined in codebase yet; establish once integration boundaries are formalized.

## Fixtures and Factories

**Test Data:**
```typescript
// Not detected: no fixtures/factories in current repository.
```

**Location:**
- Not applicable; no fixture directories exist.

## Coverage

**Requirements:** None enforced (no coverage tooling or thresholds configured).

**View Coverage:**
```bash
Not available: no coverage command configured in `demo/web/package.json` or `backend/package.json`.
```

## Test Types

**Unit Tests:**
- Not used yet in committed code.

**Integration Tests:**
- Not used yet in committed code.
- Current integration confidence relies on runtime checks such as `GET /v1/health` described in `backend/README.md` and task acceptance notes in `docs/tasks/001-backend-initialization.md`.

**E2E Tests:**
- Not used (no Playwright/Cypress/Nest e2e setup detected).

## Common Patterns

**Async Testing:**
```typescript
// Not detected: no async test cases in repository.
```

**Error Testing:**
```typescript
// Not detected: no explicit error-path test assertions in repository.
```

## Current Testing Posture and Practical Gaps

- CI quality gate focuses on backend static checks only (`.github/workflows/ci.yml` runs `npm ci`, `prisma validate`, ESLint, and `npm run build` under `backend/`).
- `demo/web` is not included in CI validation today (`.github/workflows/ci.yml` contains only a `backend` job).
- Backend build config excludes `**/*spec.ts` in `backend/tsconfig.build.json`, indicating intended test file naming but no implemented test suite yet.
- Regression risk is highest for AI API behavior in `demo/web/src/app/api/ai/route.ts`, local-storage data migration in `demo/web/src/lib/user-store.ts`, and health/db failure handling in `backend/src/health/health.service.ts` because these paths currently have no automated tests.

---

*Testing analysis: 2026-05-09*
