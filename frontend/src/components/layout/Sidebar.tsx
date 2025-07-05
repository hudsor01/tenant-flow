import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { LucideIcon } from 'lucide-react'
import {
	LayoutDashboard,
	Building2,
	Users,
	CreditCard,
	Wrench,
	BarChart3,
	Settings as SettingsIcon,
	UserCircle,
	LogOut,
	ChevronDown,
	DollarSign,
	FileText,
	Zap
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
	name: string
	icon: LucideIcon
	path: string
}

interface SidebarProps {
	isOpen: boolean
	toggleSidebar?: () => void
}

interface NavItemComponentProps {
	item: NavItem
	index: number
	isOpen: boolean
}

const navItems: NavItem[] = [
	{ name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
	{ name: 'Properties', icon: Building2, path: '/properties' },
	{ name: 'Tenants', icon: Users, path: '/tenants' },
	{ name: 'Leases', icon: FileText, path: '/leases' },
	{ name: 'Rent', icon: CreditCard, path: '/rent' },
	{ name: 'Finances', icon: DollarSign, path: '/payments' },
	{ name: 'Maintenance', icon: Wrench, path: '/maintenance' },
	{ name: 'Automation', icon: Zap, path: '/automation' },
	{ name: 'Reports', icon: BarChart3, path: '/reports' }
]

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
	const { user, signOut } = useAuthStore()

	const handleSignOut = async (): Promise<void> => {
		try {
			await signOut()
		} catch (error) {
			console.error('Error signing out:', error)
		}
	}

	const NavItemComponent: React.FC<NavItemComponentProps> = ({
		item,
		index,
		isOpen
	}) => (
		<motion.li
			initial={{ opacity: 0, x: -30 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{
				duration: 0.3,
				delay: 0.3 + index * 0.05,
				ease: 'easeOut'
			}}
		>
			<NavLink
				to={item.path}
				data-testid={`nav-${item.name.toLowerCase()}`}
				className={({ isActive }) =>
					cn(
						'group flex items-center rounded-lg px-4 py-3.5 font-sans text-sm font-medium transition-all duration-200 ease-in-out',
						'hover:bg-primary/10 hover:text-primary',
						isActive
							? 'bg-primary/15 text-primary font-semibold shadow-inner'
							: 'text-muted-foreground hover:text-foreground'
					)
				}
			>
				<item.icon
					className={cn(
						'mr-3.5 h-5 w-5 transition-colors',
						isOpen ? 'opacity-100' : 'opacity-0'
					)}
				/>
				<span
					className={cn(
						'transition-opacity duration-200',
						isOpen ? 'opacity-100' : 'opacity-0'
					)}
				>
					{item.name}
				</span>
			</NavLink>
		</motion.li>
	)

	return (
		<div
			className={cn(
				'bg-card dark:bg-card border-border flex h-full flex-col border-r shadow-2xl transition-all duration-300 ease-in-out',
				isOpen ? 'w-72 p-5' : 'w-0 overflow-hidden p-0'
			)}
		>
			{isOpen && (
				<>
					<motion.div
						className="mb-10 flex items-center justify-between"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.1,
							ease: 'easeOut'
						}}
					>
						<Link
							to="/dashboard"
							className="group flex items-center space-x-2.5"
						>
							<motion.div
								initial={{ scale: 0.5, rotate: -90 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{
									type: 'spring',
									stiffness: 300,
									damping: 15,
									delay: 0.2
								}}
								className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-1.5 transition-colors"
							>
								<Building2 className="text-primary h-7 w-7" />
							</motion.div>
							<motion.h1
								className="text-primary group-hover:text-primary/80 font-serif text-2xl font-bold transition-colors"
								initial={{ opacity: 0, x: -20 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{
									duration: 0.4,
									delay: 0.3,
									ease: 'easeOut'
								}}
							>
								TenantFlow
							</motion.h1>
						</Link>
					</motion.div>

					<nav data-testid="main-nav" className="flex-grow">
						<ul className="space-y-2.5">
							{navItems.map((item, index) => (
								<NavItemComponent
									key={item.name}
									item={item}
									index={index}
									isOpen={isOpen}
								/>
							))}
						</ul>
					</nav>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.6 }}
					>
						<Separator className="bg-border/70 my-5" />

						<ul className="space-y-2.5">
							<motion.li
								initial={{ opacity: 0, x: -30 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{
									duration: 0.3,
									delay: 0.7,
									ease: 'easeOut'
								}}
							>
								<NavLink
									to="/settings"
									className={({ isActive }) =>
										cn(
											'group flex items-center rounded-lg px-4 py-3.5 font-sans text-sm font-medium transition-all duration-200 ease-in-out',
											'hover:bg-primary/10 hover:text-primary',
											isActive
												? 'bg-primary/15 text-primary font-semibold shadow-inner'
												: 'text-muted-foreground hover:text-foreground'
										)
									}
								>
									<SettingsIcon className="mr-3.5 h-5 w-5" />
									<span>Settings</span>
								</NavLink>
							</motion.li>
						</ul>

						<Separator className="bg-border/70 my-5" />

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<motion.div
									data-testid="user-menu"
									className="hover:bg-secondary group flex cursor-pointer items-center rounded-lg p-3 transition-colors duration-200"
									whileHover={{
										scale: 1.02,
										transition: { duration: 0.2 }
									}}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: 0.8,
										ease: 'easeOut'
									}}
								>
									<Avatar className="border-primary/30 group-hover:border-primary/70 mr-3 h-10 w-10 border-2 transition-colors">
										<AvatarImage
											src={user?.avatarUrl || undefined}
											alt="User Avatar"
										/>
										<AvatarFallback>
											{user?.name?.[0] ||
												user?.email?.[0]?.toUpperCase() ||
												'U'}
										</AvatarFallback>
									</Avatar>
									<div className="flex-grow overflow-hidden">
										<p className="text-foreground truncate font-sans text-sm font-semibold">
											{user?.name || 'User'}
										</p>
										<p className="text-muted-foreground truncate font-sans text-xs">
											{user?.email}
										</p>
									</div>
									<ChevronDown className="text-muted-foreground group-hover:text-foreground ml-2 h-4 w-4 transition-colors" />
								</motion.div>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								align="start"
								className="bg-popover border-border text-popover-foreground mb-2 w-60 rounded-xl font-sans shadow-2xl"
							>
								<DropdownMenuLabel className="text-foreground px-3 py-2 font-semibold">
									My Account
								</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-border mx-1" />
								<DropdownMenuItem
									asChild
									className="hover:bg-accent focus:bg-accent m-1 cursor-pointer rounded-md"
								>
									<Link
										to="/profile"
										data-testid="user-profile-link"
										className="flex items-center px-2 py-1.5"
									>
										<UserCircle className="text-muted-foreground mr-2 h-4 w-4" />
										<span>Profile</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem
									data-testid="settings-link"
									className="hover:bg-accent focus:bg-accent m-1 cursor-pointer rounded-md px-2 py-1.5"
								>
									<SettingsIcon className="text-muted-foreground mr-2 h-4 w-4" />
									<span>Account Settings</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-border mx-1" />
								<DropdownMenuItem
									data-testid="logout-button"
									className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive m-1 cursor-pointer rounded-md px-2 py-1.5"
									onClick={handleSignOut}
								>
									<LogOut className="mr-2 h-4 w-4" />
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</motion.div>
				</>
			)}
		</div>
	)
}

export default Sidebar
