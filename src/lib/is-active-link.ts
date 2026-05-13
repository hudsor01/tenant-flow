/**
 * Shared active-link predicate for navigation surfaces.
 *
 * Used by:
 * - `src/components/layout/navbar/navbar-desktop-nav.tsx` (marketing desktop nav)
 * - `src/components/layout/navbar/navbar-mobile-menu.tsx` (marketing mobile sheet)
 *
 * Drives both visual active-state classes AND the `aria-current="page"`
 * attribute. The trailing `/` in the `startsWith` check is critical — without
 * it, `/blogger` would false-positive against `/blog`. The `href === '/'`
 * short-circuit is also critical — without it, every route would match root.
 */
export function isActiveLink(href: string, pathname: string): boolean {
	if (href === '/') return pathname === '/'
	return pathname === href || pathname.startsWith(`${href}/`)
}
