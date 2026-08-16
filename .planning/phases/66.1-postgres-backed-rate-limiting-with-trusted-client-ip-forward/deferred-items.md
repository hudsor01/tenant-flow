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
