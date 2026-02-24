# Plan 53-04 Summary: pg_graphql Portfolio Overview

## Objective Achieved
Added pg_graphql shared types and created `dashboard-graphql-keys.ts` with a portfolio
overview query that fetches properties + per-property unit stats in a single request
(eliminates N+1 PostgREST calls). Exported `useOwnerPortfolioOverview` from `use-owner-dashboard.ts`.

## Changes Made

### `packages/shared/src/types/analytics.ts`
- Appended `GraphQLPropertyNode` — internal shape returned by pg_graphql for each property node
- Appended `PortfolioOverviewData` — aggregated portfolio overview (properties array + totals)
- Both types placed in shared per CLAUDE.md type placement rules

### `apps/frontend/src/hooks/api/query-keys/dashboard-graphql-keys.ts` (new file — 145 lines)
- `dashboardGraphQLQueries.portfolioOverview()` — TanStack Query options
- Calls `supabase.rpc('graphql.resolve', { query: PORTFOLIO_OVERVIEW_QUERY })`
- Parses pg_graphql response: `{ data: { propertiesCollection: { edges, totalCount } }, errors? }`
- Aggregates per-property: `totalUnits`, `occupiedUnits`, `occupancyRate`, `monthlyRevenue`
- On GraphQL errors: logs to Sentry, returns empty state (doesn't crash)
- RLS enforced server-side — no explicit user_id filter needed in query
- Cast: `supabase.rpc('graphql.resolve' as string, ...)` to satisfy TypeScript generated types

### `apps/frontend/src/hooks/api/use-owner-dashboard.ts`
- Appended `useOwnerPortfolioOverview()` hook
- Uses `dashboardGraphQLQueries.portfolioOverview()` from dashboard-graphql-keys.ts
- GRAPH-01 + GRAPH-02 satisfied

## Technical Decisions
- pg_graphql accessible via `graphql.resolve` RPC (extension already enabled in supabase/schemas/extensions.sql — no migration needed)
- Supabase RPC dot-notation workaround: cast to `string` to bypass generated types check
- Empty state returned on GraphQL errors (Sentry captures) to avoid crashing dashboard

## Tests
- All 966 existing tests pass
- `pnpm build:shared && pnpm --filter @repo/frontend typecheck` passes
