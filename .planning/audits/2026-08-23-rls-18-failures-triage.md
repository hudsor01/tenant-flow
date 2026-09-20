# Triage — the 18 RLS failures the CI gap was hiding

**Context.** `SUPABASE_SERVICE_ROLE_KEY` was never a repo secret and was referenced nowhere in the
workflow, so 163 of 531 RLS tests skipped on every run while `rls-security` reported success. Wiring
it in (PR #968) made them execute for the first time. 18 fail, across 5 files from 5 phases.

**Headline: zero confirmed product bugs. All 18 are test or environment defects.**

That is not reassuring. These are security tests. Eighteen of them are written such that they could
never have caught a regression, and nobody knew because they never ran.

---

## Cluster A — storage-metering (7) · ENVIRONMENT

`PGRST106 — Invalid schema: storage. Only the following schemas are exposed: public, stripe,
graphql_public, pgmq_public`

All seven die in the same `seedOversize` helper: it inserts into `storage.objects` over PostgREST,
which cannot reach the `storage` schema. `supabase/config.toml:13` reads
`schemas = ["public", "graphql_public"]`.

The test author anticipated this exactly — the line above the assertion reads *"Fail loudly (not a
silent skip) if the storage schema is unreachable — the orchestrator needs the signal to expose it /
pre-seed via MCP."* The signal was emitted and nobody received it, because the suite was skipping.

**Fix:** either expose `storage` to PostgREST, or seed the oversize objects through a SECURITY
DEFINER RPC in `public`. The second is preferable — exposing `storage` widens the PostgREST surface
for every anon caller to solve a test-seeding problem.

**Not a product bug.** The metering guard itself is untested either way, which is the real cost.

---

## Cluster B — blogs-status-workflow (4) · TEST-BUG

The product rejects correctly. The tests assert the wrong *mechanism*.

`validate_blog_post_trigger` raises `23514` in nine places and runs BEFORE the check constraint, so:

| test expects | actually raised |
|---|---|
| `blogs_slug_format_check` (constraint name) | `slug pattern invalid: ... (must match ^[a-z]...)` (trigger) |
| `h2_count out of range` | `word_count out of range` — an EARLIER gate the payload also trips |
| `DocuSeal mention count too high` | an earlier gate, same cause |

Two failures assert a constraint name that a later-added trigger now pre-empts; two assert a specific
gate without isolating the payload from the gates that run before it.

**Fix:** assert the trigger's message, and build each payload so only the gate under test can fire.

**Product is correct**, and its message is more useful than the one the test wanted.

---

## Cluster C — lease-signing-tokens (4) · TEST-BUG, one open question

All four reuse `leaseAId`, which earlier tests in the same file have already signed. The clearest
case: *"token-state rejection precedence: revoked wins over used + expired"* expects `revoked_token`
and gets `tenant_already_signed` — `sign_lease_with_token` short-circuits on already-signed before it
evaluates token state.

**Fix:** a fresh lease per test.

**OPEN QUESTION worth answering deliberately:** should `already_signed` out-rank `revoked`? A revoked
token being reported as "already signed" tells the wrong story to whoever is looking. That is a real
design question hiding behind a fixture bug, and it should be decided rather than absorbed.

---

## Cluster D — rent-ledger-generation (2) · TEST FIXTURE

`22P02 invalid input syntax` — `untrackedLeaseId` is not a UUID at query time, so a setup step did
not produce it. Cascading fixture failure, not a ledger defect.

---

## Cluster E — rental-applications-retention (1) · TEST FIXTURE

`TypeError: Cannot read properties of null (reading 'id')` — the disposable owner the GDPR cascade
test creates came back null.

---

## What this says about the CI gap

The gap did not hide 18 broken behaviours. It hid 18 tests that cannot detect anything:

- 7 that cannot reach their fixtures at all
- 4 that assert an implementation detail which moved
- 4 that depend on state a sibling test mutates
- 3 whose setup silently produced nothing

A skipped test and a test that cannot fail are the same artifact from a distance, and this repo had
both stacked: the suite skipped, and had it not skipped, a third of what ran would have proved
nothing. That is the same species as the ten defects the Phase 66.1 perfect-PR review found.

## Recommended order

1. **Cluster A** — largest, single root cause, and it unblocks 7 storage-metering tests that
   currently assert nothing about a live quota guard.
2. **Cluster C's open question** — decide the precedence semantics before fixing the fixture, so the
   test encodes a decision rather than whatever the code does today.
3. **Clusters B, D, E** — mechanical once A and C are settled.

---

# EXECUTION RESULT — 2026-08-23

**18 failures → 7.** 481 passing. Full run: `10 failed | 49 passed | 2 skipped` files,
`7 failed | 481 passed | 43 skipped` tests.

## Cluster A — 7 → 2. Largely fixed.

Seeding through `public.seed_storage_object_for_test` (SECURITY DEFINER, service_role-only) removed
the PGRST106 wall without exposing the `storage` schema. Ten of twelve storage-metering cases now
pass, including every exemption path: grandfathered, Max tier, service_role, system bucket, flag-off.

Two remain, and they are the two that assert the guard actually BLOCKS. Those are worth real
attention — they are the only cases that would catch a broken quota guard, and everything around
them now passes.

A cleanup RPC was created and dropped one migration later: `storage.protect_delete()` raises 42501
on any direct DELETE against `storage.objects`, SECURITY DEFINER included. Rows are removed through
the Storage API instead, which is what Supabase's own hint says to do.

## Clusters D, E — root causes now NAMED rather than disguised

The unchecked-insert fix did its job. The failures changed shape from misleading to precise:

| was | now | meaning |
|---|---|---|
| `22P02 invalid input syntax` | `23P01 exclusion_violation` | `createLease` overlaps an existing lease on the same unit — an exclusion constraint, not a ledger defect |
| `TypeError: reading 'id' of null` | `23503 foreign_key_violation` | `public.users.id` references `auth.users(id)`, so the direct insert cannot work; the fixture must originate the row in Auth |

Both are now one-line fixture problems with the answer written in the error.

## Cluster B — fixed

Two assertions moved from the constraint name to the trigger's wording. Two payloads were rebuilt to
sit inside 1200..3000 words so the gate under test is the gate that fires — the h2 case was
overshooting the ceiling at ~3,000 and the DocuSeal case undershooting the floor at ~1,040. Both now
land near 1,400.

## Cluster C — 5 remain, and one is genuinely unexplained

RETRACTED: my "open design question" about precedence. `sign_lease_with_token` checks `revoked_token`
at character 781 and `tenant_already_signed` at 1753 — revoked wins, exactly as the test asserts.
There is one overload only. Verified live: a token with `revoked_at` set returns `revoked_token`.

**What is still unexplained.** With the seed assertion in place the insert demonstrably SUCCEEDS —
`expect(error).toBeNull()` and `expect(data?.id).toBeTruthy()` both pass — and the RPC still answers
`tenant_already_signed`. Every static explanation is exhausted:

- the RPC checks revoked first (verified in the deployed body)
- there is exactly one overload
- `lease_signing_tokens` has NO triggers, so nothing rewrites `revoked_at` on insert
- `RUN_TAG` embeds `Date.now()`, so hashes cannot collide across runs
- the only unique index is on `token_hash`; no constraint rejects a revoked+used row
- direct SQL with the same shape returns `revoked_token`

The gap between "the row was inserted with revoked_at" and "the RPC did not see it" needs the actual
row read back inside the failing test. That is a five-line diagnostic, not a guess, and it should be
the next step rather than another hypothesis.

## Honest accounting

Skips rose 12 → 43 and failing FILES rose 5 → 10 while failing TESTS fell 18 → 7. That is what
adding real assertions to shared fixture helpers does: a helper that used to hand back null now
aborts its file, so more files register a failure while far fewer individual assertions are wrong.
It is the right direction and the file count will fall as each fixture is fixed.


---

# CORRECTION — the precedence case is NOT a product bug

Mid-investigation I concluded the two signing RPCs disagreeing on precedence was a real defect, on
the strength of their branch order alone:

```
sign_lease_with_token:      invalid -> revoked -> used -> expired -> ... -> already_signed
get_lease_signing_context:  invalid -> already_signed -> lease_active -> revoked -> used -> expired
```

**That was wrong, and I withdraw it.** The divergence is deliberate and the function says so:

> SIGN-04: evaluate the completed-state reasons FIRST for the authentic tenant's token. Signing
> consumes the token, so a legitimate signer revisiting their link would otherwise only ever see
> `used_token` and never the friendly "already signed / active" cards.

The two functions answer different questions. `sign_lease_with_token` decides whether an action may
proceed, so a revoked token is refused outright. `get_lease_signing_context` decides what to SHOW
someone whose signature may already be on file — and revocation does not un-sign anything, so
"you already signed" is both true and more useful than "revoked". The `v_email_match` gate keeps a
rebound token holder from being told they signed when they did not.

**The actual defect is the fixture, exactly as the original triage said.** The case seeded its token
on `leaseAId`, which earlier tests sign. On a signed lease the completed-state branch legitimately
wins and token-state precedence is unobservable — the assertion could not be true regardless of the
implementation. It now uses a dedicated unsigned lease.

**Two things worth keeping from the error.** First: I read a branch order and declared a bug without
reading the comment eight lines above it that explained the order. The comment was doing its job;
I wasn't. Second: this is the third time in this session that a confident reading of structure
turned out to be wrong where a five-line empirical check would have settled it — the same lesson
the phase's perfect-PR cycles kept teaching about assertions.

---

# FINAL — 18 failures to 0 assertions, 12 skips to 1

`1 failed | 530 passed | 1 skipped` on the last run, and the single failure is a
rate-limit artifact analysed below, not an assertion about behaviour.

## Two real product defects, both found only because the suite finally ran

**1. The storage quota block was undetectable by the client on upload.**
`enforce_storage_quota` raised `errcode = 'P0001'` — PL/pgSQL's default. The Storage
API strips message, hint and detail, so a blocked upload arrived as
`database error, code: P0001`, indistinguishable from every other trigger exception.
The Upgrade prompt was unreachable. Now raises `PLIM1`.

**2. The avatars bucket had no SELECT policy.** DELETE, INSERT and UPDATE existed;
SELECT was absent, so `list()` returned `[]` for every authenticated caller. That
silently broke `use-profile-avatar-mutations.ts`, which lists a user's folder to
delete their old avatars — the call succeeds, returns nothing, and removes nothing.
Measured: 138 orphaned avatar objects for one owner, zero users holding an
`avatar_url`. It hid because the bucket is `public=true`, so avatars render fine by
URL; public read and enumeration are different operations and only the second is
governed by RLS.

Both had passing unit tests that fabricate the shape they assert on.

## The skips were the same defect as the service-role key, twice more

`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` had been repo secrets since April and the
workflow never passed them, so ten admin-scoped tests skipped on every run. R10 —
"the sweep is registered on a unique cron slot" — had never executed once, because
it bails when `cron` is unreachable over PostgREST, which it always is. Both closed:
credentials wired, and a service_role-only `cron_job_slot_counts` probe returning
counts rather than job bodies.

## The remaining failure is a capacity ceiling, not a bug

`download-documents-zip` got a 401. Not token expiry — `jwt_exp` is 3600s and the
run is 388s; I chased that and was wrong.

The real cause: `rate_limit_token_refresh` is **150/hour** and the suite makes **155**
`createTestClient` calls. Every one performed a full password sign-in, because
`readSessionCache()` existed with **no `writeSessionCache()` anywhere** — the cache
was read and never written by the client path. `global-auth-setup.ts` is the intended
writer and pre-caches owners plus admin, gated on the admin env being present. It
wasn't, until this change.

So wiring the admin credentials fixes the 401 as a side effect: globalSetup now caches
all four users and per-suite sign-ins collapse to `setSession` calls with zero auth
API hits. The previous flake fix on this same file removed `signOut()` calls for the
same underlying reason.

## What the whole exercise says

The gap hid 18 failing assertions, 12 permanently-skipped tests, and two live product
defects. Not one of the 18 was a behaviour that had regressed; every one was a test
that could not detect anything, in a suite that reported success while running a third
less than it appeared to.
