/**
 * Source of truth for route prefixes that require authentication.
 * Imported by proxy.ts (middleware gate) and robots.ts (disallow list).
 * Never edit this file without updating both consumers.
 */
export const PRIVATE_ROUTE_PREFIXES = [
	"/admin",
	"/analytics",
	// Phase 66 (APPLY-03). Three things a future editor needs:
	//
	// 1. The `(owner)` route group does NOT appear in the URL, so a page at
	//    src/app/(owner)/applications/page.tsx is served at `/applications` and
	//    gets no gate whatsoever from its directory position. THIS LIST is the
	//    gate and nothing else. The entry is here from wave 1, before the route
	//    exists, because a private route must be gated before it ships — the
	//    reverse order is how an authenticated surface goes public for a commit.
	//
	// 2. `isPrivateRoute` (proxy.ts) matches on a path-segment boundary
	//    (`pathname === prefix || pathname.startsWith(prefix + "/")`), so this
	//    entry provably cannot capture the public `/apply/<token>` route.
	//
	// 3. `/apply` is deliberately absent from BOTH arrays in this file
	//    (D-13/D-14). It is public by ABSENCE — the proxy is a deny-list. The
	//    roadmap's APPLY-01 text says to add the route to a public allow-list
	//    array in the proxy; no such array exists in this codebase and none was
	//    created. Do not add one, and do not add `/apply` here. Its crawler
	//    exclusion is the page's own `robots: { index: false, follow: false }`
	//    metadata, NOT a robots.txt disallow: a disallow would stop the crawler
	//    from ever fetching the page and reading that meta tag, making indexing
	//    MORE likely, not less. Both properties are pinned by predicate-level
	//    assertions in robots.test.ts.
	"/applications",
	"/billing",
	"/dashboard",
	"/documents",
	"/inspections",
	"/leases",
	"/maintenance",
	"/notifications",
	"/profile",
	"/properties",
	"/reports",
	"/settings",
	"/tenants",
	"/units",
] as const;

/**
 * Additional paths that should be disallowed for crawlers but are NOT
 * auth-gated (they serve public content or are transactional endpoints).
 */
export const ROBOTS_ONLY_PRIVATE_PATHS = [
	"/api",
	"/auth/callback",
	"/auth/confirm-email",
	"/auth/post-checkout",
	"/auth/select-role",
	"/auth/signout",
	"/auth/update-password",
	"/owner",
	"/_next/data",
	"/monitoring",
	"/stripe",
] as const;
