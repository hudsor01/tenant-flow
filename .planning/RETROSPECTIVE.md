# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 -- Production Hardening

**Shipped:** 2026-03-07
**Phases:** 10 | **Plans:** 60

### What Was Built
- auth.uid() guards on all 25+ SECURITY DEFINER RPCs, closing data exfiltration vectors
- Complete payment processing fix: cents/dollars convention, autopay idempotency, webhook safety
- Next.js middleware with role-based routing, branded auth emails via Resend
- 15 Edge Functions hardened: env validation, rate limiting, XSS escaping, CSP, generic errors
- Type safety overhaul: query key factories, typed mapper functions, 20+ oversized files split
- Database schema corrections: NOT NULL constraints, FK cascades, GDPR anonymization, cron monitoring
- Full accessibility: skip-to-content, aria-labels, error boundaries, not-found pages, mobile keyboard
- Performance: waterfall elimination, code-split charts, 13 stats queries consolidated to 2 RPCs
- Test suite: 1,319 unit tests, 16 RLS integration files, 4 Edge Function suites, 17 E2E journeys
- CI pipeline: next build, coverage enforcement, gitleaks, RLS on every PR

### What Worked
- Security-first phase ordering (RPC auth -> financials -> remaining) caught actively exploitable bugs first
- Wave-based parallel agent execution for independent plans (Phases 9, 10) cut wall-clock time significantly
- DOC-01 as recurring task in every phase kept CLAUDE.md accurate throughout
- Verification after each phase caught gaps early (Phase 5 needed 4 gap closure plans)
- Comprehensive 8-agent review upfront gave clear, prioritized requirements -- no ambiguity about what to fix

### What Was Inefficient
- Phase 4 missing VERIFICATION.md required retroactive creation in Phase 10
- Some phases had plans that were already completed by prior phases (e.g., Phase 9 P01 Task 1 done by P02)
- STATE.md progress tracking drifted from actual state (counts from older milestone phases mixed in)
- EmptyState and VirtualizedList created in Phases 7/8 but immediately superseded -- could have been avoided with better cross-phase awareness

### Patterns Established
- queryOptions() factory pattern for all query keys (10 factory files in src/hooks/api/query-keys/)
- Typed mapper functions at RPC/PostgREST boundaries (no `as unknown as`)
- Edge Function shared utilities (_shared/errors.ts, env.ts, escape-html.ts, rate-limit.ts)
- Archive-then-delete pattern for all data retention (3 cron jobs, 3 archive tables)
- CSS-only loading animations (ChartLoadingSkeleton, BlogLoadingSkeleton)
- useVirtualizer directly on table tbody rows (not wrapper component)
- Single auth query key factory in use-auth.ts
- Per-mutation Supabase client creation (no module-level client in hooks)

### Key Lessons
1. An upfront multi-agent review is highly effective for scoping production hardening -- 131 findings became 171 requirements with clear priority ordering
2. Security phases should always run first when exploitable bugs exist in production
3. Verification gates after each phase are essential -- they catch gaps that compound if left to the end
4. Wave-based parallel execution works well for independent plans but requires careful staging when agents share files
5. CLAUDE.md as living documentation (updated every phase) prevents convention drift across a long milestone

### Cost Observations
- Model: 100% opus (quality profile)
- Total execution: ~8 hours across 10 phases
- 60 plans executed, 187 commits
- Average plan duration: ~8 minutes
- Notable: Phases 8 and 5 were slowest (~115 and ~106 min) due to largest scope; Phase 10 fastest (~5 min) with parallel agents

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 10 | 60 | Wave-based parallel execution, verification gates, security-first ordering |

### Cumulative Quality

| Milestone | Unit Tests | RLS Tests | E2E Tests | Edge Function Tests |
|-----------|-----------|-----------|-----------|-------------------|
| v1.0 | 1,319 | 16 files | 17 | 4 suites |

### Top Lessons (Verified Across Milestones)

1. Multi-agent review + prioritized requirements = efficient production hardening
2. Living documentation (CLAUDE.md per phase) prevents knowledge drift
