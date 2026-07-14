import type { ReactNode } from "react";

// CISEC-02: the proxy serves every /auth/* route with a per-request nonce CSP
// (`script-src 'self' 'nonce-…' 'strict-dynamic'`). Next only injects that
// nonce into the hydration scripts when the route renders per-request, so
// these routes MUST be dynamic — otherwise their statically-baked, un-nonced
// scripts are all CSP-blocked and the page never hydrates. A `useSearchParams`
// CSR bailout is NOT sufficient (the route can still be statically prerendered
// with the client part deferred), so force it explicitly here. This dynamic
// render used to be provided incidentally by the root NuqsAdapter, scoped out
// in #858. Dynamic SSR still emits full HTML, so pages stay usable without JS.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
	return <main id="main-content">{children}</main>;
}
