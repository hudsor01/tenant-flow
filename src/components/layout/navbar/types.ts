import type { ComponentProps } from 'react'

export interface NavItem {
	name: string
	href: string
	hasDropdown?: boolean
	dropdownItems?: { name: string; href: string; description?: string }[]
}

export interface NavbarProps extends ComponentProps<'nav'> {
	logo?: string
	navItems?: NavItem[]
	ctaText?: string
	ctaHref?: string
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
	{ name: 'Features', href: '/features' },
	{ name: 'Pricing', href: '/pricing' },
	{ name: 'About', href: '/about' },
	{
		name: 'Resources',
		href: '#',
		hasDropdown: true,
		dropdownItems: [
			{ name: 'Help Center', href: '/help' },
			{ name: 'Blog', href: '/blog' },
			{ name: 'FAQ', href: '/faq' },
			{ name: 'Contact', href: '/contact' }
		]
	}
]

