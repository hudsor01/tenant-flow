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
import EditProfileModal from '@/components/profile/EditProfileModal'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { format } from 'date-fns'

const UserProfilePage: React.FC = () => {
	const { user, isLoading } = useAuth()
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const { data: activityFeed, isLoading: activitiesLoading } =
		useActivityFeed(5)
	const activities = activityFeed?.items || []

	const getInitials = (name: string): string => {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
	}

	const getActivityIcon = (type: string) => {
		switch (type) {
			case 'property':
				return Home
			case 'maintenance':
				return Wrench
			case 'tenant':
				return Users
			case 'lease':
				return FileText
			default:
				return FileText
		}
	}

	if (isLoading || !user) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<Loader2 className="text-primary h-8 w-8 animate-spin" />
			</div>
		)
	}

	return (
		<div className="space-y-8 p-1">
			<motion.div
				className="flex flex-col items-center justify-between md:flex-row md:items-end"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<div className="mb-4 flex items-center space-x-4 md:mb-0">
					<Avatar className="border-primary/70 h-24 w-24 border-4 shadow-lg">
						<AvatarImage
							src={undefined}
							alt="User Avatar"
						/>
						<AvatarFallback className="font-sans text-3xl">
							{getInitials("User")}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="text-foreground text-3xl font-bold">
							User
						</h1>
						<p className="text-md text-primary font-sans">
							Property Owner
						</p>
					</div>
				</div>
				<Button
					className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans"
					onClick={() => setIsEditModalOpen(true)}
				>
					<Edit3 className="mr-2 h-4 w-4" /> Edit Profile
				</Button>
			</motion.div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<motion.div
					className="lg:col-span-2"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<Card className="bg-card shadow-xl">
						<CardHeader>
							<CardTitle className="text-foreground text-xl">
								About Me
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-foreground font-sans leading-relaxed">
								'No bio added yet. Click Edit Profile to add information about yourself.'
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Card className="bg-card shadow-xl">
						<CardHeader>
							<CardTitle className="text-foreground text-xl">
								Contact Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center space-x-3">
								<Mail className="text-primary h-5 w-5" />
								<span className="text-foreground font-sans">
									user@example.com
								</span>
							</div>
							<div className="flex items-center space-x-3">
								<Phone className="text-primary h-5 w-5" />
								<span className="text-foreground font-sans">
									'No phone number added'
								</span>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.3 }}
			>
				<Card className="bg-card shadow-xl">
					<CardHeader>
						<CardTitle className="text-foreground text-xl">
							Activity Feed
						</CardTitle>
						<CardDescription className="text-muted-foreground font-sans">
							Recent actions and updates.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{activitiesLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
							</div>
						) : activities.length > 0 ? (
							<div className="space-y-2">
								{activities.map((activity, index: number) => {
									const Icon = getActivityIcon(
										activity.entityType
									)
									return (
										<motion.div
											key={activity.id}
											className="bg-secondary/50 hover:bg-secondary/70 rounded-lg p-3 transition-colors"
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: index * 0.1 }}
										>
											<div className="flex items-start space-x-3">
												<Icon className="text-primary mt-0.5 h-4 w-4" />
												<div className="flex-1">
													<p className="text-foreground font-sans text-sm font-medium">
														{activity.action}: "
														{activity.entityName}"
													</p>
													{(
														activity.metadata as {
															propertyName?: string
														}
													)?.propertyName && (
														<p className="text-muted-foreground text-xs">
															Property:{' '}
															{
																(
																	activity.metadata as {
																		propertyName?: string
																	}
																).propertyName
															}
														</p>
													)}
													<p className="text-muted-foreground mt-1 font-sans text-xs">
														by{' '}
														{activity.userName ||
															'You'}{' '}
														•{' '}
														{format(
															new Date(
																activity.createdAt
															),
															'PPp'
														)}
													</p>
												</div>
											</div>
										</motion.div>
									)
								})}
							</div>
						) : (
							<p className="text-muted-foreground py-8 text-center font-sans">
								No recent activity to display.
							</p>
						)}
					</CardContent>
				</Card>
			</motion.div>

			<EditProfileModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				user={user}
			/>
		</div>
	)
}

export default UserProfilePage
