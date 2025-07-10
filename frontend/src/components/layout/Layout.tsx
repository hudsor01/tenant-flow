import React, { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Navigation } from '@/components/layout/Navigation'
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
		<div className="bg-background text-foreground flex h-screen flex-col">
			{/* Navigation */}
			<Navigation 
				variant="authenticated" 
				onSidebarToggle={toggleSidebar}
				isSidebarOpen={isSidebarOpen}
			/>
			
			<div className="flex flex-1 overflow-hidden">
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
					<main className="bg-secondary/20 flex-1 overflow-y-auto p-4 shadow-inner md:p-6 lg:p-8">
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}

export default Layout
