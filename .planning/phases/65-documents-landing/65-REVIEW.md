---
phase: 65-documents-landing
reviewed: 2026-08-03T14:48:57Z
depth: deep
files_reviewed: 14
files_reviewed_list:
  - src/app/(owner)/documents/__tests__/documents-hub.test.ts
  - src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx
  - src/app/(owner)/documents/document-hub-tile.tsx
  - src/app/(owner)/documents/documents-hub-entries.ts
  - src/app/(owner)/documents/page.tsx
  - src/app/(owner)/documents/recent-documents-panel.tsx
  - src/components/documents/__tests__/documents-section.test.tsx
  - src/components/documents/documents-section.tsx
  - src/components/shell/__tests__/app-shell-nav.test.tsx
  - src/components/shell/__tests__/main-nav.test.tsx
  - src/components/shell/app-shell.tsx
  - src/components/shell/main-nav.tsx
  - src/lib/__tests__/breadcrumbs.test.ts
  - src/lib/breadcrumbs.ts
findings:
  critical: 2
  warning: 5
  info: 7
  total: 14
status: issues_found
---

# Phase 65: Code Review Report

**Reviewed:** 2026-08-03T14:48:57Z
**Depth:** deep
**Files Reviewed:** 14
**Status:** issues_found

> Severity vocabulary: **Critical = BLOCKER** (must be fixed before this ships),
> **Warning** (should be fixed), **Info** (worth fixing, non-blocking).

## Summary

Phase 65 converts `/documents` from a 308 `permanentRedirect` into a Server-Component
landing (3 bands, 6 tiles), adds a single client island that shares the vault's cache
entry, repoints two nav route tables and the breadcrumb map, and adds a
`documentSearchQueries.all()` invalidation to the upload/delete paths.

Baseline checks all pass: `bun run typecheck` clean, `bun run lint` clean, and the four
touched suites pass (9 files / 197 tests). None of the findings below are caught by any
existing test — which is itself the point.

The two SC-3 claims verified TRUE:
- The panel's `documentSearchQueries.list({ page: 0 })` produces the byte-identical
  8-element key the vault's default unfiltered state produces
  (`documents-vault.client.tsx:230-239` — all five spreads empty, `pageParam` 0). One
  query, one mapper, no second data source. Confirmed.
- D-11's invalidation covers both mutation paths (delete via `onSuccess`, upload via the
  post-batch call) and does **not** drop `ownerDashboardKeys.all` — the code invalidates
  all three keys. `["documents","list",…]` genuinely cannot prefix-match
  `["documents","search"]`, so the added line is necessary and additive.

What the phase got wrong is concentrated in the panel's state machine and in claims the
source makes about itself. Two blockers: the panel renders a definitive "No documents yet"
whenever the query is pending-but-not-fetching (offline, and during the IndexedDB cache
restore that runs on every cold load), and the phase made a breadcrumb link to a 404
reachable for the first time while its own rationale asserts the opposite.

## Critical Issues

### CR-01: `isLoading` is the wrong pending predicate — the panel asserts "No documents yet" while the query has never resolved

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:201-223`
**Issue:**
The state machine is `isLoading ? skeletons : isError ? error : rows.length === 0 ? empty
: list`. In TanStack Query v5, `isLoading === isPending && isFetching`. There are two
reachable states where a query is `pending`, has `data === undefined`, is **not** in
error, and is **not** fetching — both fall through to `RecentEmpty` and tell the owner
they have no documents:

1. **Offline (permanent, not a flash).** `query-provider.tsx:75` sets
   `networkMode: "online"` globally. `query-core/query.js:415` →
   `fetchStatus: canFetch(networkMode) ? "fetching" : "paused"`, and
   `retryer.js:11` → `canFetch` is `onlineManager.isOnline()`. Offline ⇒
   `fetchStatus: "paused"` ⇒ `isFetching` false ⇒ `isLoading` false ⇒ `isError` false ⇒
   `rows = []` ⇒ **"No documents yet"**, with no error copy and no Retry button, for as
   long as the browser reports offline.

2. **Cache restore (every cold load).** `react-query/useBaseQuery.js:43` sets
   `_optimisticResults = isRestoring ? "isRestoring" : "optimistic"`, and
   `queryObserver.js` forces `newState.fetchStatus = "idle"` for `"isRestoring"`.
   `PersistQueryClientProvider` starts with `isRestoring = true`
   (`PersistQueryClientProvider.js:18`), and this app mounts that provider from a client
   effect after `createIdbPersister` resolves (`query-provider.tsx:138-163`, `242-255`).
   So every full page load of `/documents` runs a window where `isLoading` is false and
   `data` is undefined: SSR skeletons → hydrate skeletons → **flash of "No documents
   yet"** → skeletons → rows.

This is the one claim the surface exists to make, and it is the failure mode a
milestone named "claims integrity" is supposed to preclude. (The vault at
`documents-vault.client.tsx:484-510` has the same shape — `!data || data.rows.length === 0`
→ "No documents uploaded yet" — so SC-3's "cannot disagree" holds, but both are wrong
together.)

**Fix:** Branch on the pending status, not the fetching status. One-word change; covers
both triggers because `status` is `"pending"` in each.

```tsx
export function RecentDocumentsPanel() {
	const { data, isPending, isError, refetch } = useQuery(
		documentSearchQueries.list({ page: 0 }),
	);
	const rows = (data?.rows ?? []).slice(0, RECENT_LIMIT);

	return (
		<div className="mt-4 space-y-4">
			<p className="text-xs text-muted-foreground">Recently added</p>
			{isPending ? (
				<RecentSkeletons />
			) : isError ? (
				<RecentError onRetry={() => { void refetch(); }} />
			) : rows.length === 0 ? (
				<RecentEmpty />
			) : (
				<RecentList rows={rows} />
			)}
		</div>
	);
}
```

Add a regression test alongside the existing four-state block:

```tsx
it("shows skeletons, never the empty copy, while the query is pending-but-paused", () => {
	mockUseQuery.mockReturnValue({
		data: undefined,
		isPending: true,
		isLoading: false, // offline / isRestoring: pending but not fetching
		isError: false,
		refetch: vi.fn(),
	});
	const { container } = render(<RecentDocumentsPanel />);
	expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5);
	expect(screen.queryByText("No documents yet")).not.toBeInTheDocument();
});
```

---

### CR-02: the phase makes a breadcrumb link to a 404 reachable for the first time — L-06's "pre-existing" rationale is factually wrong

**File:** `src/lib/breadcrumbs.ts:39-57` (behaviour), `src/app/(owner)/documents/documents-hub-entries.ts:107-139` (the new links), `src/components/shell/app-shell-header.tsx:74-104` (renders the crumb as a `<Link>`)
**Issue:**
`generateBreadcrumbs("/documents/templates/rental-application")` emits three crumbs, and
`app-shell-header.tsx:84-95` renders every middle crumb as a real
`<Link href="/documents/templates">` (visible at `sm` and above).
`src/app/(owner)/documents/templates/` has no `page.tsx` — only `components/` — so that
link is a hard 404. `breadcrumbs.test.ts:273-279` asserts exactly this
(`existsSync(.../templates/page.tsx) === false`).

The L-06 rationale in `breadcrumbs.ts:50-52` says: *"The dead crumb is pre-existing and
out of DOCS-01's scope."* The dead crumb existed; its **reachability did not**:

```
$ git grep -n "templates/rental-application\|templates/tenant-notice\
\|templates/property-inspection\|templates/maintenance-request" \
  90526195a5904fce9a44ece7b65645c8b671746e -- src tests
(no output)
```

Before this phase, nothing in `src/` or `tests/` linked to any of the four printable
template routes. Phase 65's Band 3 is the first and only door to them, so every owner who
now uses the feature the phase shipped lands on a page whose breadcrumb offers a
one-click trip to a 404. The label omission (which is fine — the capitalize fallback
already renders "Templates") does not address this; the crumb being a **link** does.

**Fix:** Emit the segment as a non-link crumb. `app-shell-header.tsx` already renders
`crumb.href ? <Link> : <span>`, so an empty `href` is the supported "not navigable"
signal — no header change needed.

```ts
// Segments that are real URL path components but have no page.tsx behind them.
// Emitted as non-navigable crumbs so the trail stays honest without linking a 404.
const NON_ROUTABLE_SEGMENTS = new Set(["templates"]);

// ...inside the else branch of generateBreadcrumbs:
breadcrumbs.push({
	href: NON_ROUTABLE_SEGMENTS.has(segment) ? "" : currentPath,
	label,
});
```

Then extend the existing two-sided guard so it pins the href too:

```ts
expect(generateBreadcrumbs("/documents/templates/tenant-notice")).toEqual([
	{ href: "/documents", label: "Documents" },
	{ href: "", label: "Templates" }, // non-navigable: no page.tsx behind it
	{ href: "/documents/templates/tenant-notice", label: "Tenant Notice" },
]);
```

(The `existsSync` guard at `breadcrumbs.test.ts:273-279` stays as-is and keeps forcing a
revisit if the route ever ships.)

## Warnings

### WR-01: `page.tsx`'s header documents two invariants the code does not hold

**File:** `src/app/(owner)/documents/page.tsx:16-24`
**Issue:** Both statements are false, and both are the kind a maintainer will act on.

1. *"Its one and only client island is `<RecentDocumentsPanel />`."*
   `page.tsx:106` renders `<Separator />`, and `src/components/ui/separator.tsx:1` is
   `"use client"`. The page ships at least two client boundaries. The "enforcement"
   (`documents-hub.test.ts:178-232`) greps `page.tsx` for the literal `"use client"`
   string, which by construction cannot see a client component reached through an
   import — so the guard's own doc claim ("The enforcement of that purity is a source
   scan … not a convention") over-states what it enforces.
2. *"NO ERROR BOUNDARY wraps this page, on purpose … an outer boundary would let a failed
   document fetch take down 'Open the vault'."*
   `src/app/(owner)/error.tsx` exists and is a segment error boundary that wraps every
   owner page, this one included. The stated reasoning rests on a premise that is not
   true of the deployed tree. (No live crash follows — `throwOnError: false` in
   `query-provider.tsx:78` keeps query failures out of render — but the documented
   safety property is not the one in force.)

**Fix:** Either make the claims true or restate them.

- For (1), drop the client boundary the page does not need — a decorative rule does not
  require radix:
  ```tsx
  <div className="mt-6 border-t border-border" role="presentation" />
  ```
  and remove the `Separator` import. If `Separator` is kept, correct the header to
  "its only *data-bearing* client island" and say so.
- For (2), replace with: "This page adds no `error.tsx` of its own; it inherits
  `(owner)/error.tsx`. Query failures degrade in place because `throwOnError: false` keeps
  them out of render."
- Optionally give the purity test teeth for (1) by scanning the resolved local imports of
  `page.tsx` for a `"use client"` first line, rather than scanning `page.tsx` alone.

---

### WR-02: prototype-chain lookup in `categoryLabel` — an owner-creatable slug returns a non-string from a `: string` function

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:59-66`
**Issue:** `CATEGORY_LABELS` is the plain object literal `DEFAULT_CATEGORY_LABELS`
(`src/lib/validation/documents.ts:47-55`) widened to `Record<string, string>` — it still
carries `Object.prototype`. Document category slugs are owner-created and validated only
by `documentCategorySlugSchema` (`src/lib/validation/documents.ts:61-65`),
`/^[a-z0-9_]+$/`, which admits `constructor` and `__proto__`.

- `CATEGORY_LABELS["constructor"]` → the `Object` function (truthy) → returned as `string`.
- `CATEGORY_LABELS["__proto__"]` → `Object.prototype` (truthy) → returned as `string`.

`metaLine` then interpolates it: the row's meta line reads
`function Object() { [native code] } · 3 days ago` or `[object Object] · 3 days ago`.
The comment above the constant argues the widening keeps unknown slugs "an honest
`undefined` under `noUncheckedIndexedAccess`" — that is true for own-property misses only.

**Fix:**

```ts
function categoryLabel(slug: string): string {
	// `Object.hasOwn`, not a bare index read: CATEGORY_LABELS is a plain object
	// literal, and the owner-slug regex /^[a-z0-9_]+$/ admits `constructor` and
	// `__proto__`, which a bare read resolves off the prototype chain.
	const known = Object.hasOwn(CATEGORY_LABELS, slug)
		? CATEGORY_LABELS[slug]
		: undefined;
	if (known) return known;
	const spaced = slug.replace(/_/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
```

Pin it: `successState([makeRow({ document_type: "__proto__" })])` must render
`Proto`-shaped fallback text and must not contain `[object Object]`.

---

### WR-03: the landing now mints and persists up to 50 Storage signed URLs it never renders

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:200-204` (mount site);
`src/hooks/api/query-keys/document-search-keys.ts:170-181` (mint);
`src/providers/query-persistence.ts:41-71` (persist filter)
**Issue:** The shared cache entry is not just rows — `documentSearchQueries.list`'s
`queryFn` calls `createSignedUrls(paths, 3600)` for every returned path (up to
`SEARCH_PAGE_SIZE = 50`). `shouldDehydrateQuery` excludes only the `auth`,
`supabase-auth`, `user.me` and `user.sessions` namespaces, so the
`["documents","search",…]` entry — signed URLs included — is written to IndexedDB under
`tenantflow-query-cache` with a 24-hour `maxAge` (`query-provider.tsx:265-267`). Sign-out
(`use-auth-mutations.ts:81-101` → `clearAuthData` in `use-auth.ts:160-186`) only
*invalidates*; it never calls `queryClient.clear()` or the persister's `removeClient()`,
and the user-scoped predicate only matches keys that embed the user id — which this key
does not. Signed URLs are capability URLs: anyone with the string reads the private file
for an hour, no session required.

None of this is newly invented by Phase 65 — the vault already did it. What the phase
changes is *who*: `/documents` is now the sidebar's Documents destination, so the mint +
persist now fires for every owner who opens the section, not only those who open the
vault. And the panel renders none of those URLs on purpose (D-03), so the whole payload is
minted for five rows of text.

**Fix:** any one of these closes the widened surface; the first is the smallest.

1. Exclude the namespace from persistence — `query-persistence.ts`:
   ```ts
   // `["documents","search",…]` caches 1-hour Storage signed URLs. Those are
   // capability URLs; they must not outlive the tab, let alone survive sign-out
   // in IndexedDB for 24h.
   const NON_PERSISTED_QUERY_NAMESPACES: ReadonlySet<string> = new Set([
   	"auth",
   	"supabase-auth",
   	"documents",
   ]);
   ```
2. Or clear the persisted client on sign-out (`removeClient()` + `queryClient.clear()` in
   `useSignOutMutation.onSuccess`) — this also fixes every other owner-scoped cache
   surviving a logout on a shared machine.

Note (1) trades away the offline read of the documents cache; (2) is the broader fix and
belongs in its own phase if it is out of scope here. Either way, record the decision —
right now the trade is undocumented.

---

### WR-04: two independent nav route tables with no shared source of truth

**File:** `src/components/shell/main-nav.tsx:35-46` and `src/components/shell/app-shell.tsx:92-103`
**Issue:** The sidebar's `coreItems` and the Cmd+K palette's `commandGroups[0].items`
are two hand-maintained literals holding the same six destinations with the same labels
and the same icons. This phase edited both (`/documents/vault` → `/documents`), and
`app-shell-nav.test.tsx:1-15` records that a prior review already caught exactly this
class of miss once.

The new tests do pin the `/documents` rows — in each table separately, with hardcoded
expectations. Nothing asserts the two tables *agree*, so the next item added to the
sidebar can silently miss the palette (and vice versa) with a green suite. The comment
that documents the hazard is not a mechanism.

**Fix:** Declare the shared set once and derive both, then pin the derivation.

```ts
// src/components/shell/core-nav-items.ts
export const CORE_NAV_ITEMS = [
	{ label: "Dashboard", href: "/dashboard", icon: Home },
	{ label: "Properties", href: "/properties", icon: Building2 },
	{ label: "Tenants", href: "/tenants", icon: Users },
	{ label: "Leases", href: "/leases", icon: ClipboardList },
	{ label: "Maintenance", href: "/maintenance", icon: Wrench },
	{ label: "Documents", href: "/documents", icon: FolderArchive },
] as const satisfies readonly NavigationItem[];
```

`main-nav.tsx` maps it for `coreItems`; `app-shell.tsx` spreads it into the Navigation
group. If a shared module is rejected, add the cross-table assertion instead:

```tsx
it("palette Navigation group matches the sidebar core items exactly", () => {
	expect(paletteHrefs().slice(0, CORE_NAV_ITEMS.length)).toEqual(
		CORE_NAV_ITEMS.map((i) => i.href),
	);
});
```

---

### WR-05: a 308 `permanentRedirect` was reverted with no cache-invalidation story

**File:** `src/app/(owner)/documents/page.tsx` (was `permanentRedirect("/documents/vault")` at base commit `90526195a`)
**Issue:** `permanentRedirect` emits **308**, which is permanently cacheable by
definition and which Chrome/Safari cache aggressively and persistently. Every user and
intermediary that received that response before this deploy may keep short-circuiting
`/documents` → `/documents/vault` and never see the landing this phase exists to ship.
`documents-hub.test.ts:262-282` correctly proves no *new* redirect was added, but nothing
addresses redirects already sitting in clients.

The exposure is probably small — `(owner)/layout.tsx:1` sets
`export const dynamic = "force-dynamic"`, which normally yields `no-store` on the
redirect response — but "probably" is doing the work here, and it is one command to know.

**Fix:** verify rather than assume, post-deploy:

```bash
curl -sSI https://tenantflow.app/documents | grep -iE "^(HTTP|location|cache-control)"
```

Expect `HTTP/2 200` (or the auth redirect to sign-in), and no
`location: /documents/vault`. A `/documents/vault` → `/documents` bounce is NOT an
acceptable remedy — it inverts D-05 and demotes the canonical vault URL. If a cached 308
is confirmed in the wild, the correct response is to confirm the deployed
`Cache-Control` on `/documents` is `no-store` (so the stale entry cannot be revalidated
into permanence) and record the residual client-cache exposure in the phase summary.

## Info

### IN-01: `RecentList` exceeds the 50-line function cap it was split to satisfy

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:147-198`
**Issue:** 52 lines. CLAUDE.md sets a 50-line function cap, and this file's render was
split into module-local sub-components specifically to honour it; the largest resulting
piece still misses. (~36 lines excluding the four inline comment blocks, so the intent is
clearly met — the letter is not.)
**Fix:** Lift the row body into a `RecentRow({ doc })` sub-component, or move the two
long inline rationale blocks (154-161, 183-187) into the file header where the rest of
the reasoning already lives.

### IN-02: `documents-section.tsx` pushed further past the 300-line component cap

**File:** `src/components/documents/documents-section.tsx:1-419`
**Issue:** 419 lines, of which the single component is 349 (71-419). CLAUDE.md caps
components at 300. Pre-existing (400 lines at the base commit); this phase added 19, 16 of
them comment.
**Fix:** Out of scope to fix here, but the D-11 comment (lines 142-156) restates
reasoning that also lives in the two new tests — trim it to two lines and cite
`__tests__/documents-section.test.tsx:494-509` rather than re-arguing it.

### IN-03: the D-11 tests do not pin `ownerDashboardKeys.all`

**File:** `src/components/documents/__tests__/documents-section.test.tsx:518-577`
**Issue:** Both new tests assert exactly two of the three keys
`invalidateListAndDashboard` touches. `ownerDashboardKeys.all` — mandated by CLAUDE.md
("Mutations invalidate related query keys AND `ownerDashboardKeys.all`") — is unasserted,
so it can be dropped without failing anything. The code is correct today
(`documents-section.tsx:160`).
**Fix:** one line in the upload test:
```tsx
expect(keys).toContainEqual(ownerDashboardKeys.all);
```

### IN-04: the vault tile's description repeats the enumeration D-12 removed

**File:** `src/app/(owner)/documents/documents-hub-entries.ts:86-87`
**Issue:** *"…every document attached to your properties, leases, tenants, and
maintenance requests."* `DOCUMENT_ENTITY_TYPES` has five members — `inspection` is
missing — so the tile claims "every document" and then enumerates four fifths of the
sources. This is the exact drift surface `recent-documents-panel.test.tsx:165-188` pins
the empty state against ("names no entity type"), reintroduced one component over.
(Copied from `vault/page.tsx:6-7`, which has the same gap.)
**Fix:** drop the enumeration: *"Search, filter, and bulk-download every document
attached to your portfolio."*

### IN-05: `LABEL_MAP` has the same prototype-lookup hazard as WR-02

**File:** `src/lib/breadcrumbs.ts:85-86`
**Issue:** `LABEL_MAP[segment] || <capitalize>` reads through `Object.prototype`. A route
segment named `constructor`, `toString` or `__proto__` yields a function/object as
`label`, which React refuses to render as a child (warning + empty crumb). Not reachable
today — no owner route uses those names, and unmatched URLs render the root
`not-found.tsx` outside `AppShell` — so this is latent, not live.
**Fix:** `const mapped = Object.hasOwn(LABEL_MAP, segment) ? LABEL_MAP[segment] : undefined;`

### IN-06: "Recently added" is a visual label only

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:210`, `150`
**Issue:** The `<p>Recently added</p>` is not programmatically associated with the `<ul>`
it labels, so a screen-reader user hears an unlabelled 5-item list inside a section named
"Document Vault".
**Fix:** `<p id="recent-documents-label" …>` + `<ul aria-labelledby="recent-documents-label">`.

### IN-07: the error branch discards rows the panel still holds

**File:** `src/app/(owner)/documents/recent-documents-panel.tsx:213-218`
**Issue:** After a successful load, a failed background refetch (window focus after the
45-minute `staleTime`) sets `status: "error"` while `data` keeps the previous rows.
`isError` wins the branch, so the panel replaces five perfectly good rows with
"Couldn't load recent documents." The vault behaves identically, so SC-3 is not violated —
both degrade together.
**Fix:** prefer data when it exists:
```tsx
{isPending ? <RecentSkeletons /> : isError && rows.length === 0 ? <RecentError … /> : …}
```
(and surface the stale-refetch failure with a subtle indicator rather than a state swap).

---

_Reviewed: 2026-08-03T14:48:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
