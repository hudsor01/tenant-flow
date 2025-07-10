import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Bell,
	Clock,
	Home,
	Users,
	Wrench,
	DollarSign,
	FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
	useNotifications,
	useUnreadNotifications
} from '../../hooks/useNotifications'
import { apiClient } from '@/lib/api'
import type { NotificationWithDetails } from '@/types/api'

type NotificationType =
	| 'PROPERTY'
	| 'TENANT'
	| 'MAINTENANCE'
	| 'PAYMENT'
	| 'LEASE'
	| 'SYSTEM'

export default function NotificationDropdown() {
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	// Get limited notifications for dropdown
	const { data: allNotifications = [], loading } = useNotifications()
	const { data: unreadCount = 0 } = useUnreadNotifications()
	
	// Take only the first 8 notifications for dropdown display
	const notifications = allNotifications.slice(0, 8)

	// Mark notification as read mutation
	const markAsReadMutation = useMutation({
		mutationFn: (id: string) => apiClient.notifications.markAsRead(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
		}
	})

	// Mark all notifications as read mutation
	const markAllAsReadMutation = useMutation({
		mutationFn: async () => {
			// Mark all unread notifications as read
			const unreadNotifications = allNotifications.filter(n => !n.read)
			await Promise.all(
				unreadNotifications.map(n => apiClient.notifications.markAsRead(n.id))
			)
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] })
			queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] })
		}
	})

	const getIcon = (type: NotificationType) => {
		switch (type) {
			case 'PROPERTY':
				return Home
			case 'TENANT':
				return Users
			case 'MAINTENANCE':
				return Wrench
			case 'PAYMENT':
				return DollarSign
			case 'LEASE':
				return FileText
			case 'SYSTEM':
				return Bell
			default:
				return Bell
		}
	}

	const getIconColor = (type: NotificationType) => {
		switch (type) {
			case 'PROPERTY':
				return 'text-blue-500'
			case 'TENANT':
				return 'text-green-500'
			case 'MAINTENANCE':
				return 'text-orange-500'
			case 'PAYMENT':
				return 'text-emerald-500'
			case 'LEASE':
				return 'text-purple-500'
			case 'SYSTEM':
				return 'text-gray-500'
			default:
				return 'text-gray-500'
		}
	}

	const markAsRead = async (id: string) => {
		try {
			await markAsReadMutation.mutateAsync(id)
		} catch (error) {
			console.error('Failed to mark notification as read:', error)
		}
	}

	const markAllAsRead = async () => {
		try {
			await markAllAsReadMutation.mutateAsync()
		} catch (error) {
			console.error('Failed to mark all notifications as read:', error)
		}
	}

	const handleNotificationClick = (
		notification: NotificationWithDetails
	) => {
		// Mark as read if not already read
		if (!notification.read) {
			markAsRead(notification.id)
		}

		// Navigate to action URL if provided
		if (notification.actionUrl) {
			navigate(notification.actionUrl)
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<motion.div
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
				>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-primary hover:bg-accent relative"
					>
						<Bell className="h-5 w-5" />
						{unreadCount > 0 && (
							<>
								<span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
									<span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
									<span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
								</span>
								<Badge
									className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0 hover:bg-red-500"
									variant="destructive"
								>
									{String(unreadCount)}
								</Badge>
							</>
						)}
					</Button>
				</motion.div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="bg-popover border-border text-popover-foreground mt-2 w-96 rounded-xl shadow-2xl"
			>
				<DropdownMenuLabel className="px-3 py-2 font-semibold">
					<div className="flex items-center justify-between">
						<span>Notifications</span>
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary h-auto p-0 text-xs"
								onClick={markAllAsRead}
							>
								Mark all as read
							</Button>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-border mx-1" />

				<ScrollArea className="h-[300px] sm:h-[400px]">
					{loading ? (
						<div className="text-muted-foreground p-8 text-center">
							<div className="border-primary mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2"></div>
							<p className="text-sm">Loading notifications...</p>
						</div>
					) : notifications.length === 0 ? (
						<div className="text-muted-foreground p-8 text-center">
							<Bell className="mx-auto mb-3 h-12 w-12 opacity-20" />
							<p className="text-sm">No notifications yet</p>
							<p className="mt-1 text-xs">
								You'll see updates about your properties here
							</p>
						</div>
					) : (
						notifications.map(notification => {
							const notificationType = notification.type as NotificationType
							const Icon = getIcon(notificationType)
							const iconColor = getIconColor(notificationType)

							return (
								<DropdownMenuItem
									key={notification.id}
									className={`hover:bg-accent focus:bg-accent m-1 cursor-pointer rounded-md p-3 ${
										!notification.read ? 'bg-accent/50' : ''
									}`}
									onClick={() =>
										handleNotificationClick(notification)
									}
								>
									<div className="flex w-full items-start space-x-3">
										<div className={`mt-0.5 ${iconColor}`}>
											<Icon className="h-5 w-5" />
										</div>
										<div className="flex-1 space-y-1">
											<div className="flex items-center justify-between">
												<p className="text-sm leading-none font-medium">
													{notification.title}
												</p>
												<div className="flex items-center space-x-1">
													{(notification.priority === 'HIGH' ||
														notification.priority === 'URGENT') && (
														<div className="h-1.5 w-1.5 rounded-full bg-red-500" />
													)}
													{!notification.read && (
														<div className="h-2 w-2 rounded-full bg-blue-500" />
													)}
												</div>
											</div>
											<p className="text-muted-foreground line-clamp-2 text-xs">
												{notification.message}
											</p>
											<div className="flex items-center justify-between">
												<p className="text-muted-foreground flex items-center text-xs">
													<Clock className="mr-1 h-3 w-3" />
													{formatDistanceToNow(
														new Date(notification.createdAt),
														{ addSuffix: true }
													)}
												</p>
												{(notification.property ||
													notification.tenant ||
													notification.maintenanceRequest) && (
													<p className="text-muted-foreground/70 text-xs">
														{notification.property
															?.name ||
															notification.tenant
																?.name ||
															'Property update'}
													</p>
												)}
											</div>
										</div>
									</div>
								</DropdownMenuItem>
							)
						})
					)}
				</ScrollArea>

				{notifications.length > 0 && (
					<>
						<DropdownMenuSeparator className="bg-border mx-1" />
						<div className="p-2">
							<Button
								variant="ghost"
								className="w-full justify-center text-sm"
								onClick={() => navigate('/notifications')}
							>
								View all notifications
							</Button>
						</div>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
