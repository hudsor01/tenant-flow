/**
 * Source of truth for route prefixes that require authentication.
 * Imported by proxy.ts (middleware gate) and robots.ts (disallow list).
 * Never edit this file without updating both consumers.
 */
export const PRIVATE_ROUTE_PREFIXES = [
	"/admin",
	"/analytics",
	"/billing",
	"/dashboard",
	"/documents",
	"/financials",
	"/inspections",
	"/leases",
	"/maintenance",
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
