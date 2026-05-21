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
	{ name: "About", href: "/about" },
	{
		name: "Resources",
		href: "/resources",
		hasDropdown: true,
		// Blog deferred from the global nav until the first cohort of
		// articles publishes (AUDIT-2, 2026-05-18). The empty-state
		// placeholder was leaking through to paid-ad traffic via this
		// dropdown + the footer. The /blog URL remains accessible for
		// direct visits, RSS, and crawlers; it just isn't promoted
		// anywhere in chrome until content lands.
		dropdownItems: [
			{ name: "Free Resources", href: "/resources" },
			{ name: "Help Center", href: "/help" },
			{ name: "FAQ", href: "/faq" },
			{ name: "Contact", href: "/contact" },
		],
	},
] as const satisfies readonly NavItem[];
