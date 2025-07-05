import React, { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { motion, AnimatePresence } from 'framer-motion'

interface LayoutProps {
	children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)

	const toggleSidebar = (): void => {
		setIsSidebarOpen(!isSidebarOpen)
	}

	return (
		<div className="bg-background text-foreground flex h-screen">
			<AnimatePresence>
				{isSidebarOpen && (
					<motion.div
						initial={{ x: '-100%', width: 0 }}
						animate={{ x: 0, width: '280px' }}
						exit={{
							x: '-100%',
							width: 0,
							transition: { duration: 0.3, ease: 'easeInOut' }
						}}
						transition={{ duration: 0.4, ease: 'easeInOut' }}
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
				<Header
					toggleSidebar={toggleSidebar}
					isSidebarOpen={isSidebarOpen}
				/>
				<main className="bg-secondary/20 dark:bg-background flex-1 overflow-y-auto rounded-tl-2xl p-4 shadow-inner md:p-6 lg:p-8">
					{children}
				</main>
			</div>
		</div>
	)
}

export default Layout
