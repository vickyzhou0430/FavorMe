# External Integrations

**Analysis Date:** 2026-05-09

## APIs & External Services

**LLM providers:**
- OpenAI-compatible Chat Completions API - AI text generation from `demo/web/src/app/api/ai/route.ts`
  - SDK/Client: native `fetch` (no official SDK)
  - Auth: `AI_API_KEY` (server) or fallback to `NEXT_PUBLIC_AI_API_KEY` from `demo/web/src/lib/ai-config.ts`
- Volcengine Ark-compatible Responses API - selected when base URL matches `volces.com/api/v3` in `demo/web/src/app/api/ai/route.ts`
  - SDK/Client: native `fetch` (no official SDK)
  - Auth: `AI_API_KEY`

**Fonts/CDN-like runtime service:**
- Google Fonts (via Next built-in integration) - font loading in `demo/web/src/app/layout.tsx`
  - SDK/Client: `next/font/google`
  - Auth: Not required

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` in `backend/prisma/schema.prisma`
  - Client: Prisma (`@prisma/client`) in `backend/src/prisma/prisma.service.ts`

**File Storage:**
- Local filesystem only detected (no object storage SDK/client in source)

**Caching:**
- Redis is provisioned for local environment in `docker-compose.yml`, but active runtime connection code is not detected in `backend/src`

## Authentication & Identity

**Auth Provider:**
- Custom auth is planned in docs (`docs/modules/ai-chat-orchestration.md`), but implementation is not detected in `backend/src`
  - Implementation: Not detected (no JWT/session middleware/controllers in current code)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog/Bugsnag client detected)

**Logs:**
- Basic process console logging (`console.log` in `backend/src/main.ts`, `console.error` in `backend/prisma/seed.ts`)

## CI/CD & Deployment

**Hosting:**
- Not detected in infrastructure code (no deployment manifests for cloud runtime)
- Local development services provided through `docker-compose.yml`

**CI Pipeline:**
- GitHub Actions in `.github/workflows/ci.yml` (backend Node setup, install, Prisma validate, lint, build)

## Environment Configuration

**Required env vars:**
- Backend: `DATABASE_URL`, `PORT` (`backend/prisma/schema.prisma`, `backend/src/main.ts`)
- Web AI route: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `NEXT_PUBLIC_AI_API_KEY`, `NEXT_PUBLIC_AI_ENDPOINT` (`demo/web/src/lib/ai-config.ts`)

**Secrets location:**
- Environment files are used (`backend/.env`, `.env.local`, `.env`), loaded by `@nestjs/config` in `backend/src/app.module.ts`

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints in `backend/src` or `demo/web/src/app/api`)

**Outgoing:**
- Server-side HTTP calls to LLM provider endpoints from `demo/web/src/app/api/ai/route.ts`

---

*Integration audit: 2026-05-09*
