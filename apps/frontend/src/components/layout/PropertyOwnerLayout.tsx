import React, { type ReactNode, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import Sidebar from '@/components/layout/Sidebar'

// Extract animation configs to prevent recreation
const sidebarAnimationConfig = {
	initial: { x: '-100%', width: 0 },
	animate: { x: 0, width: '280px' },
	exit: {
		x: '-100%',
		width: 0,
		transition: { duration: 0.3, ease: 'easeInOut' }
	},
	transition: { duration: 0.4, ease: 'easeInOut' }
} as const

interface PropertyOwnerLayoutProps {
	children: ReactNode
	showBreadcrumbs?: boolean
	className?: string
}

/**
 * Layout for property owner dashboard pages
 * Provides consistent navigation, breadcrumb, and sidebar for property management
 */
export function PropertyOwnerLayout({
	children,
	showBreadcrumbs = true,
	className = ''
}: PropertyOwnerLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)

	const toggleSidebar = useCallback((): void => {
		setIsSidebarOpen(prev => !prev)
	}, [])

	return (
		<div
			className={`bg-background text-foreground flex h-screen flex-col ${className}`}
		>
			<Navigation
				context="authenticated"
				onSidebarToggle={toggleSidebar}
			/>

			<div className="flex flex-1 overflow-hidden">
				<AnimatePresence>
					{isSidebarOpen && (
						<motion.div
							{...sidebarAnimationConfig}
							className="overflow-hidden"
						>
							<Sidebar
								isOpen={isSidebarOpen}
								toggleSidebar={toggleSidebar}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex flex-1 flex-col overflow-hidden">
					{showBreadcrumbs && (
						<Breadcrumbs items={[]} showHome={true} />
					)}

					<main className="bg-secondary/20 flex-1 overflow-y-auto p-4 shadow-inner md:p-6 lg:p-8">
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}
