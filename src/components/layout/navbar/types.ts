import type { ComponentProps } from "react";

export interface NavItem {
	name: string;
	href: string;
	hasDropdown?: boolean;
	dropdownItems?: { name: string; href: string; description?: string }[];
}

export interface NavbarProps extends ComponentProps<"nav"> {
	logo?: string;
	navItems?: NavItem[];
	ctaText?: string;
	ctaHref?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
	{ name: "Features", href: "/features" },
	{ name: "Pricing", href: "/pricing" },
	{ name: "Compare", href: "/compare" },
	{ name: "About", href: "/about" },
	{
		name: "Resources",
		href: "/resources",
		hasDropdown: true,
		// Blog deferred from the global nav until the first cohort of
		// articles publishes — AUDIT-2 (2026-05-18) flagged the
		// "More posts coming soon." placeholder leaking through to
		// paid-ad traffic from the nav/footer. The /blog URL remains
		// accessible for direct visits, RSS, and crawlers; it just
		// isn't promoted anywhere until content lands.
		dropdownItems: [
			{ name: "Free Resources", href: "/resources" },
			{ name: "Help Center", href: "/help" },
			{ name: "FAQ", href: "/faq" },
			{ name: "Contact", href: "/contact" },
		],
	},
];
