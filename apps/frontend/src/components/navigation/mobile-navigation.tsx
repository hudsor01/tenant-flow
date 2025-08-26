/**
 * Mobile Navigation - Client Component
 *
 * Mobile-specific navigation with sheet overlay.
 * Client component for state management and interactions.
 */

'use client'

import * as React from 'react'
import { motion } from '@/lib/lazy-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NavigationLink } from './navigation-link'
import type { NavItem } from './types'

interface MobileNavigationProps {
	items: NavItem[]
	trigger?: React.ReactNode
	title?: string
	className?: string
}

export function MobileNavigation({
	items,
	trigger,
	title = 'Navigation',
	className
}: MobileNavigationProps) {
	const [isOpen, setIsOpen] = React.useState(false)

	const defaultTrigger = (
		<Button variant="ghost" size="icon" className="md:hidden">
			<Menu className="h-5 w-5" />
		</Button>
	)

	return (
		<>
			<div className="md:hidden">
				<button onClick={() => setIsOpen(true)}>
					{trigger || defaultTrigger}
				</button>
			</div>

			{/* Mobile Menu Overlay */}
			{isOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					{/* Backdrop */}
					<div
						className="bg-background/80 absolute inset-0 backdrop-blur-sm"
						onClick={() => setIsOpen(false)}
					/>

					{/* Menu Panel */}
					<motion.div
						initial={{ x: '-100%' }}
						animate={{ x: 0 }}
						exit={{ x: '-100%' }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className={cn(
<<<<<<< HEAD
							'bg-card absolute left-0 top-0 h-full w-80 border-r shadow-lg',
=======
							'bg-card absolute top-0 left-0 h-full w-80 border-r shadow-lg',
>>>>>>> origin/main
							className
						)}
					>
						<div className="flex h-full flex-col">
							{/* Header */}
							<div className="flex items-center justify-between border-b p-4">
								<h2 className="text-lg font-semibold">
									{title}
								</h2>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsOpen(false)}
								>
									<X className="h-5 w-5" />
								</Button>
							</div>

							{/* Navigation Items */}
							<div className="flex-1 overflow-y-auto p-4">
								<div className="flex flex-col gap-4">
									{items.map(item => (
										<NavigationLink
											key={item.id}
											item={item}
											variant="vertical"
										/>
									))}
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</>
	)
}
