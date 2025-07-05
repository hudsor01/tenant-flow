import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
	Bell,
	CheckCheck,
	Search,
	Filter,
	Home,
	Users,
	Wrench,
	DollarSign,
	FileText,
	Clock,
	Trash2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { logger } from '@/lib/logger'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	useNotifications,
	useUnreadNotifications
} from '../hooks/useNotifications'
// import type { NotificationWithRelations } from '@/types/relationships'

// Type for the actual notification data from the API
interface NotificationWithDetails {
	id: string
	title: string
	message: string
	type: NotificationType
	priority?: NotificationPriority
	read: boolean
	createdAt: Date
	updatedAt: Date
	propertyId?: string
	tenantId?: string
	maintenanceId?: string
	property?: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
		description: string | null
		imageUrl: string | null
		ownerId: string
		propertyType: string
		createdAt: Date
		updatedAt: Date
	}
	tenant?: {
		id: string
		name: string
		email: string
	}
	maintenance?: {
		id: string
		title: string
		description: string
		status: string
	}
}

type NotificationType =
	| 'PROPERTY'
	| 'TENANT'
	| 'MAINTENANCE'
	| 'PAYMENT'
	| 'LEASE'
	| 'SYSTEM'
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const NotificationsPage: React.FC = () => {
	// Real data from database
	const notifications = useNotifications()
	const { data: unreadCount = 0 } = useUnreadNotifications()

	const allNotifications = notifications.data
	const isLoading = notifications.loading
	const error = notifications.error

	const [searchTerm, setSearchTerm] = useState('')
	const [filterType, setFilterType] = useState<string>('all')
	const [filterStatus, setFilterStatus] = useState<string>('all')

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
				return 'text-blue-500 bg-blue-50'
			case 'TENANT':
				return 'text-green-500 bg-green-50'
			case 'MAINTENANCE':
				return 'text-orange-500 bg-orange-50'
			case 'PAYMENT':
				return 'text-emerald-500 bg-emerald-50'
			case 'LEASE':
				return 'text-purple-500 bg-purple-50'
			case 'SYSTEM':
				return 'text-gray-500 bg-gray-50'
			default:
				return 'text-gray-500 bg-gray-50'
		}
	}

	const getPriorityColor = (priority?: NotificationPriority) => {
		switch (priority) {
			case 'HIGH':
			case 'URGENT':
				return 'destructive'
			case 'MEDIUM':
				return 'secondary'
			case 'LOW':
				return 'outline'
			default:
				return 'outline'
		}
	}

	const markAsRead = async (id: string) => {
		try {
			await notifications.update(id, { isRead: true })
		} catch (error) {
			logger.error(
				'Failed to mark notification as read',
				error as Error,
				{ notificationId: id }
			)
		}
	}

	const markAllAsRead = async () => {
		try {
			// Mark all unread notifications as read
			const unreadNotifications = allNotifications.filter(n => !n.isRead)
			await Promise.all(
				unreadNotifications.map(n =>
					notifications.update(n.id, { isRead: true })
				)
			)
		} catch (error) {
			logger.error(
				'Failed to mark all notifications as read',
				error as Error
			)
		}
	}

	const deleteNotification = async (id: string) => {
		try {
			await notifications.remove(id)
		} catch (error) {
			logger.error('Failed to delete notification', error as Error, {
				notificationId: id
			})
		}
	}

	const deleteAllRead = async () => {
		try {
			// Delete all read notifications
			const readNotifications = allNotifications.filter(n => n.isRead)
			await Promise.all(
				readNotifications.map(n => notifications.remove(n.id))
			)
		} catch (error) {
			logger.error('Failed to delete read notifications', error as Error)
		}
	}

	// Filter notifications
	const filteredNotifications = allNotifications.filter(notification => {
		// Extract property name from available fields
		const propertyName = 'Unknown Property' // Fallback for now

		const matchesSearch =
			notification.title
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			notification.message
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			propertyName?.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesType =
			filterType === 'all' ||
			notification.type === filterType.toUpperCase()
		const matchesStatus =
			filterStatus === 'all' ||
			(filterStatus === 'unread' && !notification.read) ||
			(filterStatus === 'read' && notification.read)

		return matchesSearch && matchesType && matchesStatus
	})

	const filteredAllNotifications = filteredNotifications
	const filteredUnreadNotifications = filteredNotifications.filter(
		n => !n.read
	)

	const NotificationItem = ({
		notification
	}: {
		notification: NotificationWithDetails
	}) => {
		const Icon = getIcon(notification.type)
		const iconColorClass = getIconColor(notification.type)

		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				whileHover={{ scale: 1.01 }}
				className={`rounded-lg border p-4 ${
					!notification.read
						? 'bg-accent/50 border-primary/20'
						: 'bg-card border-border'
				} cursor-pointer transition-all hover:shadow-md`}
				onClick={() => markAsRead(notification.id)}
			>
				<div className="flex items-start space-x-4">
					<div className={`rounded-lg p-2 ${iconColorClass}`}>
						<Icon className="h-5 w-5" />
					</div>
					<div className="flex-1 space-y-1">
						<div className="flex items-start justify-between">
							<div className="space-y-1">
								<div className="flex items-center space-x-2">
									<h4 className="text-sm font-semibold">
										{notification.title}
									</h4>
									{notification.priority && (
										<Badge
											variant={getPriorityColor(
												notification.priority
											)}
											className="text-xs"
										>
											{notification.priority}
										</Badge>
									)}
									{!notification.read && (
										<Badge
											variant="default"
											className="text-xs"
										>
											New
										</Badge>
									)}
								</div>
								<p className="text-muted-foreground text-sm">
									{notification.message}
								</p>
								{(notification.propertyId ||
									notification.tenantId ||
									notification.maintenanceId) && (
									<p className="text-muted-foreground text-xs">
										<Home className="mr-1 inline h-3 w-3" />
										Property related notification
									</p>
								)}
								<p className="text-muted-foreground flex items-center text-xs">
									<Clock className="mr-1 h-3 w-3" />
									{formatDistanceToNow(
										notification.createdAt,
										{ addSuffix: true }
									)}
									<span className="mx-2">•</span>
									{format(
										notification.createdAt,
										'MMM d, yyyy h:mm a'
									)}
								</p>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0"
									>
										<span className="sr-only">
											Open menu
										</span>
										<Trash2 className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										className="text-destructive"
										onClick={e => {
											e.stopPropagation()
											deleteNotification(notification.id)
										}}
										disabled={notifications.deleting}
									>
										Delete notification
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</motion.div>
		)
	}

	return (
		<div className="space-y-6 p-1">
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
					<span className="text-muted-foreground ml-3">
						Loading notifications...
					</span>
				</div>
			) : error ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Bell className="text-muted-foreground mb-4 h-12 w-12" />
						<p className="text-muted-foreground text-lg font-medium">
							Failed to load notifications
						</p>
						<p className="text-muted-foreground mt-1 text-sm">
							Please try refreshing the page
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5 }}
						>
							<h1 className="text-foreground text-3xl font-bold tracking-tight">
								Notifications
							</h1>
							<p className="text-muted-foreground mt-1">
								Stay updated with your property management
								activities
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5 }}
							className="flex items-center space-x-2"
						>
							{unreadCount > 0 && (
								<Button
									variant="outline"
									size="sm"
									onClick={markAllAsRead}
									className="flex items-center"
									disabled={notifications.updating}
								>
									<CheckCheck className="mr-2 h-4 w-4" />
									Mark all as read
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={deleteAllRead}
								className="flex items-center"
								disabled={
									allNotifications.filter(n => n.isRead)
										.length === 0 || notifications.deleting
								}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Clear read
							</Button>
						</motion.div>
					</div>

					{/* Filters */}
					<Card>
						<CardContent className="p-4">
							<div className="flex flex-col gap-4 sm:flex-row">
								<div className="relative flex-1">
									<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
									<Input
										placeholder="Search notifications..."
										value={searchTerm}
										onChange={e =>
											setSearchTerm(e.target.value)
										}
										className="pl-10"
									/>
								</div>
								<Select
									value={filterType}
									onValueChange={setFilterType}
								>
									<SelectTrigger className="w-full sm:w-[180px]">
										<Filter className="mr-2 h-4 w-4" />
										<SelectValue placeholder="Filter by type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">
											All Types
										</SelectItem>
										<SelectItem value="property">
											Property
										</SelectItem>
										<SelectItem value="tenant">
											Tenant
										</SelectItem>
										<SelectItem value="maintenance">
											Maintenance
										</SelectItem>
										<SelectItem value="payment">
											Payment
										</SelectItem>
										<SelectItem value="lease">
											Lease
										</SelectItem>
										<SelectItem value="system">
											System
										</SelectItem>
									</SelectContent>
								</Select>
								<Select
									value={filterStatus}
									onValueChange={setFilterStatus}
								>
									<SelectTrigger className="w-full sm:w-[140px]">
										<SelectValue placeholder="Filter by status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="unread">
											Unread
										</SelectItem>
										<SelectItem value="read">
											Read
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Notifications Tabs */}
					<Tabs defaultValue="all" className="space-y-4">
						<TabsList className="grid w-full max-w-[400px] grid-cols-1 sm:grid-cols-2">
							<TabsTrigger
								value="all"
								className="flex items-center"
							>
								All
								{filteredAllNotifications.length > 0 && (
									<Badge variant="secondary" className="ml-2">
										{filteredAllNotifications.length}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger
								value="unread"
								className="flex items-center"
							>
								Unread
								{filteredUnreadNotifications.length > 0 && (
									<Badge variant="default" className="ml-2">
										{filteredUnreadNotifications.length}
									</Badge>
								)}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="space-y-4">
							{filteredAllNotifications.length === 0 ? (
								<Card>
									<CardContent className="flex flex-col items-center justify-center py-12">
										<Bell className="text-muted-foreground mb-4 h-12 w-12" />
										<p className="text-muted-foreground text-lg font-medium">
											No notifications found
										</p>
										<p className="text-muted-foreground mt-1 text-sm">
											{searchTerm ||
											filterType !== 'all' ||
											filterStatus !== 'all'
												? 'Try adjusting your filters'
												: "You're all caught up!"}
										</p>
									</CardContent>
								</Card>
							) : (
								<div className="space-y-3">
									{filteredAllNotifications.map(
										notification => (
											<NotificationItem
												key={notification.id}
												notification={notification}
											/>
										)
									)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="unread" className="space-y-4">
							{filteredUnreadNotifications.length === 0 ? (
								<Card>
									<CardContent className="flex flex-col items-center justify-center py-12">
										<CheckCheck className="text-muted-foreground mb-4 h-12 w-12" />
										<p className="text-muted-foreground text-lg font-medium">
											No unread notifications
										</p>
										<p className="text-muted-foreground mt-1 text-sm">
											You're all caught up!
										</p>
									</CardContent>
								</Card>
							) : (
								<div className="space-y-3">
									{filteredUnreadNotifications.map(
										notification => (
											<NotificationItem
												key={notification.id}
												notification={notification}
											/>
										)
									)}
								</div>
							)}
						</TabsContent>
					</Tabs>
				</>
			)}
		</div>
	)
}

export default NotificationsPage
