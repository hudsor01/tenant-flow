'use client'

import { CreditCard, Home, Settings, Wrench, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '#lib/utils'

/**
 * Navigation items for the tenant mobile bottom navigation
 */
const navItems = [
	{
		title: 'Home',
		href: '/tenant',
		icon: Home,
		matchPaths: ['/tenant']
	},
	{
		title: 'Payments',
		href: '/tenant/payments',
		icon: CreditCard,
		matchPaths: ['/tenant/payments']
	},
	{
		title: 'Maintenance',
		href: '/tenant/maintenance',
		icon: Wrench,
		matchPaths: ['/tenant/maintenance']
	},
	{
		title: 'Settings',
		href: '/tenant/settings',
		icon: Settings,
		matchPaths: ['/tenant/settings']
	}
]

interface TenantMobileNavProps {
	/** Current path for active state highlighting */
	currentPath: string
	/** Whether the current page is a sub-page (shows back button) */
	isSubPage?: boolean
}

/**
 * Determines if a nav item should be active based on the current path
 */
function isNavItemActive(
	currentPath: string,
	matchPaths: string[],
	isDefaultItem: boolean
): boolean {
	// Exact match for home
	if (matchPaths.includes('/tenant') && currentPath === '/tenant') {
		return true
	}

	// For other paths, check if current path starts with any match path
	const hasMatch = matchPaths.some(matchPath => {
		if (matchPath === '/tenant') return false
		return currentPath.startsWith(matchPath)
	})

	if (hasMatch) return true

	// If this is the default item (Home) and no other nav item matches, activate Home
	// This handles paths like /tenant/lease, /tenant/profile, /tenant/documents
	if (isDefaultItem) {
		const otherNavMatches = navItems.some(
			item =>
				!item.matchPaths.includes('/tenant') &&
				item.matchPaths.some(mp => currentPath.startsWith(mp))
		)
		return !otherNavMatches
	}

	return false
}

/**
 * TenantMobileNav Component
 *
 * A mobile-optimized bottom navigation bar for the tenant portal.
 * Provides touch-friendly navigation with 44px minimum touch targets.
 *
 * Requirements:
 * - 6.1: Consistent bottom navigation bar across all views
 * - 6.2: Clear back navigation option on sub-pages
 * - 6.3: Highlight current section in navigation
 * - 2.1: 44px minimum touch targets for mobile
 */
export function TenantMobileNav({
	currentPath,
	isSubPage = false
}: TenantMobileNavProps) {
	const router = useRouter()

	const handleBack = () => {
		router.back()
	}

	return (
		<nav
			aria-label="Mobile navigation"
			className={cn(
				'fixed bottom-0 left-0 right-0 z-50',
				'border-t border-border bg-background',
				'safe-area-inset-bottom'
			)}
		>
			<div className="flex items-center justify-around px-2 py-1">
				{/* Back button for sub-pages */}
				{isSubPage && (
					<button
						type="button"
						onClick={handleBack}
						aria-label="Back"
						className={cn(
							'flex min-h-11 min-w-11 flex-col items-center justify-center',
							'rounded-lg p-2',
							'text-muted-foreground',
							'transition-colors hover:text-foreground'
						)}
					>
						<ChevronLeft className="size-5" />
						<span className="mt-0.5 text-xs">Back</span>
					</button>
				)}

				{/* Navigation items */}
				{navItems.map((item, index) => {
					const isDefaultItem = index === 0 // Home is the default
					const isActive = isNavItemActive(
						currentPath,
						item.matchPaths,
						isDefaultItem
					)
					const Icon = item.icon

					return (
						<Link
							key={item.href}
							href={item.href}
							aria-label={item.title}
							aria-current={isActive ? 'page' : undefined}
							data-active={isActive}
							className={cn(
								'flex min-h-11 min-w-11 flex-col items-center justify-center',
								'rounded-lg p-2',
								'transition-colors',
								isActive
									? 'text-primary'
									: 'text-muted-foreground hover:text-foreground'
							)}
						>
							<Icon className="size-5" />
							<span className="mt-0.5 text-xs font-medium">{item.title}</span>
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
