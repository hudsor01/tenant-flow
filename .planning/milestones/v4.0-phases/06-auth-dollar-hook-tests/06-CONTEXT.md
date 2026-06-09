# Phase 6: Auth & Dollar-Hook Unit Tests - Context

**Gathered:** 2026-06-07
**Status:** Ready for execution (workflow-orchestrated under ultracode)
**Source:** Direct source-read of all 6 hooks + the shared test infra. Test-only phase — no src/ behavior changes.

<domain>
## Phase Boundary
Vitest unit-test coverage for the 6 auth-critical + dollar-amount hooks named in TEST-03. No production code changes; pure test additions under `src/hooks/api/__tests__/`. Coverage rises (80% global threshold enforced via lefthook pre-commit — additions only raise it).
</domain>

<test_infra>
## Established conventions (mirror exactly)
- Wrapper: `createTestWrapper()` (or local `createWrapper()`) from `src/test/api-test-utils.tsx` — fresh `QueryClient` per test, `retry:false`, `gcTime:0`.
- Mock the Supabase client at the FACTORY boundary: `vi.mock("#lib/supabase/client", () => ({ createClient: () => ({ auth: {...}, rpc, from }) }))` with `vi.hoisted()` for any fn referenced inside `vi.mock` (CLAUDE.md rule). `createSupabaseMocks()` helper exists.
- `vi.mock("#lib/supabase/get-cached-user", () => ({ getCachedUser: mockGetCachedUser }))` for the cached-user path.
- `renderHook(() => useX(), { wrapper })` + `await waitFor(() => expect(result.current.isSuccess/isError).toBe(true))`.
- Vitest-4/chai-6: assert `result.current.error` shape / `.mutateAsync().rejects.toMatchObject({ message: expect.stringContaining(...) })` — NEVER `.rejects.toThrow('string')`.
- Existing sibling templates: `use-billing-mutations.test.ts` (mutation-hook pattern), `__tests__/use-expenses.test.ts` (expense query pattern), `__tests__/use-reports.test.tsx` (the EXISTING reports test — EXTEND it), `__tests__/use-financials.test.tsx`.
- File location: `src/hooks/api/__tests__/<hook>.test.tsx` (`.tsx` if it touches JSX/DOM, `.ts` otherwise).
</test_infra>

<decisions>
## Per-hook test surface (LOCKED — exhaustive)

### use-auth-mutations.ts (NEW test) — 6 mutation hooks
- `useSignOutMutation`: signOut() success → `clearAuthData` called (mock `useAuthCacheUtils`); error → logged, isError. Mock `#lib/frontend-logger`.
- `useSupabaseLoginMutation`: signInWithPassword success → invalidate authKeys.supabase.all + router.push("/") (mock `next/navigation` useRouter); error → handleMutationError.
- `useSupabaseSignupMutation`: signUp maps firstName→first_name/lastName→last_name/company||null; BRANCH on `data.user.confirmed_at` (null → push /auth/confirm-email; set → push "/"); error path.
- `useSupabasePasswordResetMutation`: resetPasswordForEmail called with `redirectTo` = `${window.location.origin}/auth/update-password`; success/error.
- `useSupabaseUpdateProfileMutation`: updateUser({data}) → invalidate authKeys.supabase.user().
- `useChangePasswordMutation` (SECURITY-CRITICAL — 3 branches): (a) getCachedUser returns no email → rejects "User not authenticated" (no updateUser call); (b) re-auth signInWithPassword errors → rejects "Current password is incorrect"; (c) updateUser errors → rejects; (d) happy path → updateUser(password) called once. Mock `getCachedUser`.

### use-mfa.ts (NEW test) — 3 mutations + 2 queries
- `useMfaEnrollMutation`: enroll({factorType:'totp', friendlyName default 'Authenticator App'}) → result maps id→factorId, totp.qr_code→qrCode, totp.secret→secret, totp.uri→uri; passing a custom friendlyName forwards it; error.
- `useMfaVerifyMutation` (2 error branches): challenge() error → rejects (verify NOT called); verify() error → rejects; happy → invalidate mfaKeys.all + success toast. Assert challenge-then-verify ORDER + challengeId threaded.
- `useMfaUnenrollMutation`: unenroll({factorId}) → invalidate + toast; error.
- `useMfaStatus`/`useMfaFactors`: render → call the underlying mfaQueries (mock `query-keys/mfa-keys` queryFns or the supabase mfa list/getAuthenticatorAssuranceLevel).

### use-sessions.ts (NEW test) — query + the complex revoke
- `useRevokeSessionMutation` paths (mock `decodeSessionIdFromAccessToken` from session-keys):
  - **current-session** (`input.isCurrent=true`): signOut() called, RPC NOT called, returns {success,message}.
  - **non-current** (isCurrent=false, decode≠input.id): getUser → rpc("revoke_user_session",{p_user_id:user.id,p_session_id:input.id}); signOut NOT called in main path.
  - **decode-failed-at-list fast-path**: isCurrent=false BUT fresh decode === input.id → routed to signOut.
  - **post-RPC re-decode**: non-current path, post-session decode === input.id → signOut() called after RPC (defense-in-depth).
  - **getUser error** → rejects; **not authenticated** (no user) → rejects "Not authenticated".
  - **optimistic remove + rollback**: onMutate filters the row out of sessionKeys.all cache; onError restores `context.previous`; onSettled invalidates.

### use-expense-mutations.ts (NEW test) — dollar hooks
- `useExpenses`: `select` unwraps `page.data`.
- `useCreateExpenseMutation` / `useDeleteExpenseMutation`: on success the queryClient invalidates EXACTLY `[expenseKeys.all, financialKeys.all, ownerDashboardKeys.all]` (spy `invalidateQueries`); error → createMutationCallbacks errorContext. Mock `financialMutations.createExpense/deleteExpense` to resolve.
- **DOLLAR CORRECTNESS:** assert the amount passed to the mutation factory is forwarded UNCHANGED (no `*100`/`/100` cents conversion in this layer — amounts are dollars `numeric(10,2)`; cents only at the Stripe boundary which is NOT here). If the dollar mapping is only reachable via `query-keys/expense-keys.ts`, add a focused assertion there too (the mapper preserves dollar magnitude).
- `useTaxDocuments`: default year = current year.

### use-report-mutations.ts (NEW test) — paywall + PDF download
- `handleReportMutationError` (via the download hooks' onError): a `PaywallError` (402) → `toast.error("Upgrade required", { action })`; invoking `action.onClick` → `window.location.assign(err.upgradeUrl)`. A non-paywall error → falls through to `handleMutationError`. (Mock `sonner` toast + assert.)
- `callGeneratePdfFromHtml` (exported async helper): (a) no `session.access_token` → rejects "Not authenticated"; (b) fetch `!ok` → rejects "PDF generation failed: <errText>"; (c) success → `URL.createObjectURL` blob, an `<a download=filename>` is clicked, then `revokeObjectURL` (use fake timers for the 100ms revoke). Mock `fetch` + `URL.createObjectURL/revokeObjectURL`.
- The 4 download hooks (`useDownloadYearEndCsv/useDownload1099Csv/useDownloadYearEndPdf/useDownloadTaxDocumentPdf`): delegate to `reportMutations.*` + success/error handlers fire.

### use-reports.ts (EXTEND existing `__tests__/use-reports.test.tsx`)
- Read the existing test; identify gaps. Add: error-path coverage for each query hook not already covered; and **DOLLAR-amount assertions** — the financial/revenue/1099/year-end report mappers return amounts as DOLLARS (assert magnitude preserved through the RPC→hook boundary, no cents math). Do NOT rewrite passing tests; only extend.
</decisions>

<constraints>
## Execution constraints
- Tests must PASS locally (`bun run test:unit -- --run <file>`) — each author iterates its own file to green.
- Mock at the `#lib/supabase/client` factory + named lib boundaries (`mutation-error-handler`, `frontend-logger`, `next/navigation`, `sonner`, `get-cached-user`) — never reach into Supabase internals.
- No `any`, no `as unknown as`, no barrel files. `vi.hoisted()` for mock vars in `vi.mock`.
- Parallel authors WRITE files only — they do NOT git-commit (orchestrator commits sequentially to avoid index races; verify via git diff per fanout-reliability memory).
</constraints>

<canonical_refs>
- `src/test/api-test-utils.tsx`, `src/hooks/api/use-billing-mutations.test.ts`, `src/hooks/api/__tests__/use-expenses.test.ts`, `src/hooks/api/__tests__/use-reports.test.tsx`, `src/hooks/api/__tests__/use-financials.test.tsx`.
- CLAUDE.md Testing section (Vitest 4 / chai 6 gotcha, `vi.hoisted()`, 80% coverage).
</canonical_refs>

<deferred>
None — TEST-03 is the whole phase.
</deferred>

---
*Phase: 06-auth-dollar-hook-tests — 6 hooks, source-read 2026-06-07; workflow-orchestrated test generation + adversarial review under ultracode.*
