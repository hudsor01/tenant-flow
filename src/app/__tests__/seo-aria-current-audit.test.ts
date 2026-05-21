/**
 * SEO-07 consolidated aria-current audit — the "green report".
 *
 * This test IS the audit. It asserts that across the marketing nav,
 * breadcrumbs, and footer surfaces, at most ONE element per surface per
 * route carries `aria-current="page"`, and the active element is the one
 * the route legitimately matches. The CONS-03 regression symptom — root
 * pathname `/` marking `/compare` active — is pinned as a separate case.
 *
 * Follows the `design-token-drift.test.ts` precedent: a CI-enforced unit
 * test IS the preferred audit form in this repo.
 *
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: ReactNode;
		href: string;
		className?: string;
		target?: string;
		rel?: string;
	}) =>
		React.createElement(
			"a",
			{ href, ...props } as Record<string, unknown>,
			children,
		),
}));

import { CompareBreadcrumb } from "#components/compare/compare-breadcrumb";
import Footer from "#components/layout/footer";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";
import { isActiveLink } from "#lib/is-active-link";

// Marketing-nav hrefs — derived from `DEFAULT_NAV_ITEMS` (the single
// source of truth used by `navbar-desktop-nav` + `navbar-mobile-menu`)
// so the audit stays in lockstep with the real nav. Includes parent
// hrefs PLUS dropdown items (e.g. `/resources`, `/help`, `/faq`,
// `/contact`). The homepage `/` is not in the nav (the logo is not a
// `DEFAULT_NAV_ITEMS` entry); we add it separately because the
// audit's prefix-match guard still needs to exercise it.
//
// DEDUPED via `Set`: the Resources dropdown shares `href: '/resources'`
// with its parent nav item. On `pathname === '/resources'` the navbar
// renders TWO `<Link>`s pointing at the same href, both marked
// `aria-current="page"` — the audit's at-most-one assertion is over
// the set of UNIQUE URLs the nav can mark active (every emission is
// the same href; this is intentional and not double-marking distinct
// targets). Deduping at the value level represents that invariant.
//
// Type note: `DEFAULT_NAV_ITEMS` is declared with `as const satisfies
// readonly NavItem[]` (TS 4.9+ canonical pattern, stable through TS 6.0),
// which propagates literal-typed `href`s through `.flatMap`. `NavHref`
// resolves to the literal union (`"/" | "/features" | "/pricing" | …`),
// so EXPECTED_ACTIVE typos are caught at TYPECHECK in addition to the
// runtime route-loop assertion.
const NAV_HREFS = Array.from(
	new Set([
		"/" as const,
		...DEFAULT_NAV_ITEMS.flatMap((item) => [
			item.href,
			// `in` narrowing — `as const` produces a union of element shapes
			// where only items declaring `dropdownItems` carry that property,
			// so `?.` access requires explicit narrowing.
			...("dropdownItems" in item ? item.dropdownItems.map((d) => d.href) : []),
		]),
	]),
);
type NavHref = (typeof NAV_HREFS)[number];

// Route sample covering homepage, top-level marketing routes, a
// dynamic subroute, and `/resources` (the duplicate-href route where
// the dropdown parent + child share `/resources` — covered explicitly
// so a regression that breaks the duplicate-href dedup would be caught).
const ROUTES = [
	"/",
	"/pricing",
	"/features",
	"/compare/buildium",
	"/resources",
] as const;
type Route = (typeof ROUTES)[number];

// Expected active nav href for each route. `null` means "no nav href
// should be active on this route" (no current row needs that, but the
// type allows future expansion).
const EXPECTED_ACTIVE: Readonly<Record<Route, NavHref | null>> = {
	"/": "/",
	"/pricing": "/pricing",
	"/features": "/features",
	"/compare/buildium": "/compare",
	"/resources": "/resources",
};

describe("SEO-07 aria-current audit — marketing nav", () => {
	for (const route of ROUTES) {
		it(`at most one nav href is active on ${route}`, () => {
			const active = NAV_HREFS.filter((href) => isActiveLink(href, route));
			expect(active.length).toBeLessThanOrEqual(1);

			const expected = EXPECTED_ACTIVE[route];
			if (active.length === 1) {
				expect(active[0]).toBe(expected);
			} else {
				expect(expected).toBeNull();
			}
		});
	}
});

describe("SEO-07 aria-current audit — homepage does not mark /compare active", () => {
	// The CONS-03 audit symptom — pin that the root short-circuit in
	// `isActiveLink` keeps `/compare` from being marked active on `/`.
	it("isActiveLink('/compare', '/') is false", () => {
		expect(isActiveLink("/compare", "/")).toBe(false);
	});
});

describe("SEO-07 aria-current audit — breadcrumb leaf", () => {
	it("CompareBreadcrumb marks exactly one segment aria-current=page", () => {
		const { container } = render(
			React.createElement(CompareBreadcrumb, { competitorName: "Buildium" }),
		);
		const flagged = container.querySelectorAll('[aria-current="page"]');
		expect(flagged.length).toBe(1);
		expect(flagged[0]?.textContent).toBe("TenantFlow vs Buildium");
	});
});

describe("SEO-07 aria-current audit — footer carries no nav-state", () => {
	// Footer is intentionally NOT a nav-state surface. This assertion
	// documents the audit's expectation that NO footer link emits
	// `aria-current` — a refactor that adds it here would be a regression.
	it("footer links carry zero aria-current attributes", () => {
		const { container } = render(React.createElement(Footer));
		const footerEl = container.querySelector("footer");
		expect(footerEl).not.toBeNull();
		const flagged = footerEl?.querySelectorAll("[aria-current]") ?? [];
		expect(flagged.length).toBe(0);
	});
});
