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
