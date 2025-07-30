import React, { useState } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	Mail,
	Phone,
	Edit3,
	Loader2,
	Home,
	Wrench,
	FileText,
	Users
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import EditProfileModal from '@/components/modals/EditProfileModal'
import { format } from 'date-fns'
import type { User } from '@tenantflow/shared/types/auth'
import type { ActivityMetadata } from '@tenantflow/shared/types/activity'

// Activity feed types
interface ActivityItem {
	id: string
	action: string
	entityType: string
	entityName: string
	userName?: string
	createdAt: string
	metadata?: ActivityMetadata
}

const UserProfilePage: React.FC = () => {
	const { user, isLoading } = useAuth()
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	// Activity feed removed for MVP
	const activities: ActivityItem[] = []
	const activitiesLoading = false

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	if (!user) {
		return (
			<div className="flex min-h-[300px] items-center justify-center">
				<p className="text-muted-foreground">No user found</p>
			</div>
		)
	}

	// Create a full User object with default values for missing properties
	const fullUser: User = {
		id: user.id,
		email: user.email,
		name: user.name || '',
		avatarUrl: user.avatarUrl || null,
		role: user.role,
		phone: user.phone || null,
		createdAt: typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt,
		updatedAt: typeof user.updatedAt === 'string' ? new Date(user.updatedAt) : user.updatedAt,
		bio: user.bio || null,
		supabaseId: 'supabaseId' in user ? (user as { supabaseId: string }).supabaseId : (user as { id: string }).id, // Use user.id as fallback
		stripeCustomerId: 'stripeCustomerId' in user ? (user as { stripeCustomerId: string | null }).stripeCustomerId : null
	}

	const getInitials = (name?: string | null) => {
		if (!name) return 'U'
		return name
			.split(' ')
			.map(word => word[0] || '')
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	const getActivityIcon = (entityType: string) => {
		switch (entityType) {
			case 'property':
				return <Home className="h-4 w-4" />
			case 'maintenance':
				return <Wrench className="h-4 w-4" />
			case 'lease':
				return <FileText className="h-4 w-4" />
			case 'tenant':
				return <Users className="h-4 w-4" />
			default:
				return <FileText className="h-4 w-4" />
		}
	}

	const formatActivityDescription = (activity: ActivityItem) => {
		const userName = activity.userName || 'You'
		const entityName = activity.entityName || 'item'
		const propertyName = activity.metadata?.propertyName

		let description = `${userName} ${activity.action} ${entityName}`
		if (propertyName) {
			description += ` at ${propertyName}`
		}

		return description
	}

	return (
		<div className="space-y-8">
			{/* Profile Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<Avatar className="h-20 w-20">
									<AvatarImage
										src={user.avatarUrl || undefined}
										alt={user.name || 'User'}
									/>
									<AvatarFallback className="text-xl">
										{getInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<CardTitle className="text-2xl">
										{user.name || 'User'}
									</CardTitle>
									<CardDescription>
										{user.role
											.charAt(0)
											.toUpperCase() +
											user.role.slice(1).toLowerCase()}
									</CardDescription>
								</div>
							</div>
							<Button
								onClick={() => setIsEditModalOpen(true)}
								variant="outline"
							>
								<Edit3 className="mr-2 h-4 w-4" />
								Edit Profile
							</Button>
						</div>
					</CardHeader>
				</Card>
			</motion.div>

			{/* Contact Information */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<Card>
					<CardHeader>
						<CardTitle>Contact Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center space-x-3">
							<Mail className="h-5 w-5 text-muted-foreground" />
							<span>{user.email}</span>
						</div>
						{user.phone && (
							<div className="flex items-center space-x-3">
								<Phone className="h-5 w-5 text-muted-foreground" />
								<span>{user.phone}</span>
							</div>
						)}
					</CardContent>
				</Card>
			</motion.div>

			{/* Recent Activity */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
						<CardDescription>
							Your latest actions across the platform
						</CardDescription>
					</CardHeader>
					<CardContent>
						{activitiesLoading ? (
							<div className="flex justify-center py-8">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : activities.length === 0 ? (
							<p className="text-center text-muted-foreground py-8">
								No recent activity
							</p>
						) : (
							<div className="space-y-4">
								{activities.map(activity => (
									<div
										key={activity.id}
										className="flex items-start space-x-3 pb-4 last:pb-0 border-b last:border-0"
									>
										<div className="mt-1 p-2 bg-muted rounded-full">
											{getActivityIcon(
												activity.entityType
											)}
										</div>
										<div className="flex-1 space-y-1">
											<p className="text-sm">
												{formatActivityDescription(
													activity
												)}
											</p>
											<p className="text-xs text-muted-foreground">
												{format(
													new Date(
														activity.createdAt
													),
													'PPp'
												)}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</motion.div>

			<EditProfileModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				user={fullUser}
			/>
		</div>
	)
}

export default UserProfilePage
