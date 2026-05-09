# Technology Stack

**Analysis Date:** 2026-05-09

## Languages

**Primary:**
- TypeScript - backend API in `backend/src` and web app in `demo/web/src`

**Secondary:**
- SQL - Prisma migration scripts in `backend/prisma/migrations/20260426120000_init/migration.sql`
- YAML - CI and container setup in `.github/workflows/ci.yml` and `docker-compose.yml`

## Runtime

**Environment:**
- Node.js >=20 (enforced in `backend/package.json`; CI uses Node 20 in `.github/workflows/ci.yml`)

**Package Manager:**
- npm (scripts and install flow in `backend/package.json` and `demo/web/package.json`)
- Lockfile: present for backend (`backend/package-lock.json`), missing for web demo (`demo/web/package-lock.json` not detected)

## Frameworks

**Core:**
- NestJS 10 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) - backend REST service in `backend/src/main.ts`
- Next.js 14 App Router (`next`) - demo web frontend and route handlers in `demo/web/src/app`
- Prisma 5 (`prisma`, `@prisma/client`) - DB schema and access layer in `backend/prisma/schema.prisma` and `backend/src/prisma/prisma.service.ts`

**Testing:**
- Not detected (no Jest/Vitest config or test files found in `backend` or `demo/web`)

**Build/Dev:**
- TypeScript compiler (`typescript`) - strict TS config in `backend/tsconfig.json` and `demo/web/tsconfig.json`
- Nest CLI (`@nestjs/cli`) - backend build/start scripts in `backend/package.json`
- ESLint - backend lint config in `backend/.eslintrc.cjs`; web lint via `demo/web/.eslintrc.json`
- Tailwind CSS + PostCSS + Autoprefixer - styling pipeline in `demo/web/tailwind.config.ts` and `demo/web/postcss.config.mjs`

## Key Dependencies

**Critical:**
- `next` / `react` / `react-dom` - UI rendering and routing in `demo/web/package.json`
- `@nestjs/*` - backend module system and HTTP server in `backend/src/app.module.ts` and `backend/src/main.ts`
- `@prisma/client` - database client used by `PrismaService` in `backend/src/prisma/prisma.service.ts`

**Infrastructure:**
- `prisma` - schema migration and generation commands in `backend/package.json`
- `@nestjs/config` - `.env` loading in `backend/src/app.module.ts`
- `class-validator` + `class-transformer` - request validation pipeline configured in `backend/src/main.ts`
- `framer-motion` + `lucide-react` - animation/icons for web UI components in `demo/web/src/components/ui`

## Configuration

**Environment:**
- Backend loads `.env.local` then `.env` via `ConfigModule.forRoot` in `backend/src/app.module.ts`
- Web/AI route reads env vars in `demo/web/src/lib/ai-config.ts`:
  - `NEXT_PUBLIC_AI_API_KEY`
  - `NEXT_PUBLIC_AI_ENDPOINT`
  - `AI_API_KEY`
  - `AI_BASE_URL`
  - `AI_MODEL`
- Backend runtime port reads `PORT` in `backend/src/main.ts`
- Prisma datasource requires `DATABASE_URL` in `backend/prisma/schema.prisma`

**Build:**
- Backend compile output controlled by `backend/tsconfig.build.json` and `backend/nest-cli.json`
- Web app build/start driven by Next scripts in `demo/web/package.json`
- CI build path is backend-only (`npm ci` -> `prisma validate` -> `eslint` -> `npm run build`) in `.github/workflows/ci.yml`

## Platform Requirements

**Development:**
- Node.js 20+
- PostgreSQL instance reachable by `DATABASE_URL` (`backend/prisma/schema.prisma`)
- Optional local Redis and PostgreSQL through `docker-compose.yml`

**Production:**
- Containerized backend target is implied by Docker/CI assets (`docker-compose.yml`, `.github/workflows/ci.yml`)
- Concrete hosting platform configuration is not detected in code (only planning notes in `docs/tech-stack.md`)

---

*Stack analysis: 2026-05-09*
