import { createPageMetadata } from "#lib/seo/page-metadata";

// CISEC-02: the proxy serves /login with a per-request nonce CSP
// (`script-src 'self' 'nonce-…' 'strict-dynamic'`). Next only injects that
// nonce into the hydration scripts when the route is rendered per-request, so
// /login MUST be dynamic — otherwise the statically-baked, un-nonced scripts
// are all CSP-blocked and the page never hydrates. (This dynamic render used
// to be provided incidentally by the root NuqsAdapter's useSearchParams, which
// was scoped out in #858; make it explicit.) Dynamic SSR still emits the full
// form HTML, so the page stays usable even before/without JS.
export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
	title: "Log In to Your Property Management Dashboard",
	description:
		"Sign in to TenantFlow to manage rental properties, leases, maintenance requests, and financial reports. Secure landlord login.",
	path: "/login",
});

export default function LoginLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
