---
phase: 65-documents-landing
audited: 2026-08-03
audited_at_commit: 3412b3095
base_commit: 90526195a
asvs_level: unset (default)
threats_total: 15
threats_closed: 15
threats_open: 0
accepted_risks: 3
unregistered_flags: 3
status: secured_with_warnings
---

# Phase 65: Security Audit

Every threat in the three plan-level `<threat_model>` registers was verified against source
at HEAD (`3412b3095`), **not** against the SUMMARY claims. Two SUMMARY threat tables were
stale at audit time and are corrected below (65-02's T-65-06 row predates the `isPending`
fix; 65-03's T-65-08 row names a mitigation that has since been superseded).

No implementation file was modified by this audit.

## Verification method

| Disposition | Method used |
|---|---|
| `mitigate` | Locate the declared control in the cited file at HEAD, then locate the regression pin that holds it. A control with no pin is reported, not silently passed. |
| `accept (inherited)` | Verify the factual premise of the acceptance against source (not against the plan's prose), then record it in the accepted-risk log below. |
| `transfer` | None declared in this phase. |

## Threat register — verdicts

| Threat ID | Category | Disposition | Verdict | Evidence at HEAD |
|---|---|---|---|---|
| T-65-01 | Tampering | mitigate | CLOSED | `src/components/documents/documents-section.tsx:157-159` adds `invalidateQueries({ queryKey: documentSearchQueries.all() })` between the entity-scoped list call (`:139-141`) and `ownerDashboardKeys.all` (`:160`); `useCallback` deps unchanged at `:161`. Both mutation paths pinned: upload `src/components/documents/__tests__/documents-section.test.tsx:518`, delete `:554` (the delete test also pins `onSuccess: invalidateListAndDashboard` at `documents-section.tsx:170` via `capturedDeleteOnSuccess`). Both assert the retained entity key too, so the change is proven additive. |
| T-65-02 | Information Disclosure | mitigate | CLOSED | `recent-documents-panel.tsx:222-224` — exactly one `useQuery`, sole argument `documentSearchQueries.list({ page: 0 })` (`grep -c "useQuery("` = 1). No `createClient`, no `.from("documents")`, no `queryOptions(` in any file this phase created under `src/app/(owner)/documents/` — the only textual hit is the prohibition inside a comment. Pinned by `recent-documents-panel.test.tsx:126` (`toEqual({ page: 0 })` over **every** recorded spy call, not the last) and `:145` (the 8-element key literal). |
| T-65-03 | Information Disclosure | mitigate | CLOSED (declared scope) — see **AR-01** | Rows render no capability URL: `RecentList` (`recent-documents-panel.tsx:158-209`) emits `<li>` with `ItemMedia`/`ItemTitle`/`ItemDescription` only; the sole `<a>` in the tree is the footer `View all documents` → `/documents/vault`. Pinned by `recent-documents-panel.test.tsx:282` (`li a, li button` = 0 **and** `li [href]` = 0, paired with a length-5 populated-tree assertion) and `:296` (exactly one `<a>`). |
| T-65-04 | Elevation of Privilege | accept (inherited) | CLOSED — recorded as **AR-02** | Premise verified, not assumed: `src/lib/routes/private-routes.ts:11` carries `"/documents"`, and `src/proxy.ts:46-48` matches on `pathname === prefix \|\| pathname.startsWith(prefix + "/")`. `git diff --stat 90526195a..HEAD -- src/proxy.ts src/lib/routes/ next.config.ts vercel.json` is **empty** — no gate file was touched by any of the three plans. |
| T-65-05 | Tampering (XSS) | mitigate | CLOSED | No `dangerouslySetInnerHTML` anywhere in `recent-documents-panel.tsx`; owner-supplied `doc.title ?? doc.file_path` is a plain text child of `ItemTitle` (`:183-185`). Pinned by `recent-documents-panel.test.tsx:306` — `<img src=x onerror="alert(1)">` produces `container.querySelector("img") === null` and renders as literal text. |
| T-65-06 | Information Disclosure | mitigate | CLOSED | `RecentError` (`recent-documents-panel.tsx:102-128`) renders a fixed string plus a Retry button and destructures **nothing** from the query error — the component signature is `{ onRetry }` only, so no error object is even in scope. Pinned by `recent-documents-panel.test.tsx:240`, which asserts both `PGRST116` and the full driver message are absent from `container.textContent`. **Re-verified post-`e29128270`:** the `isPending`/`isError` branches are mutually exclusive (`status` is one of `pending`/`error`/`success`), so the error branch is still reachable and the pin is still live. 65-02-SUMMARY's T-65-06 row was written against the `isLoading` code and is stale on the predicate, not on the outcome. |
| T-65-07 | Spoofing | mitigate | CLOSED (namespace scope) — see **UF-02** | Both route tables repointed and pinned by exhaustive equality. Sidebar: `main-nav.tsx:45` is `{ label: "Documents", href: "/documents", icon: FolderArchive }`; `main-nav.test.tsx:253-262` collects every `<a href>` in the rendered sidebar, filters to `/documents*` and asserts `toEqual(["/documents"])`. Palette: `app-shell.tsx:101` is `/documents`; `app-shell-nav.test.tsx:135-141` asserts the palette's `/documents*` set is exactly `["/documents", "/documents/lease-template"]`. Dead-symbol sweep clean: `grep -c "DocumentItem\|documentItems\|FileCheck"` and `grep -cF "Templates"` over `main-nav.tsx` both return **0**. Both surviving palette destinations resolve to real routes (`/documents` has a `page.tsx`; `/documents/lease-template` is covered by the T-65-11 `existsSync` pin). |
| T-65-08 | Spoofing | mitigate | CLOSED — **by a superseding mitigation, not the plan-time one** | See the dedicated section below. |
| T-65-09 | Information Disclosure | mitigate | CLOSED | `page.tsx` has zero data dependencies: no client directive, no hook, no Supabase import, no `next/navigation` import (verified by reading the file, 192 lines). Enforcement is `documents-hub.test.ts:178-232` — nine forbidden patterns matched against **comment-stripped** source, paired with seven required positives (`:197-208`) and a `strippedHubIndex.length > 200` self-check (`:216`), plus a nine-case detector self-test (`:234-260`) proving the matcher actually fires. `df1e8a82e` additionally made the page's own "one and only client island" claim true: the `Separator` import (the one `"use client"` primitive it reached) was replaced by a plain `<div role="none">` at `:119-123`. Independently confirmed — `button.tsx`, `item.tsx`, `empty.tsx` and `skeleton.tsx` carry no `"use client"` directive; `separator.tsx:1` does. |
| T-65-10 | Tampering | mitigate | CLOSED | `git diff --stat 90526195a..HEAD -- src/lib/seo/reporting-redirects.ts` is empty. Pinned in TypeScript, never by grep: `documents-hub.test.ts:269` asserts `REPORTING_REDIRECTS` has exactly 7 entries (the length pin that stops the next assertion passing on an emptied array) and `:273` asserts no rule's `source` or `destination` equals or descends from `/documents`. |
| T-65-11 | Spoofing | mitigate | CLOSED | `documents-hub.test.ts:151-160` runs `existsSync(join(cwd, "src/app/(owner)" + href, "page.tsx"))` per entry via `it.each` over all six — so the assertion cannot silently cover five. Paired negatives at `:162-174`: no entry points at `/documents` itself, every href starts with `/documents/`. This is what refuses `/documents/templates`, which holds only a `components/` directory. |
| T-65-12 | Denial of Service (self-inflicted) | mitigate | CLOSED as declared — see **UF-03** | Declared enforcement was "the `toEqual({ page: 0 })` params pin **plus code review** of the single `useQuery` call". Code review performed at HEAD: `recent-documents-panel.tsx:222-224` passes one argument and no second argument; `grep -c "useQuery("` over the file = 1. `document-search-keys.ts:193-194` still carries `staleTime: LIST_STALE_TIME_MS` / `gcTime: LIST_GC_TIME_MS` at 45/55 min (`:26-27`), untouched by the phase. |
| T-65-13 | Elevation of Privilege | accept (inherited) | CLOSED — recorded as **AR-03** | Same premise as T-65-04 and verified the same way. Repointing a nav `href` from `/documents/vault` to `/documents` moves between two paths that are both matched by the same `PRIVATE_ROUTE_PREFIXES` entry, so it cannot widen access. No `PUBLIC_ROUTES`, proxy or middleware file appears in the phase diff. |
| T-65-14 | DoS (navigability) | mitigate by avoidance | CLOSED | `main-nav.tsx:41-45` — the `Documents` entry has no `children` key, and carries an inline comment recording why. It therefore renders through `renderNavItem`'s non-children branch as a `<Link>`; the `hasChildren` branch at `:195-214` (a `<button onClick={toggleExpanded}>` with no `<Link>`) is never taken for it. Pinned **structurally**, both halves required: `main-nav.test.tsx:85-93` asserts `queryByRole("button", { name: /^documents$/i })` is absent **and** `getByRole("link", …)` has `href="/documents"`. The `toEqual(["Analytics", "Reports"])` two-section tripwire at `:135-143` is untouched and still passes. |
| T-65-SC | Tampering (supply chain) | mitigate | CLOSED | `git diff --stat 90526195a..HEAD -- package.json bun.lock` produces **no output**. The full phase diff is 16 files, all under `src/`. No `[ASSUMED]`/`[SUS]` package exists, so no legitimacy checkpoint applied. |

**Closed: 15/15. Open: 0. No BLOCKER.**

## T-65-08 — closed by a different mitigation than the one planned

This one deserves its own record, because the plan-time mitigation was **present and still
would not have closed the threat**.

- **Planned mitigation:** omit `templates` from `LABEL_MAP`, so the map does not "dress a
  404 in an intentional-looking entry."
- **Why that was insufficient:** the crumb's label was never the spoofing surface. Its
  *linkness* was. `app-shell-header.tsx` renders crumbs as `crumb.href ? <Link> : <span>` at
  all three positions (first `:59-70`, middle `:83-94`, last `:110-121`), and it derives
  `href` from `currentPath`, not from `LABEL_MAP`. With or without a map entry, the crumb
  rendered as a live `<Link href="/documents/templates">` to a hard 404. The capitalize
  fallback (`breadcrumbs.ts:95-96`) even produced the identical label either way, so the
  omission was a pure no-op against this threat.
- **Mitigation actually in force (`7059d1aa9`):** `breadcrumbs.ts:63-72` declares
  `NON_ROUTABLE_SEGMENTS = new Set(["templates"])`, and `:111-114` emits
  `href: NON_ROUTABLE_SEGMENTS.has(segment) ? "" : currentPath`. The empty href drives the
  header's `<span>` branch, so the crumb is present but non-navigable.
- **Verified:** `generateBreadcrumbs` has exactly one consumer app-wide
  (`app-shell.tsx:46` → `AppShellHeader` at `:297`); no structured-data or SEO surface reads
  it, so there is no second renderer that could still emit the URL.
- **Pinned:** `breadcrumbs.test.ts:220-228` asserts the full three-crumb array with
  `{ href: "", label: "Templates" }` for all four slugs; `:238-243` asserts the middle crumb
  is not `/documents/templates`; `:310-313` pins the `NON_ROUTABLE_SEGMENTS` declaration
  itself; `:295-303` keeps the `existsSync` coupling so shipping `templates/page.tsx` forces
  **both** decisions to be revisited.

Also corrected: the L-06 rationale's "the dead crumb is pre-existing" is true of the crumb
but not of its reachability. `git grep` at the base commit `90526195a` returns nothing for any
of the four `documents/templates/*` slugs in `src/` or `tests/` — Phase 65's Band 3 is the
first surface in the app that links them at all. The comment now in `breadcrumbs.ts:68-71`
states this accurately.

**Verdict: CLOSED.** 65-03-SUMMARY's threat table (which credits the omission) is stale.

## Accepted risks — require an explicit owner decision

### AR-01 — persisted Storage signed URLs survive sign-out for 24h (WR-03)

**Status: OPEN DECISION. Not a phase-65 blocker; recorded here because the resolution log
deferred it with "record the decision — right now the trade is undocumented."**

Verified end to end at HEAD:

- `document-search-keys.ts:172-190` calls `storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)`
  for every returned path, up to `SEARCH_PAGE_SIZE = 50` (`:30`), and embeds the URLs in the
  cache entry.
- `query-persistence.ts:18-21` — `NON_PERSISTED_QUERY_NAMESPACES` is `{"auth", "supabase-auth"}`
  only; `:27-30` narrows `user.me` / `user.sessions`. The `["documents","search",…]` entry
  matches none of these, so `shouldDehydrateQuery` (`:41-71`) returns true for it.
- `query-provider.tsx:265-267` — persisted to IndexedDB under `tenantflow-query-cache` with
  `maxAge` = 24 hours.
- `use-auth.ts:160-201` (`clearAuthData`) invalidates auth namespaces and user-id-bearing
  keys, then removes `localStorage["REACT_QUERY_OFFLINE_CACHE"]`. It never calls
  `queryClient.clear()` or the persister's `removeClient()`, and `grep` finds no other caller
  of either in `src/`. The documents-search key embeds no user id, so the predicate at
  `:179-185` does not match it. **The 24h IndexedDB entry, signed URLs included, survives
  sign-out.**

Signed URLs are capability URLs: the string alone reads the private file for an hour with no
session.

**Correction to WR-03's premise.** WR-03 argues Phase 65 *widened who* this happens to, "from
vault visitors to every owner who opens the Documents section." That does not survive
verification against the base commit:

- `git show 90526195a:src/components/shell/main-nav.tsx` → line 48 was
  `{ label: "Documents", href: "/documents/vault", … }`, and
  `git show 90526195a:'src/app/(owner)/documents/page.tsx'` was a bare
  `permanentRedirect("/documents/vault")`.
- So **before** the phase, clicking Documents (sidebar or Cmd+K) landed the owner on the vault,
  which mounted `DocumentsVaultClient` and minted + persisted the same 50 URLs into the same
  `["documents","search","",null,null,null,null,0]` entry. Deep-linking `/documents` 308'd to
  the same place.
- **After** the phase, the same click mints the same 50 URLs into the same entry from the
  landing island instead. Because the two surfaces share one entry (SC-3), a
  sidebar → landing → vault journey mints **once**, not twice.

Net effect on the persisted signed-URL population: **neutral**, not widened. The hazard is
genuinely pre-existing, is recorded in `65-CONTEXT.md` `<deferred>`, and 65-02's threat model
scoped it out before implementation rather than retroactively.

Separately worth stating plainly, because the register's own wording overstates it: T-65-03's
rationale says the landing carries "strictly less file-access surface than the vault." That is
true of the **DOM** only. At the cache layer the landing mints and persists exactly as many
signed URLs as the vault does — 50 one-hour capability URLs to render five rows of text, none
of which the panel displays. The control that is verified closed is the render surface; the
mint/persist volume is unchanged.

**Options (unchanged from WR-03, neither is the auditor's call):**
1. Add `"documents"` to `NON_PERSISTED_QUERY_NAMESPACES` — smallest change; gives up the
   offline read of the documents cache.
2. `removeClient()` + `queryClient.clear()` in `useSignOutMutation.onSuccess` — broader and
   more correct (covers every owner-scoped cache surviving a logout on a shared machine), but
   a cross-cutting auth change that belongs in its own phase.

**Decision required from the owner.** Until one is recorded, option (0) — accept as-is — is
what is in force, undocumented anywhere else in the repo.

### AR-02 — T-65-04: `/documents` route authorization inherited from the proxy gate

Accepted as inherited. Premise verified at HEAD: `private-routes.ts:11` lists `/documents`;
`proxy.ts:46-48` prefix-matches it; no gate file appears in the phase diff. The unauthenticated
307 → `/login?redirect=%2Fdocuments` behaviour recorded live on 2026-08-02 is consistent with
that code path, but was **not** re-executed by this audit — it is a live-environment check, and
`bun run dev` cannot start locally (`.env.local` lacks app vars and must not be edited).
Carried into `65-HUMAN-UAT.md` territory rather than claimed as verified here.

### AR-03 — T-65-13: repointed `/documents` destination

Accepted as inherited, same premise and same verification as AR-02. Both the old destination
(`/documents/vault`) and the new one (`/documents`) are covered by the single `/documents`
private prefix, so the repoint is access-neutral by construction.

## Unregistered flags (WARNING — no threat-register mapping)

None of the three SUMMARY files declared a `## Threat Flags` entry (65-01 and 65-02 both say
"None"; 65-03 supplies a threat-outcome table instead). The following surfaced during
verification and have no threat ID.

### UF-01 — prototype-chain read still live in `breadcrumbs.ts` (review IN-05, unfixed)

`recent-documents-panel.tsx:61-77` was hardened with `Object.hasOwn` in `df1e8a82e` (WR-02).
The identical hazard one file over was **not**: `breadcrumbs.ts:95-96` is still

```ts
const label =
    LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
```

`LABEL_MAP` is a plain object literal, so `LABEL_MAP["__proto__"]` returns `Object.prototype`
(truthy, an object) and `LABEL_MAP["constructor"]` / `["toString"]` return functions —
confirmed by direct evaluation. The `||` fallback never fires, and a non-string `label` reaches
`<span>{crumb.label}</span>` in `app-shell-header.tsx`. React throws on an object child
("Objects are not valid as a React child"), which lands in `(owner)/error.tsx`.

**IN-05's reachability analysis is wrong.** It reasons that "unmatched URLs render the root
`not-found.tsx` outside `AppShell`". That holds for unmatched URLs, but not for **matched
dynamic segments**: `(owner)/layout.tsx:71-77` → `OwnerDashboardLayout` → `AppShell`
(`owner-dashboard-layout.tsx:22`) wraps every owner route including its `[id]` pages and their
`not-found.tsx` files. `/properties/__proto__` matches `properties/[id]/page.tsx`, is not a
UUID, and therefore reaches `LABEL_MAP["__proto__"]`.

Severity: low — self-inflicted client crash on a URL an authenticated owner must be induced to
visit; no data exposure, no privilege change. It is **pre-existing** (the bare read predates
Phase 65), but `breadcrumbs.ts` is a file this phase modified, the review flagged it, and it
was neither fixed nor recorded. Fix is one line, mirroring the panel:
`const mapped = Object.hasOwn(LABEL_MAP, segment) ? LABEL_MAP[segment] : undefined;`

Not empirically executed (no local dev server); this is a source-path analysis with each hop
cited.

### UF-02 — two nav route tables with no cross-table agreement assertion (WR-04, deferred)

`main-nav.tsx:35-46` (`coreItems`) and `app-shell.tsx:92-103` (`commandGroups[0].items`) remain
two hand-maintained literals holding the same six destinations.

**Judgement requested: does pinning each table separately close T-65-07?** For this phase's
change, **yes** — and the reason is the pins' shape, not their existence. Both are exhaustive
`toEqual` over the collected `/documents*` href set, not `toContain`, so a stale
`/documents/vault` surviving in either table fails its own suite. That is precisely the failure
mode T-65-07 names ("a stale row surviving in the second route table"), and it is closed for
the `/documents` namespace in both tables.

What is **not** closed is the generalization: nothing asserts the two tables *agree*, so the
next destination added to the sidebar can silently miss the palette with a green suite. That is
outside T-65-07's declared scope (which is about this phase's repoint) but is the standing
mechanism-level gap. `app-shell-nav.test.tsx:103-124` gives partial defence in depth — a
live-route-roots allowlist — but it is root-granularity and would have accepted
`/documents/vault` just as happily, which the file's own comment says. Deferred by the
orchestrator as a cross-cutting refactor; recorded here so the deferral is not silent.

### UF-03 — T-65-12's regression coverage does not extend to a second `useQuery` argument

The `toEqual({ page: 0 })` pin covers drift in the **params object** passed to
`documentSearchQueries.list`. It cannot see a second argument to `useQuery` — a future
`useQuery(documentSearchQueries.list({ page: 0 }), { staleTime: 0 })` would pass every existing
test while reintroducing exactly the window-focus RPC + ~50-signed-URL-mint storm T-65-12
describes. The plan named "code review of the single `useQuery` call" as part of the
enforcement and that review was performed here (HEAD is correct), so the threat is closed as
declared — but the control is human, not mechanical. A source-scan assertion in
`recent-documents-panel.test.tsx` (one `useQuery(` occurrence, no second argument) would make
it durable.

## Notes on stale SUMMARY claims

Verified against source rather than accepted; recorded so the next reader does not re-derive
them:

| Claim | Where | Status at HEAD |
|---|---|---|
| T-65-06 mitigated with the `isLoading` state machine | 65-02-SUMMARY "Threat Flags" table | Outcome still true; predicate changed to `isPending` in `e29128270`. Re-verified: branches are mutually exclusive, pin still live. |
| T-65-08 mitigated by omitting `templates` from `LABEL_MAP` | 65-03-SUMMARY "Threat Model Outcomes" | Superseded. The omission never addressed the failure mode; `NON_ROUTABLE_SEGMENTS` (`7059d1aa9`) does. |
| "`page.tsx` … its one and only client island is `<RecentDocumentsPanel />`" | 65-01/65-02 | False when written (`Separator` is `"use client"`), true at HEAD after `df1e8a82e`. Independently confirmed against `button.tsx` / `item.tsx` / `empty.tsx` / `skeleton.tsx`, none of which carry the directive. |
| WR-03 "widened *who* it happens to" | 65-REVIEW.md | Premise does not survive verification against `90526195a` — the pre-phase sidebar pointed straight at `/documents/vault`. Net population is neutral. See AR-01. |

## Residual owner actions

1. **Decide AR-01** (persisted signed URLs surviving sign-out) — option 1, option 2, or an
   explicit accept. This is the only item in this document that needs a person.
2. Optional, low cost: UF-01 (one-line `Object.hasOwn` in `breadcrumbs.ts`), UF-03 (a
   source-scan pin for the single-argument `useQuery`).
3. Not security: 65-03-SUMMARY §"Deviations" item 3 flags two now-false comments in
   `app-shell.test.tsx:411-415` that still name `/documents/vault`.

---
*Audited: 2026-08-03 · commit `3412b3095` · implementation files unmodified*
