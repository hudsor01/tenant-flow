'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERACTION_ANIMATIONS } from '@/lib/animations/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar-provider'
// Inline animation configs (removed lib/animations dependency)
const springConfig = {
	snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
	gentle: { type: 'spring' as const, stiffness: 100, damping: 20 },
	bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 }
}

// Navigation items configuration
interface NavItem {
	title: string
	url: string
	icon: React.ReactNode
	isActive?: boolean
	badge?: string | number
	items?: NavItem[]
	hasActivity?: boolean
	activityCount?: number
	description?: string
	shortcut?: string
}

// Individual Navigation Item with collapsible sub-items
interface SidebarNavItemProps {
	item: NavItem
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
	const { collapsed } = useSidebar()
	const [isOpen, setIsOpen] = React.useState(() => {
		// Load persistent state from localStorage
		if (typeof window !== 'undefined' && item.items?.length) {
			const stored = localStorage.getItem(
				`sidebar-nav-${item.title.toLowerCase()}`
			)
			return stored ? JSON.parse(stored) : false
		}
		return false
	})
	const hasSubItems = item.items && item.items.length > 0

	// Persist collapsed state
	React.useEffect(() => {
		if (hasSubItems && typeof window !== 'undefined') {
			localStorage.setItem(
				`sidebar-nav-${item.title.toLowerCase()}`,
				JSON.stringify(isOpen)
			)
		}
	}, [isOpen, hasSubItems, item.title])

	const NavButton = ({
		children,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
		children: React.ReactNode
	}) => {
		const buttonContent = (
			<motion.div
				whileHover={{ scale: collapsed ? 1.05 : 1.02 }}
				whileTap={{ scale: 0.98 }}
				transition={springConfig.snappy}
			>
				<Button
					variant="ghost"
					className={cn(
						'hover:bg-sidebar-accent text-sidebar-foreground group relative h-10 w-full justify-start gap-3 overflow-hidden px-3 text-sm font-medium transition-all duration-200',
						item.isActive &&
							'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-accent/20 border shadow-sm',
						collapsed && 'h-12 w-12 justify-center rounded-xl px-2',
						item.hasActivity && 'animate-pulse'
					)}
					{...props}
				>
					{/* Subtle background glow for active items */}
					{item.isActive && (
						<motion.div
							className="from-primary/5 to-primary/10 absolute inset-0 rounded-lg bg-gradient-to-r"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.3 }}
						/>
					)}

					{/* Activity indicator */}
					{item.hasActivity && (
						<motion.div
							className="border-sidebar absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 bg-red-5"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={springConfig.bouncy}
						>
							<motion.div
								className="absolute inset-0 rounded-full bg-red-5"
								animate={{ scale: [1, 1.2, 1] }}
								transition={{ duration: 2, repeat: Infinity }}
							/>
						</motion.div>
					)}

					<div className="relative z-10 flex w-full items-center gap-3">
						{children}
					</div>
				</Button>
			</motion.div>
		)

		// Wrap with tooltip for collapsed state
		if (collapsed && item.title) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
						<TooltipContent
							side="right"
							className="flex max-w-48 flex-col gap-1"
						>
							<div className="font-semibold">{item.title}</div>
							{item.description && (
								<div className="text-muted-foreground text-xs">
									{item.description}
								</div>
							)}
							{item.badge && (
								<div className="text-muted-foreground text-xs">
									{typeof item.badge === 'number'
										? `${item.badge} items`
										: item.badge}
								</div>
							)}
							{item.shortcut && (
								<div className="text-muted-foreground mt-1 border-t pt-1 text-xs">
									Press {item.shortcut}
								</div>
							)}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)
		}

		return buttonContent
	}

	if (hasSubItems && !collapsed) {
		return (
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger asChild>
					<NavButton>
						<div className="flex flex-1 items-center gap-3">
							<div className="relative">
								{item.icon}
								{item.hasActivity && (
									<Activity className="absolute -right-1 -top-1 h-2 w-2 text-red-500" />
								)}
							</div>
							<span className="flex-1 text-left font-medium">
								{item.title}
							</span>

							<div className="flex items-center gap-2">
								{item.activityCount &&
									item.activityCount > 0 && (
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="h-2 w-2 rounded-full bg-red-5"
										/>
									)}
								{item.badge && (
									<Badge
										variant="secondary"
										className="h-5 px-2 text-xs font-medium"
									>
										{item.badge}
									</Badge>
								)}
							</div>
						</div>

						<motion.div
							animate={{ rotate: isOpen ? 90 : 0 }}
							transition={springConfig.snappy}
						>
							<ChevronRight className="text-sidebar-foreground/60 h-4 w-4" />
						</motion.div>
					</NavButton>
				</CollapsibleTrigger>

				<AnimatePresence>
					{isOpen && (
						<CollapsibleContent forceMount>
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={springConfig.gentle}
								className="overflow-hidden"
							>
								<div className="border-sidebar-border/30 ml-5 space-y-1 border-l py-2 pl-8 pr-3">
									{item.items?.map((subItem, index) => (
										<motion.div
											key={index}
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												...springConfig.gentle,
												delay: index * 0.05
											}}
										>
											<SidebarNavItem
												item={{
													...subItem,
													icon: (
														<div className="text-sidebar-foreground/70 flex h-4 w-4 items-center justify-center">
															{subItem.icon}
														</div>
													)
												}}
											/>
										</motion.div>
									))}
								</div>
							</motion.div>
						</CollapsibleContent>
					)}
				</AnimatePresence>
			</Collapsible>
		)
	}

	return (
		<NavButton>
			<div className="relative flex w-full items-center gap-3">
				<div className="relative flex-shrink-0">
					{item.icon}
					{item.hasActivity && (
						<motion.div
							className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-5"
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={springConfig.bouncy}
						/>
					)}
				</div>

				{!collapsed && (
					<AnimatePresence>
						<motion.div
							className="flex min-w-0 flex-1 items-center justify-between"
							initial={{ opacity: 0, width: 0 }}
							animate={{ opacity: 1, width: 'auto' }}
							exit={{ opacity: 0, width: 0 }}
							transition={springConfig.gentle}
						>
							<span className="flex-1 truncate text-left font-medium">
								{item.title}
							</span>

							<div className="flex flex-shrink-0 items-center gap-2">
								{item.activityCount &&
									item.activityCount > 0 && (
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="h-2 w-2 rounded-full bg-red-5"
										/>
									)}
								{item.badge && (
									<Badge
										variant="secondary"
										className="h-5 px-2 text-xs font-medium"
									>
										{item.badge}
									</Badge>
								)}
							</div>
						</motion.div>
					</AnimatePresence>
				)}
			</div>
		</NavButton>
	)
}

export type { NavItem }
