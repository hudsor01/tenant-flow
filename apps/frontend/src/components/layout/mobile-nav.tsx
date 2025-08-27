'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from '@/lib/lazy-motion'
import { Badge } from '@/components/ui/badge'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'

const navigationItems = [
	{
		id: 'dashboard',
		name: 'Dashboard',
		href: '/dashboard',
		icon: Home,
		shortName: 'Home'
	},
	{
		id: 'properties',
		name: 'Properties',
		href: '/properties',
		icon: Building,
		shortName: 'Props',
		badgeKey: 'properties.totalProperties'
	},
	{
		id: 'add',
		name: 'Add',
		href: '/properties/new',
		icon: Plus,
		shortName: 'Add',
		isFab: true
	},
	{
		id: 'reports',
		name: 'Reports',
		href: '/reports',
		icon: BarChart3,
		shortName: 'Reports'
	},
	{
		id: 'profile',
		name: 'Profile',
		href: '/profile',
		icon: User,
		shortName: 'Profile'
	}
]

interface MobileNavProps {
	className?: string
}

export function MobileNav({ className }: MobileNavProps) {
	const pathname = usePathname()
	const { data: stats } = useDashboardOverview()

	const getBadgeValue = (badgeKey?: string) => {
		if (!badgeKey || !stats) {
			return null
		}

		const keys = badgeKey.split('.')
		let value: unknown = stats
		for (const key of keys) {
			if (value && typeof value === 'object' && key in value) {
				value = (value as Record<string, unknown>)[key]
			} else {
				value = undefined
				break
			}
		}
		return typeof value === 'number' && value > 0 ? value : null
	}

	return (
		<nav
			className={cn(
				'fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden',
				'safe-area-pb', // Add safe area padding for devices with home indicators
				className
			)}
		>
			<div className="flex items-center justify-around px-2 py-2">
				{navigationItems.map(item => {
					const Icon = item.icon
					const isActive =
						pathname === item.href ||
						(pathname.startsWith(item.href + '/') && !item.isFab)
					const badgeValue = getBadgeValue(item.badgeKey)

					if (item.isFab) {
						// Floating Action Button (Add)
						return (
							<Link
								key={item.id}
								href={item.href}
								className="relative"
							>
								<motion.div
									className={cn(
										'flex h-14 w-14 items-center justify-center rounded-full',
										'bg-primary text-white shadow-lg',
										'transform transition-all duration-200 ease-out',
										'hover:scale-105 hover:bg-blue-700 active:scale-95'
									)}
									whileTap={{ scale: 0.9 }}
									whileHover={{ scale: 1.05 }}
									animate={{ y: isActive ? -2 : 0 }}
									transition={{
										type: 'spring',
										stiffness: 300,
										damping: 25
									}}
								>
									<Icon className="h-6 w-6" />
								</motion.div>

								{/* Ripple effect for FAB */}
								{isActive && (
									<motion.div
										className="bg-primary absolute inset-0 rounded-full opacity-20"
										initial={{ scale: 0 }}
										animate={{ scale: 1.2 }}
										transition={{
											duration: 0.6,
											repeat: Infinity,
											repeatType: 'reverse'
										}}
									/>
								)}
							</Link>
						)
					}

					// Regular navigation items
					return (
						<Link
							key={item.id}
							href={item.href}
							className={cn(
								'relative flex min-w-0 flex-col items-center justify-center px-2 py-2',
								'text-xs font-medium transition-colors duration-200',
								'rounded-lg hover:bg-gray-50',
								isActive
									? 'text-primary'
									: 'text-gray-600 hover:text-gray-900'
							)}
						>
							<motion.div
								className="relative flex items-center justify-center"
								animate={{
									y: isActive ? -1 : 0,
									scale: isActive ? 1.1 : 1
								}}
								transition={{
									type: 'spring',
									stiffness: 300,
									damping: 25
								}}
							>
								<Icon
									className={cn(
										'mb-1 h-5 w-5 transition-colors duration-200',
										isActive
											? 'text-primary'
											: 'text-gray-500'
									)}
								/>

								{/* Badge for item counts */}
								{badgeValue && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="absolute -right-1 -top-1"
									>
										<Badge
											variant="secondary"
											className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700"
										>
											{badgeValue > 99
												? '99+'
												: badgeValue}
										</Badge>
									</motion.div>
								)}
							</motion.div>

							{/* Item label */}
							<span
								className={cn(
									'max-w-full truncate text-[10px] leading-none transition-colors duration-200',
									isActive
										? 'text-primary font-semibold'
										: 'text-gray-500'
								)}
							>
								{item.shortName}
							</span>

							{/* Active indicator */}
							{isActive && (
								<motion.div
									className="bg-primary absolute left-1/2 top-0 h-1 w-1 rounded-full"
									initial={{ scale: 0, x: '-50%' }}
									animate={{ scale: 1 }}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 25
									}}
									layoutId="mobile-nav-indicator"
								/>
							)}
						</Link>
					)
				})}
			</div>

			{/* Background blur effect for better readability */}
			<div className="absolute inset-0 -z-10 border-t border-gray-200 bg-white/80 backdrop-blur-md" />
		</nav>
	)
}

// Add styles for safe area support
export const mobileNavStyles = `
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .safe-area-pb {
      padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    }
  }
`
