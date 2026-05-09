// Phase 1 (CRIT-01) follow-up #2: override the root `src/app/loading.tsx`
// for the /blog/[slug] segment.
//
// Why: with the root `loading.tsx` active and `dynamic = 'force-dynamic'` on
// page.tsx, React Suspense streams the global "Loading TenantFlow..." UI
// while `getBlogPost` awaits. By the time `notFound()` fires, the streaming
// HTTP response has already committed status 200 — so the framework swaps
// the body to the not-found UI but the wire-level status stays 200, which
// Google reads as a soft-404.
//
// Returning `null` here disables the loading shell for this segment only.
// The await resolves before any HTML streams; `notFound()` short-circuits
// to a clean HTTP 404. Other routes keep the global loader.
//
// When Phase 6 (BLOG-02) rebuilds this route with `generateStaticParams` +
// per-slug ISR, this file can be deleted (the loading shell becomes safe
// again because the await resolves at build time, not request time).
export default function BlogPostLoading(): null {
	return null
}
