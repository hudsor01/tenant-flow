# 66-08 Summary — Deploy `apply-token` to production

**Status:** COMPLETE
**Plan type:** `autonomous: false` — owner authorized the deploy before it ran.
**Result:** `apply-token` **v1 ACTIVE**, `verify_jwt = false`, source byte-identical to disk.

## One change was required before the deploy could run

`scripts/deploy-edge-functions.ts` carries a **hardcoded** `FUNCTIONS` array, and
`apply-token` was not in it. The plan assumed the script would deploy any function named on
the command line; it does not — it filters the hardcoded list by the argv slugs.

The failure mode was benign (`No matching functions to deploy.` + `exit(1)`, not a silent
no-op), but the deploy could not proceed without the entry. Added:

```ts
{ slug: "apply-token", entrypoint: "index.ts", verify_jwt: false },
```

**Standing hazard this exposes:** that array is a second source of truth for the `verify_jwt`
matrix, duplicating `supabase/config.toml`. Its own comment pins it to a commit
(`config.toml at HEAD 665c34cad`) that is long superseded. Any future function must be added
in BOTH places, and a `verify_jwt` disagreement between them would deploy a function with the
wrong auth posture while `config.toml` reads correct in review. Worth collapsing to one
source in a later phase.

## Deploy path

Used `bun scripts/deploy-edge-functions.ts apply-token` with the macOS-keychain token
override, per the plan:

```
SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s 'Supabase CLI' -w)"
```

- **Not** `supabase functions deploy` — 401s in this project against a PAT that authenticates
  fine for `projects list`.
- **Not** MCP `deploy_edge_function` — that path takes source as a model-emitted string and
  has corrupted non-ASCII in this repo before (`edge-deploy-mcp-fidelity`). The script reads
  from disk.

Result: `apply-token (verify_jwt=false) ... v1 ACTIVE — 1/1 succeeded`.

## Live boundary probe

```
POST /functions/v1/apply-token  {"action":"context","token":"not-a-real-token"}
HTTP/2 200
x-deno-execution-id: d785cf00-8ee1-44a0-953f-764f3225b3fd
{"valid":false,"reason":"invalid_token"}
```

- **200, not 401** — `verify_jwt = false` took effect; an unauthenticated applicant is not
  rejected at the gateway.
- **200, not 404** — the function is deployed, not missing.
- **`x-deno-execution-id` present** — this is what proves the function body ran rather than
  the gateway answering on its behalf. Without it a 200 would be uninformative.

### Uniformity confirmed live, not just in source

Ran a second probe with a **well-formed 64-character hex token** that does not exist:

```
{"valid":false,"reason":"invalid_token"}
```

Byte-identical to the garbage-token response. A caller cannot distinguish "malformed token"
from "well-formed token that is not in the database", which is the property that stops a
brute-forcer learning when they have found a real token, and stops someone holding a dead
link confirming which property it belonged to. 66-07 asserted this structurally; this is the
same property observed against the deployed artifact.

## Fidelity check — the whole reason for the disk-reading path

Read the deployed bundle back with `mcp__supabase__get_edge_function` and compared **every**
file against disk by sha256, not just the entrypoint:

| Property | Result |
|---|---|
| `functions/apply-token/index.ts` | sha256 `52a618dc0dbe79cf…` — **identical** to disk |
| All 13 bundled files (entrypoint + 11 `_shared` modules + `deno.json`) | **0 mismatches** |
| Deployed `verify_jwt` | `false` |
| Version / status | `1` / `ACTIVE` |

The 11 shared modules matter as much as the entrypoint: `application-guards.ts` is the
strict payload validator plan 66-02 proved non-vacuous by mutation, and a corrupted copy of
it would weaken validation invisibly while the entrypoint looked correct.

## What is now live, and what is not

`/functions/v1/apply-token` is a public, unauthenticated, write-capable endpoint on
production. It is reachable by anyone.

It is not yet **usable**: minting an application link requires `create_application_link`,
whose UI ships in plan 66-14 (wave 6), so no valid token exists for a caller to present. Every
request currently terminates at `invalid_token`. The write path behind it is bounded by the
DB-side caps under the token row lock (250 lifetime, 25 rolling-hour), which are live as of
plan 66-06.

## Carry-forward

- The `deploy-edge-functions.ts` / `config.toml` duplication is a real footgun; recorded above.
- Nothing has yet exercised `submit` against a valid token. The first genuine end-to-end
  submission happens in the wave-5 RLS/integration suite (66-10).
