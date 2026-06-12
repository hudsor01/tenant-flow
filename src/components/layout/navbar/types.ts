import type { ComponentProps } from "react";

export interface NavItem {
	name: string;
	href: string;
	hasDropdown?: boolean;
	dropdownItems?: { name: string; href: string; description?: string }[];
}

export interface NavbarProps extends ComponentProps<"nav"> {
	logo?: string;
	navItems?: readonly NavItem[];
	ctaText?: string;
	ctaHref?: string;
}

// `as const satisfies readonly NavItem[]` — the canonical TS 4.9+ pattern
// for "narrow each `href` to a literal type AND assert assignability to
// the interface". Consumers that derive types from these hrefs (e.g.
// `src/app/__tests__/seo-aria-current-audit.test.ts` deriving a `NavHref`
// literal-union for compile-time EXPECTED_ACTIVE typo checking) require
// the literals to propagate from the source. Verified on TS 6.0: the
// literal narrowing survives `.flatMap` through this declaration.
//
// `readonly NavItem[]`: makes the array immutable. No consumer mutates
// DEFAULT_NAV_ITEMS (audited 2026-05-21); the props that receive it
// declare `navItems: readonly NavItem[]` to match.
export const DEFAULT_NAV_ITEMS = [
	{ name: "Features", href: "/features" },
	{ name: "Pricing", href: "/pricing" },
	{ name: "Compare", href: "/compare" },
	// Blog promoted to the global nav 2026-06-11: the AUDIT-2 deferral
	// ("hide until the first cohort of articles publishes") is satisfied —
	// the content factory has 25+ published articles and adds more daily.
	{ name: "Blog", href: "/blog" },
	{ name: "About", href: "/about" },
	{
		name: "Resources",
		href: "/resources",
		hasDropdown: true,
		dropdownItems: [
			{ name: "Free Resources", href: "/resources" },
			{ name: "Help Center", href: "/help" },
			{ name: "FAQ", href: "/faq" },
			{ name: "Contact", href: "/contact" },
		],
	},
] as const satisfies readonly NavItem[];
