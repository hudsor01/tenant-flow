'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useSidebar } from '@/components/ui/sidebar-provider'

// Enhanced Sidebar Footer with status indicators
export function SidebarFooter() {
	const { collapsed } = useSidebar()
	const [onlineStatus, _setOnlineStatus] = React.useState(true)
	const [hasUnreadNotifications, _setHasUnreadNotifications] =
		React.useState(true)

	if (collapsed) {
		return (
			<div className="border-sidebar-border border-t p-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="relative"
						>
							<Button
								variant="ghost"
								size="icon"
								className="relative h-10 w-10 rounded-full"
							>
								<Avatar className="h-8 w-8">
									<AvatarImage src="/avatars/user.jpg" />
									<AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br text-xs">
										JD
									</AvatarFallback>
								</Avatar>
								{/* Online Status Indicator */}
								<motion.div
									animate={{
										scale: onlineStatus ? [1, 1.2, 1] : 1
									}}
									transition={{
										duration: 2,
										repeat: onlineStatus ? Infinity : 0,
										ease: 'easeInOut'
									}}
									className={`border-sidebar absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${
										onlineStatus
											? 'bg-green-5'
											: 'bg-gray-4'
									}`}
								/>
								{/* Notification Indicator */}
								{hasUnreadNotifications && (
									<motion.div
										animate={{
											scale: [1, 1.3, 1]
										}}
										transition={{
											duration: 1.5,
											repeat: Infinity,
											ease: 'easeInOut'
										}}
										className="border-sidebar absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border bg-red-5"
									/>
								)}
							</Button>
						</motion.div>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="right"
						align="end"
						className="w-64"
					>
						<DropdownMenuLabel className="font-normal">
							<div className="flex items-center space-x-3">
								<Avatar className="h-10 w-10">
									<AvatarImage src="/avatars/user.jpg" />
									<AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br">
										JD
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium">
											John Doe
										</p>
										<Badge
											variant="outline"
											className="px-1.5 py-0 text-xs"
										>
											<i className="i-lucide-shield mr-1 h-2.5 w-2.5"  />
											Admin
										</Badge>
									</div>
									<p className="text-muted-foreground text-xs">
										john@example.com
									</p>
									<div className="mt-1 flex items-center gap-1">
										<div
											className="status-indicator" data-online={onlineStatus}
										/>
										<span className="text-muted-foreground text-xs">
											{onlineStatus
												? 'Online'
												: 'Offline'}
										</span>
									</div>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="cursor-pointer">
							<i className="i-lucide-user mr-2 h-4 w-4"  />
							Profile
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer">
							<i className="i-lucide-settings mr-2 h-4 w-4"  />
							Settings
						</DropdownMenuItem>
						<DropdownMenuItem className="relative cursor-pointer">
							<i className="i-lucide-bell mr-2 h-4 w-4"  />
							Notifications
							{hasUnreadNotifications && (
								<Badge
									variant="destructive"
									className="ml-auto h-5 min-w-[1.25rem] px-1.5 py-0 text-xs"
								>
									<i className="i-lucide-zap h-2.5 w-2.5"  />
								</Badge>
							)}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="cursor-pointer text-red-6 focus:text-red-6">
							<i className="i-lucide-log-out mr-2 h-4 w-4"  />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		)
	}

	return (
		<div className="border-sidebar-border border-t p-4">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<motion.div
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full"
					>
						<Button
							variant="ghost"
							className="group relative h-auto w-full justify-start gap-2 p-2"
						>
							<div className="relative">
								<Avatar className="h-8 w-8">
									<AvatarImage src="/avatars/user.jpg" />
									<AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br">
										JD
									</AvatarFallback>
								</Avatar>
								{/* Online Status Indicator */}
								<motion.div
									animate={{
										scale: onlineStatus ? [1, 1.2, 1] : 1
									}}
									transition={{
										duration: 2,
										repeat: onlineStatus ? Infinity : 0,
										ease: 'easeInOut'
									}}
									className={`border-sidebar absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${
										onlineStatus
											? 'bg-green-5'
											: 'bg-gray-4'
									}`}
								/>
								{/* Notification Indicator */}
								{hasUnreadNotifications && (
									<motion.div
										animate={{
											scale: [1, 1.3, 1]
										}}
										transition={{
											duration: 1.5,
											repeat: Infinity,
											ease: 'easeInOut'
										}}
										className="border-sidebar absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border bg-red-5"
									/>
								)}
							</div>
							<div className="flex flex-1 flex-col items-start text-left">
								<div className="flex w-full items-center gap-2">
									<span className="text-sm font-medium">
										John Doe
									</span>
									<Badge
										variant="outline"
										className="ml-auto px-1.5 py-0 text-xs"
									>
										<i className="i-lucide-shield mr-1 h-2.5 w-2.5"  />
										Admin
									</Badge>
								</div>
								<span className="text-sidebar-foreground/60 text-xs">
									Property_ Manager
								</span>
								<div className="mt-0.5 flex items-center gap-1">
									<div
										className={onlineStatus ? 'h-1.5 w-1.5 rounded-full bg-green-5' : 'h-1.5 w-1.5 rounded-full bg-gray-4'}
									/>
									<span className="text-sidebar-foreground/40 text-xs">
										{onlineStatus ? 'Online' : 'Offline'}
									</span>
								</div>
							</div>
							<motion.div
								animate={{
									y: [0, 2, 0]
								}}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: 'easeInOut'
								}}
							>
								<i className="i-lucide-chevron-down text-sidebar-foreground/60 group-hover:text-sidebar-foreground h-4 w-4 transition-colors"  />
							</motion.div>
						</Button>
					</motion.div>
				</DropdownMenuTrigger>
				<DropdownMenuContent side="right" align="end" className="w-64">
					<DropdownMenuLabel className="font-normal">
						<div className="flex items-center space-x-3">
							<Avatar className="h-10 w-10">
								<AvatarImage src="/avatars/user.jpg" />
								<AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br">
									JD
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">
										John Doe
									</p>
									<Badge
										variant="outline"
										className="px-1.5 py-0 text-xs"
									>
										<i className="i-lucide-shield mr-1 h-2.5 w-2.5"  />
										Admin
									</Badge>
								</div>
								<p className="text-muted-foreground text-xs">
									john@example.com
								</p>
								<div className="mt-1 flex items-center gap-1">
									<div
										className="status-indicator" data-online={onlineStatus}
									/>
									<span className="text-muted-foreground text-xs">
										{onlineStatus ? 'Online' : 'Offline'}
									</span>
								</div>
							</div>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="cursor-pointer">
						<i className="i-lucide-user mr-2 h-4 w-4"  />
						Profile
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer">
						<i className="i-lucide-settings mr-2 h-4 w-4"  />
						Settings
					</DropdownMenuItem>
					<DropdownMenuItem className="relative cursor-pointer">
						<i className="i-lucide-bell mr-2 h-4 w-4"  />
						Notifications
						{hasUnreadNotifications && (
							<Badge
								variant="destructive"
								className="ml-auto h-5 min-w-[1.25rem] px-1.5 py-0 text-xs"
							>
								<i className="i-lucide-zap h-2.5 w-2.5"  />
							</Badge>
						)}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="cursor-pointer text-red-6 focus:text-red-6">
						<i className="i-lucide-log-out mr-2 h-4 w-4"  />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
