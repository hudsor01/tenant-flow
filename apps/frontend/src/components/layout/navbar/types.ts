export interface NavItem {
	name: string
	href: string
	hasDropdown?: boolean
	dropdownItems?: { name: string; href: string; description?: string }[]
}

export interface NavbarProps extends React.ComponentProps<'nav'> {
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

export const AUTH_NAV_ITEMS: NavItem[] = [
	{ name: 'Dashboard', href: '/' },
	{ name: 'Properties', href: '/properties' },
	{ name: 'Analytics', href: '/analytics' },
	{
		name: 'More',
		href: '#',
		hasDropdown: true,
		dropdownItems: [
			{ name: 'Leases', href: '/leases' },
			{ name: 'Maintenance', href: '/maintenance' },
			{ name: 'Reports', href: '/reports' },
			{ name: 'Settings', href: '/settings' }
		]
	}
]
