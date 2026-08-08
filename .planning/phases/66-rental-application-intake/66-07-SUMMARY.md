---
phase: 66-rental-application-intake
plan: 07
subsystem: edge-functions
tags: [edge-function, deno, public-endpoint, verify-jwt-false, rate-limit, honeypot, apply-02, d-04b, non-enumeration]

# Dependency graph
requires:
  - phase: 66-02
    provides: "the dependency-free guards module this function orchestrates: isHoneypotTripped, isTimingSuspicious, parseSubmissionPayload, HONEYPOT_FIELD"
  - phase: 66-04
    provides: "get_application_context and submit_rental_application, both service_role-only, and the closed reason-code set"
  - phase: 66-06
    provides: "those two RPCs applied to production, so the function is wired against a live schema"
provides:
  - "supabase/functions/apply-token/index.ts - the verify_jwt=false Edge Function with the context and submit actions; the only writer into public.rental_applications"
  - "supabase/config.toml [functions.apply-token] block with verify_jwt=false and import_map"
  - "supabase/functions/__tests__/apply-token-contract.test.ts - a Node-side drift guard over the function source and its deploy config"
affects:
  - 66-08 (deploys this function; owner-gated, deliberately not done here)
  - 66-11 (the RSC page calls the context action server-side)
  - 66-12 (the browser form posts the submit action)
  - 66-10 (the RLS integration suite proves the caps this function delegates to)
  - 66-17 (the E2E spec drives the rendered form through this endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Uniform HTTP 200 for every genuine outcome on a public token endpoint, with the status code carrying no information about token state - pinned structurally by asserting neither action branch constructs a Response with its own status"
    - "Delimiter-balancing source parsers in a drift guard rather than whole-file greps, because the same token is correct in one call site and a bug in another"
    - "A negative assertion paired with its positive twin (the context bucket MUST carry the token key, the submit bucket MUST NOT) so the negative cannot silently become vacuous"
    - "Client-supplied bot filters evaluated before any network round trip, both answering with the happy-path body"

key-files:
  created:
    - supabase/functions/apply-token/index.ts
    - supabase/functions/__tests__/apply-token-contract.test.ts
  modified:
    - supabase/config.toml

key-decisions:
  - "A missing or empty token returns the same 200 uniform-failure body as a token that does not exist, rather than sign-lease-token's 400 'Missing token'. It saves a hash and an RPC round trip and keeps the envelope indistinguishable from a token state."
  - "The submit envelope's failures map onto the RPC's closed reason set (invalid_token / invalid_payload) rather than introducing envelope-specific reasons, so the client has exactly seven reasons to handle and no eighth shape."
  - "The contract test asserts the whole-file absence of err.message / error.message rather than 'inside a Response body'. Whether an expression reaches a response is not decidable from source text, and the file has no legitimate use for either."
  - "Two assertion groups beyond the plan's five (handler structure, uniform failure shape) because both are Task 1 and Task 2 acceptance criteria that a source read can genuinely establish and nothing else in the plan pins."

patterns-established:
  - "Pattern 1: pair every forbidden-token assertion with a required-token assertion on a sibling call site. `expect(submitCall).not.toContain('identifier')` passes trivially if the extractor is broken; `expect(contextCall).toContain('identifier: tokenHash')` is what proves it is not."
  - "Pattern 2: strip comments before ordering or absence assertions on source text. This function's comments deliberately name the very things they forbid (the D-04b override, the /apply/<token> URL), so an unstripped scan reports the warning as the violation."

requirements-completed: [APPLY-02]

# Metrics
duration: 20min
completed: 2026-08-07
---

# Phase 66 Plan 07: The apply-token Edge Function Summary

**The product's only public, unauthenticated, write-capable surface: a `verify_jwt=false` Deno function whose context action never leaks which state a dead token is in, whose submit action runs honeypot then timing then an address-keyed limit then a strict payload check before the RPC, and whose token-hash rate-limit key is confined to the context action by an assertion that was proved non-vacuous by mutation.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-07T20:06Z
- **Completed:** 2026-08-07T20:26Z
- **Tasks:** 3 of 3
- **Files created:** 2 (338-line function, 503-line guard)
- **Files modified:** 1 (`supabase/config.toml`, +8 lines)
- **Assertions:** 32 in the new contract test; 106,928 in the full unit suite, all passing

## Task Commits

1. **Task 1: the context action** — `89e14ffec` (feat)
2. **Task 2: the submit action** — `55b897e6d` (feat)
3. **Task 3: config.toml block and the Node-side contract guard** — `a828a871a` (feat)

## Accomplishments

- **The uniform failure shape survives the HTTP layer, and that is asserted rather than asserted-about.** `get_application_context` deliberately returns one shape with NULL details for invalid, expired and revoked alike. The function preserves it three ways: the invalid branch returns an object literal with exactly `valid` and `reason`; the valid branch is built field-by-field so a column the RPC later gains cannot be forwarded; and neither action branch constructs a `Response` with its own status, so every genuine outcome leaves through a helper that hardcodes 200. The contract test pins all three, including `expect(CONTEXT_BODY).not.toContain("status:")` — which is what stops a future edit from reintroducing a 404 for a revoked link.
- **The D-04b bug cannot be reintroduced quietly.** `identifier: tokenHash` occurs exactly once in the file, inside `handleContext`, and three independent gates say so: the plan's `awk` walk forward from the `apply-submit` prefix, a whole-file occurrence count, and a balanced-paren extraction of the submit `rateLimit(` call. Mutation M1 — copying that one line onto the submit bucket, the exact one-line lift from `sign-lease-token/index.ts:142` — turns two assertions red.
- **Both bot filters run before any network call, and both are documented as filters rather than controls.** The call sites say plainly that `form_loaded_at` is client-supplied and trivially forged, and that the fail-closed bound is 66-04's per-link cap under the token row's `FOR UPDATE` lock. Nothing in the function or its test implies the Upstash limiter is the security boundary; the header states that it fails open by design and can only ever be the outer layer.
- **The three-property argument for an Edge Function over an anon INSERT policy is in the header**, so a future reader looking at 200 lines of orchestration finds the reason rather than inventing a simplification: an RLS predicate cannot hold the lock the caps need, has no request to read an address or a honeypot from, and would turn `POST /rest/v1/rental_applications` into a public API.
- **D-10 is enforced by absence and pinned by a test.** No mail module is imported, and the contract test fails on any import specifier matching `resend`. The header records *why* — a platform-sent outcome is adverse-action-shaped communication from a party that takes no adverse action — so a future "just add a confirmation email" has to argue against a written reason.
- **The honeypot field name is never spelled out.** It is read from `HONEYPOT_FIELD`, and the contract test asserts the literal `"company_website"` does not appear in the function. This is the carry-forward 66-02 flagged: its `expect(HONEYPOT_FIELD).toBe("company_website")` assertion only becomes load-bearing once consumers import the constant instead of hardcoding it. Plan 66-12 must do the same on the form side.

## Non-Vacuity Evidence

Ten mutations were applied to the committed source and the config, one at a time, with the suite re-run and the tree restored after each. Every one was caught. The two that matter most are the ones a presence-only test passes:

| Mutation | Result |
|---|---|
| M1 — copy `identifier: tokenHash` onto the submit rate-limit call (D-04b) | **2 fail**: `the submit bucket keys on the client address, with no override`, `the whole file carries exactly one token-hash limit key` |
| M2 — hoist the limiter above the honeypot check | **2 fail**: `the bot filters run BEFORE the limiter`, `both bot filters answer with an ordinary success` |
| M3 — honeypot answers `400` instead of success | **2 fail**: `both bot filters answer with an ordinary success`, `neither action branch constructs a Response with its own status` |
| M4 — invalid-token context branch carries a `listing` object | **1 fail**: `an unusable token gets a reason and nothing else` |
| M5 — spread the RPC row into the listing | **1 fail**: `the valid response is built field-by-field, never spread` |
| M6 — import a mail module (D-10) | **1 fail**: `imports no mail module` |
| M7 — config block loses `import_map` | **1 fail**: `carries the project-wide import map inside its own block` |
| M8 — config block loses `verify_jwt` while 14 other blocks keep theirs | **1 fail**: `carries verify_jwt = false inside its own block` |
| M9 — put a raw error message in a response body | **1 fail**: `never reads a raw error message anywhere` |
| M10 — extensionless `_shared` specifier | **1 fail**: `every _shared specifier ends in .ts` |

M8 is the one that justifies the block-slicing parser: a whole-file grep for `verify_jwt = false` still finds fourteen matches under that mutation and reports green.

The suite's own parsers are guarded against vacuity by four assertions of their own — comment stripping must remove a known prose string and keep known code, every extracted body must contain its own anchor, the two action bodies must be disjoint, and `tomlBlock` must throw rather than return an empty string for a header that is not there.

**The payload-parity guard was re-verified bidirectionally, as required.** Dropping `pet_details` from the Deno validator fails `has no optional field the Deno validator lacks` and `agrees on the total field count`; dropping the same field from the browser zod schema fails `has no optional field the browser schema lacks` and the count assertion. Both directions were mutated and both went red, so the two hand-maintained copies of the contract cannot drift in either direction. 19 assertions pass on the restored tree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The `digest(` acceptance criterion was tripped by the comment explaining it**

- **Found during:** Task 1
- **Issue:** The D-15 note read "*a `search_path = public` function cannot resolve digest() at all*". The Task 1 criterion is *"Zero occurrences of `digest(` in this file"*, and a comment satisfies a grep exactly as well as a call does.
- **Fix:** Reworded to "cannot resolve its hashing routine at all". Same meaning, and the gate now measures the thing it is for.
- **Files modified:** `supabase/functions/apply-token/index.ts`
- **Commit:** `89e14ffec`

**2. [Rule 3 - Blocking] The `resend` and `identifier` gates forbid the words, not just the code**

- **Found during:** Task 2
- **Issue:** `grep -c 'resend' == 0` and the `awk` walk that fails on any `identifier` following `apply-submit` are whole-line text gates. Prose describing what the function deliberately does not do would fail them.
- **Fix:** The D-10 paragraph says "sends mail" and "transactional-mail suppression rail"; the D-04b call-site comment says "no per-token key override". Every mandated point is stated; none is stated in a word the gate reserves.
- **Files modified:** `supabase/functions/apply-token/index.ts`
- **Commit:** `55b897e6d`

**3. [Rule 3 - Blocking] Two plan verification commands cannot run as written**

- **Found during:** Tasks 1, 2, 3
- **Issue:** (a) `bunx biome check supabase/functions/apply-token/index.ts` exits **1** with *"No files were processed in the specified paths"* — `biome.json#files.includes` excludes `supabase/functions/**` repo-wide. It is the last link in both the Task 1 and Task 2 `&&` chains, so both chains fail on a file that is otherwise clean. (b) `bun run test:unit -- --run <file>` is a CAC duplicate-flag error: `package.json#scripts.test:unit` already injects `--run`.
- **Fix:** Every grep in both chains was run individually and all pass (recorded under Verification). The test file was run as `bun run test:unit -- <file>`. This is the same pre-existing configuration gap 66-02 recorded; un-excluding `supabase/functions/**` would reformat every edge function in the repo and is far outside this plan's blast radius.

### Stated Position, Not a Silent Overrun

**`index.ts` is 338 lines, above CLAUDE.md's "max 300 lines".** 181 of those are code and 157 are comments — nearly all of the latter mandated by this plan (the three-property argument, the auth model, the caller asymmetry, D-10, the D-04b warning, the "filter not control" notes). Trimming the rationale to hit the number would remove the thing the plan asked for.

Two facts inform the call. The rule sits under *Architecture Rules* next to "Server Components by default" and reads "max 300 lines per **component**"; and the repo's own edge functions do not observe it — `generate-pdf` is 393, `n8n-blog-ingest` 494, `lease-signature` 630. The companion rule that does apply cleanly is honoured: `handleContext` is 45 non-comment lines, `handleSubmit` 50, the `Deno.serve` handler 43, all at or under the 50-line limit.

### Additive to the Plan

**Two assertion groups beyond the plan's five.** Group 6 pins the handler structure (preflight before `validateEnv` and before body parsing; `validateEnv` called exactly once and inside `Deno.serve`; Upstash declared optional and the service-role key required). Group 7 pins the uniform failure shape. Both are Task 1 and Task 2 acceptance criteria that the plan otherwise leaves to a human reading of the branch, and both are establishable from source text. Mutations M3 and M4 are caught only by group 7.

## Verification

| Gate | Result |
|---|---|
| `bun run test:unit -- supabase/functions/__tests__/apply-token-contract.test.ts` | **32 assertions, pass** |
| `bun run test:unit` (full suite, via lefthook pre-commit) | **316 files, 106,928 tests, pass** |
| `bun run typecheck` (root + integration + e2e projects) | **pass** |
| `bun run lint` (`biome check`) | **pass**, 1343 files |
| `gitleaks`, `lockfile-verify` (pre-commit) | **pass** on all three commits |
| Bun transpiler parse of `index.ts` + import scan | **parsed OK**, 7 `_shared/*.ts` specifiers |

Acceptance greps, run individually because the `&&` chains end in the excluded biome call:

| Check | Result |
|---|---|
| `handleCorsOptions` / `validateEnv` / `sha256Hex` / `get_application_context` present | **all 4 found** |
| `isHoneypotTripped` / `isTimingSuspicious` / `parseSubmissionPayload` / `submit_rental_application` / `prefix: "apply-submit"` present | **all 5 found** |
| `grep -c ': any'` | **0** |
| `grep -c 'as unknown as'` | **0** |
| `grep -c 'err.message\|error.message'` | **0** |
| `grep -c 'digest('` | **0** |
| `grep -c 'resend'` | **0** |
| `grep -c 'identifier: tokenHash'` | **1** (in `handleContext`) |
| `awk` walk forward from `apply-submit` for any `identifier` | **PASS** (none) |
| `[functions.apply-token]` in `supabase/config.toml` | **found**, with both `verify_jwt = false` and `import_map` inside its own block |
| `index.ts` line count vs `min_lines: 180` | **338** |

**Not deployed, deliberately.** No `supabase functions deploy` and no `mcp__supabase__deploy_edge_function` call was made. Plan 66-08 is the owner-gated deploy step. Until it runs, `apply-token` exists on disk and in `config.toml` and answers nothing in production — the same green-CI-nothing-shipped shape 66-01 and 66-04 flagged for unapplied migrations, and it is expected here rather than a defect.

## Issues Encountered

None blocking. Worth carrying forward: `supabase/functions/**` is invisible to biome, so these two files are neither linted nor formatted by any automated gate. They were written by hand in the repo's tab-indented style, and the only checks that see them are the contract test and `tsc` (which covers the test file, since `tsconfig.json#include` carries `supabase/functions/__tests__/**/*.ts`, but never the function itself).

## Known Stubs

None. Both actions are complete and call live production RPCs. The function has no placeholder branch, no mock data source and no unwired path.

## Threat Flags

None beyond the plan's register. This plan creates a public network endpoint, which is security-relevant surface by definition — but it is precisely the surface the plan's `<threat_model>` enumerates, and every disposition there is addressed:

| Threat | Disposition | Where |
|---|---|---|
| T-66-04 direct anon write | mitigate | Function is the only writer; the three-property argument is in the header |
| T-66-06 limiter weaponized against applicants | mitigate | Submit keys on the client address, 5/hour, no override; pinned by three gates and mutation M1 |
| T-66-07 forged client address | mitigate | Inherited from `_shared/rate-limit.ts` (`cf-connecting-ip`, else the LAST XFF segment); not re-implemented |
| T-66-08 honeypot / timing evasion | mitigate | Indistinguishable 200 success from both, both ahead of the limiter; pinned by M2 and M3 |
| T-66-05 application flood | transfer | Bounded by 66-04's DB caps under `FOR UPDATE`; the header says the limiter fails open and is not the bound |
| T-66-02 enumeration via status code or partial data | mitigate | Group 7 of the contract test; M4 |
| T-66-11 PII in logs / bodies / mail | mitigate | `errorResponse` everywhere; `invalid_payload` omits the field name; no mail module (M6, M9) |
| T-66-09 stored XSS | mitigate | No HTML constructed; template literals asserted tag-free |
| T-66-29 deploy failure from a missing import map | mitigate | Block carries `import_map`; M7 and M8 prove the slice |
| T-66-SC package installs | mitigate | Zero packages added; every specifier already in `supabase/functions/deno.json` |

No new security-relevant surface outside that register was introduced.

## Next Phase Readiness

- **66-08 (deploy):** the function and its `config.toml` block are on disk and unshipped. `verify_jwt = false` must be verified in the deployed state, not just in the repo — `config.toml` is a deploy input, not a source of truth about production. The prod probe is documented in `config.toml`'s own guidance block (`x-deno-execution-id` present means the function ran, absent means the gateway blocked). Three env vars are required at runtime: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`; `NEXT_PUBLIC_APP_URL` must have **no trailing slash** or CORS fails closed for every browser submit (Pitfall 1).
- **66-11 (public page):** call `{ action: "context", token }` **server-side**. A `valid: false` response carries no `listing` key at all, so destructure defensively; render the single `TOKEN_UNAVAILABLE_COPY` card for every reason without branching on which one.
- **66-12 (the form):** POST `{ action: "submit", token, submission_id, form_loaded_at, [HONEYPOT_FIELD], application }`. Four things the function requires and will silently or quietly reject otherwise: `submission_id` must be a **v4-shaped uuid minted once per form load** (per-attempt minting defeats idempotency and a malformed one returns `invalid_payload`); `form_loaded_at` must be a real millisecond epoch captured at mount (absent, non-numeric, or under 3s elapsed reads as a bot and returns a *success* with zero rows written); the honeypot input's `name` must come from `HONEYPOT_FIELD`, not the literal; and the applicant fields go under an `application` key, not at the envelope top level.
- **Response handling for 66-12:** `success: true` with `reason: "duplicate"` is a **success** — the row already exists and re-prompting makes the applicant submit twice. A 429 from the limiter is the only non-200 a healthy path produces and maps to UI-SPEC A-5 state 6 (form intact, submit still enabled, no accusatory copy).
- **66-10 (RLS integration):** this function delegates every fail-closed property to the RPCs. The parallel-submission test is the only thing that proves the `FOR UPDATE` cap holds; nothing in this plan can.

No blockers.

## Self-Check: PASSED

Files:

- `supabase/functions/apply-token/index.ts` — FOUND (338 lines)
- `supabase/functions/__tests__/apply-token-contract.test.ts` — FOUND (503 lines)
- `supabase/config.toml` — FOUND, `[functions.apply-token]` block present

Commits:

- `89e14ffec` — FOUND in git log
- `55b897e6d` — FOUND in git log
- `a828a871a` — FOUND in git log

Working tree clean for every file this plan touched; the three untracked entries (`.agents/`, `.github/instructions/`, `skills-lock.json`) pre-date this plan and were left alone.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-07*
