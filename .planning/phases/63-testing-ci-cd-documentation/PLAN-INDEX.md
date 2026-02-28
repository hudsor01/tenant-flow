# Phase 63: Testing, CI/CD + Documentation — Plan Index

## Plans

| Plan | Name | Wave | Depends On | Status |
|------|------|------|------------|--------|
| 63-01 | RLS Write-Path Isolation Tests | 1 | — | Pending |
| 63-02 | CI Pipeline RLS Gate + E2E Cleanup | 2 | 63-01 | Pending |
| 63-03 | CLAUDE.md Modernization | 1 | — | Pending |

## Wave Execution

- **Wave 1** (parallel): 63-01 + 63-03
- **Wave 2** (sequential): 63-02 (depends on 63-01 — RLS tests must exist before CI can gate on them)

## Success Criteria Mapping

| SC | Description | Covered By |
|----|-------------|------------|
| SC-1 | RLS write-path isolation tests cover INSERT/UPDATE/DELETE for 7 domains | 63-01 |
| SC-2 | RLS integration tests gate PR merges (existing project) | 63-02 |
| SC-3 | E2E smoke in pre-commit, stale NestJS intercepts removed | 63-02 |
| SC-4 | CLAUDE.md has no NestJS refs, documents PostgREST/Edge Function/RLS patterns | 63-03 |
