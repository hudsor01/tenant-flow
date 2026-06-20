import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

/**
 * Blog layout. Hosts NuqsAdapter for the only nuqs consumer outside the
 * (owner) segment: <BlogPagination> (uses useQueryState for the `?page` param)
 * on /blog and /blog/category/[category].
 *
 * The adapter is deliberately scoped here instead of the root layout. At the
 * root it wrapped every page and forced static marketing/auth routes to defer
 * their content to the client (rendering behind the "Loading TenantFlow…"
 * Suspense fallback until hydration). Server-rendered blog content is
 * unaffected — NuqsAdapter is a transparent client boundary and the page
 * bodies stream through it as RSC children.
 */
export default function BlogLayout({ children }: { children: ReactNode }) {
	return <NuqsAdapter>{children}</NuqsAdapter>;
}
