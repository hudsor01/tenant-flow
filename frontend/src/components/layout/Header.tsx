import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import {
	Menu,
	Settings,
	UserCircle,
	LogOut,
	Building,
	BookOpen
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
// import NotificationDropdown from '@/components/notifications/NotificationDropdown';

interface HeaderProps {
	toggleSidebar: () => void
	isSidebarOpen: boolean
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
	const { user, logout } = useAuth()

	const handleLogout = async (): Promise<void> => {
		try {
			await logout()
		} catch (error) {
			logger.error('Logout error', error as Error, { userId: user?.id })
		}
	}

	return (
		<header className="bg-card text-foreground border-border sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 shadow-lg sm:h-20 sm:px-6 lg:px-8">
			<div className="flex items-center">
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleSidebar}
					className="text-muted-foreground hover:text-primary hover:bg-accent mr-2 transition-all duration-300 hover:scale-105 sm:mr-4"
				>
					<Menu className="h-6 w-6" />
				</Button>
				{!isSidebarOpen && (
					<Link
						to="/dashboard"
						className="flex items-center space-x-2"
					>
						<motion.div
							initial={{ scale: 0, rotate: -180 }}
							animate={{ scale: 1, rotate: 0 }}
							transition={{
								type: 'spring',
								stiffness: 260,
								damping: 20
							}}
						>
							<Building className="text-primary h-7 w-7" />
						</motion.div>
						<motion.h1
							className="text-primary font-serif text-lg font-bold sm:text-xl"
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.3 }}
						>
							TenantFlow
						</motion.h1>
					</Link>
				)}
			</div>

			<div className="flex items-center space-x-2 sm:space-x-4">
				{/* Blog link for authenticated users */}
				<Link to="/blog">
					<Button
						variant="ghost"
						size="sm"
						className="hover:bg-primary/10 hover:text-primary hidden font-medium transition-all duration-300 hover:scale-105 sm:flex"
					>
						<div className="flex items-center gap-2">
							<BookOpen className="h-4 w-4" />
							<span>Blog</span>
						</div>
					</Button>
				</Link>

				{/* <NotificationDropdown /> */}
				{/* Temporarily disabled due to excessive API calls */}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							className="rounded-full"
						>
							<div className="border-primary/50 hover:border-primary rounded-full border-2 transition-colors">
								<CurrentUserAvatar />
							</div>
						</motion.button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="bg-popover border-border text-popover-foreground mt-2 w-60 rounded-xl font-sans shadow-2xl"
					>
						<DropdownMenuLabel className="px-3 py-2 font-semibold">
							<div className="flex flex-col space-y-1">
								<p className="text-foreground text-sm leading-none font-medium">
									{user?.name ||
										user?.email?.split('@')[0] ||
										'User'}
								</p>
								<p className="text-muted-foreground text-xs leading-none">
									{user?.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator className="bg-border mx-1" />
						<DropdownMenuItem
							asChild
							className="hover:bg-accent focus:bg-accent m-1 cursor-pointer rounded-md transition-all duration-200"
						>
							<Link
								to="/profile"
								className="flex items-center px-2 py-1.5"
							>
								<div className="flex items-center gap-2">
									<UserCircle className="text-muted-foreground h-4 w-4" />
									<span>Profile</span>
								</div>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem className="hover:bg-accent focus:bg-accent m-1 cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200">
							<div className="flex items-center gap-2">
								<Settings className="text-muted-foreground h-4 w-4" />
								<span>Settings</span>
							</div>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="bg-border mx-1" />
						<DropdownMenuItem
							onClick={handleLogout}
							className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive m-1 cursor-pointer rounded-md px-2 py-1.5 transition-all duration-200"
						>
							<div className="flex items-center gap-2">
								<LogOut className="h-4 w-4" />
								<span>Log out</span>
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	)
}

export default Header
