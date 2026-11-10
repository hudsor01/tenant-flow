/**
 * Shared active-link predicate for navigation surfaces.
 *
 * Used by:
 * - `src/components/layout/navbar/navbar-desktop-nav.tsx` (marketing desktop nav)
 * - `src/components/layout/navbar/navbar-mobile-menu.tsx` (marketing mobile sheet)
 *
 * Drives both visual active-state classes AND, through `navAriaCurrent`, the
 * `aria-current` attribute. The trailing `/` in the `startsWith` check is critical — without
 * it, `/blogger` would false-positive against `/blog`. The `href === '/'`
 * short-circuit is also critical — without it, every route would match root.
 */
export function isActiveLink(href: string, pathname: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The `aria-current` value of a nav link its surface's active predicate
 * matched (`active`). Only the link that IS the current page is `"page"`; a
 * link the predicate matched by prefix is an ancestor section of the current
 * page and is `"true"` (the current item of the set, not the page itself).
 * Links that are not active carry no attribute.
 *
 * Used by the marketing navbars (with `isActiveLink`) and the owner sidebar
 * (`src/components/shell/main-nav.tsx`, with `isNavPathActive`).
 */
export function navAriaCurrent(
	href: string,
	pathname: string,
	active: boolean,
): "page" | "true" | undefined {
	if (!active) return undefined;
	return pathname === href ? "page" : "true";
}
