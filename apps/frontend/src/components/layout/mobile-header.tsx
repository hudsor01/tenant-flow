'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/lazy-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'

// Page title mapping based on routes
const pageTitles: Record<string, string> = {
	'/dashboard': 'Dashboard',
	'/properties': 'Properties',
	'/properties/new': 'Add Property',
	'/tenants': 'Tenants',
	'/tenants/new': 'Add Tenant',
	'/leases': 'Leases',
	'/leases/new': 'New Lease',
	'/maintenance': 'Maintenance',
	'/maintenance/new': 'New Request',
	'/reports': 'Reports',
	'/settings': 'Settings',
	'/profile': 'Profile',
	'/notifications': 'Notifications',
	'/activity': 'Activity'
}

// Breadcrumb configuration
const getBreadcrumbs = (pathname: string) => {
	const segments = pathname.split('/').filter(Boolean)

	if (segments.length <= 1) {
		return []
	}

	const breadcrumbs = []
	let currentPath = ''

	for (let i = 0; i < segments.length - 1; i++) {
		currentPath += '/' + segments[i]
		const segment = segments[i]
		if (!segment) {
			continue
		}
		const title =
			pageTitles[currentPath] ||
			segment.charAt(0).toUpperCase() + segment.slice(1)
		breadcrumbs.push({ title, href: currentPath })
	}

	return breadcrumbs
}

interface MobileHeaderProps {
	onMenuToggle?: () => void
	isMenuOpen?: boolean
	className?: string
}

export function MobileHeader({
	onMenuToggle,
	isMenuOpen = false,
	className
}: MobileHeaderProps) {
	const pathname = usePathname()
	const { data: stats } = useDashboardOverview()
	const [isSearchOpen, setIsSearchOpen] = useState(false)

	// Get current page title
	const currentTitle = pageTitles[pathname] || 'TenantFlow'
	const breadcrumbs = getBreadcrumbs(pathname)

	// Calculate notification count
	const notificationCount = stats?.maintenanceRequests ?? 0

	// Close search on route change
	useEffect(() => {
		setIsSearchOpen(false)
	}, [pathname])

	return (
		<header
			className={cn(
				'sticky top-0 z-40 border-b border-gray-200 bg-white md:hidden',
				'safe-area-pt', // Add safe area padding for notched devices
				className
			)}
		>
			<div className="flex items-center justify-between px-4 py-3">
				{/* Left side: Menu button and title */}
				<div className="flex min-w-0 flex-1 items-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={onMenuToggle}
						className="-ml-2 mr-2 p-2"
						aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					>
						<motion.div
							animate={{ rotate: isMenuOpen ? 180 : 0 }}
							transition={{ duration: 0.2 }}
						>
							{isMenuOpen ? (
								<i className="i-lucide-x inline-block h-5 w-5"  />
							) : (
								<i className="i-lucide-menu inline-block h-5 w-5"  />
							)}
						</motion.div>
					</Button>

					<div className="min-w-0 flex-1">
						{/* Breadcrumbs for nested pages */}
						{breadcrumbs.length > 0 && (
							<div className="mb-1 flex items-center text-sm text-gray-500">
								{breadcrumbs.map((breadcrumb, index) => (
									<div
										key={breadcrumb.href}
										className="flex items-center"
									>
										<span className="max-w-[100px] truncate">
											{breadcrumb.title}
										</span>
										{index < breadcrumbs.length - 1 && (
											<i className="i-lucide-chevron-right inline-block mx-1 h-3 w-3 flex-shrink-0"  />
										)}
									</div>
								))}
								<i className="i-lucide-chevron-right inline-block mx-1 h-3 w-3 flex-shrink-0"  />
							</div>
						)}

						{/* Main page title */}
						<motion.h1
							className="truncate text-lg font-semibold text-gray-900"
							key={currentTitle}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.2 }}
						>
							{currentTitle}
						</motion.h1>
					</div>
				</div>

				{/* Right side: Action buttons */}
				<div className="flex items-center gap-2">
					{/* Search toggle button */}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsSearchOpen(!isSearchOpen)}
						className="p-2"
						aria-label="Toggle search"
					>
						<motion.div
							animate={{ rotate: isSearchOpen ? 180 : 0 }}
							transition={{ duration: 0.2 }}
						>
							{isSearchOpen ? (
								<i className="i-lucide-x inline-block h-5 w-5"  />
							) : (
								<i className="i-lucide-search inline-block h-5 w-5"  />
							)}
						</motion.div>
					</Button>

					{/* Notifications button */}
					<Button
						variant="ghost"
						size="sm"
						className="relative p-2"
						aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}`}
					>
						<i className="i-lucide-bell inline-block h-5 w-5"  />
						{notificationCount > 0 && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute -right-0.5 -top-0.5"
							>
								<Badge
									variant="destructive"
									className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]"
								>
									{notificationCount > 99
										? '99+'
										: notificationCount}
								</Badge>
							</motion.div>
						)}
					</Button>
				</div>
			</div>

			{/* Expandable search bar */}
			<AnimatePresence>
				{isSearchOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="border-t border-gray-100 bg-gray-50"
					>
						<div className="px-4 py-3">
							<div className="relative">
								<i className="i-lucide-search inline-block absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"  />
								<input
									type="text"
									placeholder="Search properties, tenants, leases..."
									className="focus:ring-primary w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2"
									autoFocus
								/>
							</div>

							{/* Quick search suggestions */}
							<div className="mt-3 flex flex-wrap gap-2">
								{[
									'Properties',
									'Tenants',
									'Maintenance',
									'Recent'
								].map(suggestion => (
									<button
										key={suggestion}
										className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50"
									>
										{suggestion}
									</button>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</header>
	)
}

// Add styles for safe area support
export const mobileHeaderStyles = `
  .safe-area-pt {
    padding-top: env(safe-area-inset-top);
  }
  
  @supports (padding-top: env(safe-area-inset-top)) {
    .safe-area-pt {
      padding-top: calc(0rem + env(safe-area-inset-top));
    }
  }
`
