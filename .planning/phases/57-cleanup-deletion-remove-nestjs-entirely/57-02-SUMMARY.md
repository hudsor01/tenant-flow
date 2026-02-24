---
phase: 57-cleanup-deletion-remove-nestjs-entirely
plan: 02
status: complete
completed: 2026-02-22
---

# 57-02 Summary: Monorepo Config Cleanup

## What Was Done

Removed NestJS catalog entries from `pnpm-workspace.yaml`, deleted all root-level
infrastructure files (Dockerfile, railway.toml, docker-compose.yml, .dockerignore),
and cleaned all backend-specific scripts from root `package.json`.

## Task 1: pnpm-workspace.yaml + Infrastructure Files

### Catalog Entries Removed from pnpm-workspace.yaml

| Entry | Was |
|-------|-----|
| `@nestjs/common` | `^11.1.7` |
| `@nestjs/core` | `^11.1.7` |
| `@nestjs/platform-express` | `^11.1.7` |
| `@nestjs/swagger` | `^11.2.3` |
| `@nestjs/terminus` | `^11.0.0` |

**Note:** `@types/jest` was preserved — it is used by `apps/integration-tests/`.

**Side effect:** `apps/backend/package.json` used `"@nestjs/swagger": "catalog:"` which
referenced the now-deleted catalog entry. The version was inlined to `^11.2.3` in
`apps/backend/package.json` so that `pnpm install` succeeds before the backend directory
is deleted in plan 57-03/57-04.

### Root Infrastructure Files Deleted

| File | Purpose |
|------|---------|
| `Dockerfile` | NestJS backend Docker image build |
| `railway.toml` | Railway.app deployment configuration |
| `docker-compose.yml` | backend + redis local services |
| `.dockerignore` | Docker build ignore rules (NestJS-only) |

## Task 2: Root package.json Script Cleanup

### Scripts Deleted

| Script | Value |
|--------|-------|
| `dev:backend` | `pnpm --filter @repo/backend dev` |
| `build:backend` | `turbo run build --filter=@repo/backend` |
| `test:unit:backend` | `pnpm --filter @repo/backend test:unit` |
| `test:unit:watch` | `pnpm --filter @repo/backend test:unit -- --watch` |
| `test:unit:coverage` | `pnpm --filter @repo/backend test:unit --coverage` |
| `test:integration` | `pnpm --filter @repo/backend test:integration` |
| `test:integration:watch` | `pnpm --filter @repo/backend test:integration -- --watch` |
| `stripe:migrate` | `pnpm --filter @repo/backend stripe:migrate` |
| `docker:test` | `bash scripts/docker-test.sh` |
| `docker:up` | `docker compose up -d` |
| `docker:down` | `docker compose down -v` |

### Scripts Updated

| Script | Before | After |
|--------|--------|-------|
| `test` | `turbo run test:unit test:integration` | `turbo run test:unit` |
| `test:all` | `pnpm test:unit && pnpm test:integration && pnpm test:e2e` | `pnpm test:unit && pnpm test:e2e` |
| `test:ci` | `CI=true turbo run test:unit test:integration --concurrency=2` | `CI=true turbo run test:unit --concurrency=2` |
| `validate` | `...&& pnpm test:unit && pnpm test:integration && echo ...` | `...&& pnpm test:unit && echo ...` |
| `validate:clean` | `...&& pnpm --filter @repo/backend test:unit && echo ...` | `...&& pnpm --filter @repo/frontend test:unit && echo ...` |

## Commits

1. `chore(57-02): remove nestjs catalog entries and delete infrastructure files`
2. `chore(57-02): remove backend scripts from root package.json`

## Verification Results

All 5 plan verification checks passed:
- `grep "@nestjs" pnpm-workspace.yaml` — no output
- `grep "@repo/backend" package.json` — no output
- `ls Dockerfile railway.toml docker-compose.yml .dockerignore 2>/dev/null` — empty
- `node -e "require('./package.json')" && echo VALID` — VALID
- `grep "test:integration" package.json` — no output

## Requirements Satisfied

- CLEAN-04: No NestJS packages referenced in workspace catalog
- Root package.json has no backend-specific scripts
- Infrastructure files deleted — no Docker or Railway config remains
- All non-backend scripts (db:types, dev, build, lint, typecheck, test:e2e, test:unit, validate:quick, build:shared) untouched
