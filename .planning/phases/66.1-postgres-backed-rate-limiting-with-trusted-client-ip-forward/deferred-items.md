# Phase 66.1 — deferred items

## D1 — The tenant-form property tests are a flaky pre-commit gate (repo-wide, pre-existing)

**Found:** 2026-08-15, when the pre-commit hook blocked an unrelated docs-only commit. The same
commit succeeded unchanged on retry, which is the definition of the problem.

**Symptom.** `bun run test:unit` intermittently fails with 5 timeouts plus one genuine-looking
property failure:

```
add-tenant-form-success.property.test.tsx > should display success toast with special character names
  Counterexample: [{ first_name: "Nguyễn", last_name: "de la Cruz", ... }]
  AssertionError: expected ', hasO is now in your tenant records.' to contain 'Nguyễn'
```

`"hasO"` appears **nowhere** in that test's inputs — its names are a fixed `fc.oneof` list of eight
constants. That string is the tell.

**Root cause — three faults compounding, none of which is the assertion being wrong:**

1. **No fixed seed.** There is no `fc.configureGlobal({ seed })` anywhere and no `seed:` in any
   `fc.assert` options, so every run explores a different sample. The suite is nondeterministic by
   construction, which is why it passes on retry and passes in isolation.
2. **No cleanup between iterations or tests.** Each property iteration calls `renderHook(...)` and
   nothing unmounts it. When the sibling test
   (`should display success toast for any successful add`, which uses generated strings — the
   likely source of `"hasO"`) times out at 10s, it leaves mounted components and in-flight
   mutations behind.
3. **The assertion reads `successCalls[0]`.** After `vi.clearAllMocks()`, the FIRST
   `toast.success` to land wins — and under (2) that can be a late resolution from the previous
   test, carrying the previous test's data.

So a timeout in one test silently corrupts the assertion in the next. The failure looks like a
Unicode-handling bug in the component and is actually cross-test state leakage.

**Why it is not fixed here.** It is pre-existing, repo-wide, and unrelated to rate limiting; the
fix needs its own verification (the honest proof is running the suite N times and showing zero
failures, not one green run). Doing it inside a rate-limiter phase would be exactly the scope
creep this project's discipline warns against.

**What the fix looks like when someone takes it:**
- Pin the seed (`fc.configureGlobal({ seed: <n> })`) so failures reproduce and the gate is
  deterministic. A property test that cannot be re-run identically cannot be debugged.
- `cleanup()` after each iteration, and `await` every in-flight mutation before the iteration ends.
- Assert against the LAST `toast.success` call, or better, capture the mock length before the
  action and read only calls added after it — `successCalls[0]` is only correct if nothing else can
  ever write to that mock.
- Consider raising the 10s timeout, but that treats the symptom; (2) and (3) are the defect.

**Severity:** the tests are not wrong about the product — the component is fine. They are wrong
about themselves. A gate that fails on unrelated commits and passes on retry trains everyone to
re-run rather than read, which is how a real failure eventually gets waved through.

---

## D2 - The Supabase PAT value is cached in plaintext in `.next/dev/cache/turbopack/*.sst`

**Found during:** 66.1-02 Task 1, while running the plan's own credential-hygiene sweep.

**What was found.** Four Turbopack dev-cache files contain the literal value of
`SUPABASE_ACCESS_TOKEN` (an `sbp_` project-admin PAT):

```
.next/dev/cache/turbopack/ee6e79b1/00000240.sst
.next/dev/cache/turbopack/ee6e79b1/00000291.sst
.next/dev/cache/turbopack/v16.2.10/00000524.sst
.next/dev/cache/turbopack/v16.2.10/00000526.sst
```

**Why it is not fixed here.** Pre-existing, produced by `bun run dev`, entirely unrelated to rate
limiting. Nothing this plan wrote contains the value; the scratchpad is clean.

**Blast radius is bounded, and this is why it is D-severity rather than an incident:**
- `.next/` is git-ignored at `.gitignore:3` and `git ls-files .next` returns zero tracked files,
  so the value has never been committed and cannot reach the remote.
- The token is currently REJECTED by the Supabase Management API (401 on every endpoint,
  including read-only `GET /v1/projects`), so the cached copy is almost certainly a stale
  credential that has already been rotated or revoked.

**What the fix looks like:** `rm -rf .next` clears it. The durable fix is not feeding a
project-admin PAT into the Next.js dev process environment at all -- it is needed by the Supabase
CLI and management tooling, never by the app, so it belongs in a shell profile scoped to those
commands rather than in the dev server's inherited environment.

**Owner action required either way:** the 401 means the PAT needs rotating before 66.1-02 can
apply its migration (see that plan's SUMMARY). When it is rotated, clear `.next` in the same pass
so the old value does not linger on disk.

## D3 — Which `timingSafeEqual` branch runs on Supabase's Deno is still unmeasured

**Found:** perfect-PR cycle 3, 2026-08-22.

`_shared/timing-safe.ts` feature-detects `crypto.subtle.timingSafeEqual` and falls back to an XOR
loop. Measured locally on Deno 2.9.5: the global does NOT expose it, so the XOR loop runs. Supabase
Edge Runtime ships its own Deno build and was not measured, so which branch executes in production
is unknown.

**Why it is not urgent:** both branches are constant-time. This is a question about which code path
runs, never about whether the compare is safe. Nothing behaves differently either way.

**Why it is recorded anyway:** the note in the source assigned the probe to plan 66.1-05, which
shipped without doing it. A task that lives only inside a comment has no owner and no due date, and
this one silently survived a whole phase.

**How to close it:** log
`typeof (crypto.subtle as unknown as Record<string, unknown>).timingSafeEqual` from any deployed
edge function, then replace the "STILL NOT VERIFIED ON THE DEPLOYMENT TARGET" paragraph with the
measurement. The test now accepts either the open question or a line containing `MEASURED ON
SUPABASE`, so recording the answer is no longer a test failure — it was, which is why closing it
looked like breaking the gate.
