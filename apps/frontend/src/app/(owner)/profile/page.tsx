/**
 * Owner Profile Page
 *
 * Allows property owners to:
 * - View and update their profile information
 * - Upload/remove avatar
 * - Change password
 * - View account statistics (properties, units, Stripe status)
 */

'use client'

import { useState, useRef } from 'react'
import {
	Building2,
	Calendar,
	Camera,
	CheckCircle,
	Clock,
	Edit,
	Key,
	Loader2,
	LogOut,
	Mail,
	Phone,
	Settings,
	Shield,
	User,
	ExternalLink
} from 'lucide-react'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { NumberTicker } from '#components/ui/number-ticker'
import { Stat, StatValue, StatDescription } from '#components/ui/stat'
import { Avatar, AvatarFallback, AvatarImage } from '#components/ui/avatar'
import { ChangePasswordDialog } from '#components/auth/change-password-dialog'
import {
	useProfile,
	useUpdateProfile,
	useUploadAvatar,
	useRemoveAvatar,
	useUpdatePhone
} from '#hooks/api/use-profile'
import { useSignOut } from '#hooks/api/use-auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function OwnerProfilePage() {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [showChangePasswordDialog, setShowChangePasswordDialog] =
		useState(false)
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		phone: ''
	})

	// Queries
	const { data: profile, isLoading, error } = useProfile()

	// Mutations
	const updateProfile = useUpdateProfile()
	const uploadAvatar = useUploadAvatar()
	const removeAvatar = useRemoveAvatar()
	const updatePhone = useUpdatePhone()
	const signOut = useSignOut()

	// Initialize form data when profile loads
	useState(() => {
		if (profile) {
			setFormData({
				first_name: profile.first_name || '',
				last_name: profile.last_name || '',
				phone: profile.phone || ''
			})
		}
	})

	const handleEditClick = () => {
		if (profile) {
			setFormData({
				first_name: profile.first_name || '',
				last_name: profile.last_name || '',
				phone: profile.phone || ''
			})
		}
		setIsEditing(true)
	}

	const handleCancelEdit = () => {
		if (profile) {
			setFormData({
				first_name: profile.first_name || '',
				last_name: profile.last_name || '',
				phone: profile.phone || ''
			})
		}
		setIsEditing(false)
	}

	const handleSaveProfile = async () => {
		if (!profile) return

		// Validate phone format if provided
		if (formData.phone && formData.phone.trim()) {
			const phoneRegex = /^\+?[\d\s\-()]+$/
			const digitsOnly = formData.phone.replace(/\D/g, '')
			if (!phoneRegex.test(formData.phone) || digitsOnly.length < 10) {
				toast.error('Please enter a valid phone number (at least 10 digits)')
				return
			}
		}

		try {
			await updateProfile.mutateAsync({
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: profile.email,
				phone: formData.phone || null
			})
			setIsEditing(false)
		} catch {
			// Error handled by mutation
		}
	}

	const handleAvatarClick = () => {
		fileInputRef.current?.click()
	}

	const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
		if (!allowedTypes.includes(file.type)) {
			toast.error('Please select an image file (JPEG, PNG, GIF, or WebP)')
			return
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Image must be less than 5MB')
			return
		}

		try {
			await uploadAvatar.mutateAsync(file)
		} catch {
			// Error handled by mutation
		}

		// Reset input
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const handleRemoveAvatar = async () => {
		try {
			await removeAvatar.mutateAsync()
		} catch {
			// Error handled by mutation
		}
	}

	const handleSignOut = async () => {
		try {
			await signOut.mutateAsync()
			router.push('/login')
		} catch {
			// Error handled by mutation
		}
	}

	const getInitials = () => {
		if (profile?.first_name && profile?.last_name) {
			return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
		}
		if (profile?.full_name) {
			return profile.full_name
				.split(' ')
				.map(n => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		}
		return 'U'
	}

	if (isLoading) {
		return <ProfileSkeleton />
	}

	if (error || !profile) {
		return (
			<div className="p-6 lg:p-8">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<p className="text-destructive">Failed to load profile</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => window.location.reload()}
					>
						Try Again
					</Button>
				</div>
			</div>
		)
	}

	const isPending =
		updateProfile.isPending ||
		uploadAvatar.isPending ||
		removeAvatar.isPending ||
		updatePhone.isPending

	return (
		<div className="space-y-6">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div>
					<h1 className="text-2xl font-bold">My Profile</h1>
					<p className="text-muted-foreground">
						View and manage your account information
					</p>
				</div>
			</BlurFade>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Profile Card */}
				<BlurFade delay={0.15} inView>
					<div className="lg:col-span-1">
						<div className="rounded-lg border bg-card p-6 relative overflow-hidden">
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
							/>

							{/* Avatar Section */}
							<div className="flex flex-col items-center">
								<div className="relative">
									<Avatar className="h-24 w-24">
										<AvatarImage
											src={profile.avatar_url || undefined}
											alt={profile.full_name}
										/>
										<AvatarFallback className="text-2xl bg-primary/10 text-primary">
											{getInitials()}
										</AvatarFallback>
									</Avatar>
									<button
										type="button"
										onClick={handleAvatarClick}
										disabled={isPending}
										className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
										aria-label="Upload new avatar"
									>
										{uploadAvatar.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Camera className="h-4 w-4" />
										)}
									</button>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/jpeg,image/png,image/gif,image/webp"
										className="hidden"
										onChange={handleAvatarChange}
									/>
								</div>

								{/* Remove Avatar Button */}
								{profile.avatar_url && (
									<button
										type="button"
										onClick={handleRemoveAvatar}
										disabled={isPending}
										className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
									>
										{removeAvatar.isPending ? 'Removing...' : 'Remove photo'}
									</button>
								)}

								<h2 className="mt-4 text-xl font-semibold">
									{profile.full_name}
								</h2>
								<p className="text-sm text-muted-foreground capitalize">
									{profile.user_type === 'owner'
										? 'Property Owner'
										: profile.user_type}
								</p>

								<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
									<Clock className="h-3 w-3" />
									Member since{' '}
									{new Date(profile.created_at).toLocaleDateString('en-US', {
										month: 'short',
										year: 'numeric'
									})}
								</div>
							</div>

							{/* Stats */}
							{profile.owner_profile && (
								<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
									<BlurFade delay={0.2} inView>
										<Stat className="text-center">
											<StatValue className="flex items-center justify-center text-primary">
												<NumberTicker
													value={profile.owner_profile.properties_count}
													duration={1000}
												/>
											</StatValue>
											<StatDescription className="text-center">
												Properties
											</StatDescription>
										</Stat>
									</BlurFade>
									<BlurFade delay={0.25} inView>
										<Stat className="text-center">
											<StatValue className="flex items-center justify-center text-primary">
												<NumberTicker
													value={profile.owner_profile.units_count}
													duration={1200}
												/>
											</StatValue>
											<StatDescription className="text-center">
												Units
											</StatDescription>
										</Stat>
									</BlurFade>
								</div>
							)}

							{/* Sign Out */}
							<button
								type="button"
								onClick={handleSignOut}
								disabled={signOut.isPending}
								className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
							>
								{signOut.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<LogOut className="h-4 w-4" />
								)}
								{signOut.isPending ? 'Signing out...' : 'Sign Out'}
							</button>
						</div>
					</div>
				</BlurFade>

				{/* Main Content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Personal Information */}
					<BlurFade delay={0.3} inView>
						<section className="rounded-lg border bg-card p-6">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-lg font-semibold">Personal Information</h3>
								{!isEditing && (
									<button
										type="button"
										onClick={handleEditClick}
										className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
									>
										<Edit className="h-4 w-4" />
										Edit
									</button>
								)}
							</div>

							{isEditing ? (
								<div className="space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="first_name">First Name</Label>
											<Input
												id="first_name"
												value={formData.first_name}
												onChange={e =>
													setFormData(prev => ({
														...prev,
														first_name: e.target.value
													}))
												}
												disabled={isPending}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="last_name">Last Name</Label>
											<Input
												id="last_name"
												value={formData.last_name}
												onChange={e =>
													setFormData(prev => ({
														...prev,
														last_name: e.target.value
													}))
												}
												disabled={isPending}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="email">Email Address</Label>
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<Input
												id="email"
												type="email"
												value={profile.email}
												disabled
												className="bg-muted"
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											Email cannot be changed. Contact support if needed.
										</p>
									</div>

									<div className="space-y-2">
										<Label htmlFor="phone">Phone Number</Label>
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<Input
												id="phone"
												type="tel"
												placeholder="(555) 123-4567"
												value={formData.phone}
												onChange={e =>
													setFormData(prev => ({
														...prev,
														phone: e.target.value
													}))
												}
												disabled={isPending}
											/>
										</div>
									</div>

									<div className="flex gap-3 pt-4">
										<Button onClick={handleSaveProfile} disabled={isPending}>
											{updateProfile.isPending ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Saving...
												</>
											) : (
												'Save Changes'
											)}
										</Button>
										<Button
											variant="outline"
											onClick={handleCancelEdit}
											disabled={isPending}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								<div className="grid gap-4 sm:grid-cols-2">
									<BlurFade delay={0.35} inView>
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">
												Full Name
											</label>
											<div className="flex items-center gap-2">
												<User className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm font-medium">
													{profile.full_name}
												</p>
											</div>
										</div>
									</BlurFade>

									<BlurFade delay={0.4} inView>
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">
												Email Address
											</label>
											<div className="flex items-center gap-2">
												<Mail className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm font-medium">{profile.email}</p>
											</div>
										</div>
									</BlurFade>

									<BlurFade delay={0.45} inView>
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">
												Phone Number
											</label>
											<div className="flex items-center gap-2">
												<Phone className="h-4 w-4 text-muted-foreground" />
												<p className="text-sm font-medium">
													{profile.phone || 'Not set'}
												</p>
											</div>
										</div>
									</BlurFade>

									<BlurFade delay={0.5} inView>
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">
												Account Status
											</label>
											<div className="flex items-center gap-2">
												<CheckCircle className="h-4 w-4 text-emerald-500" />
												<p className="text-sm font-medium capitalize">
													{profile.status}
												</p>
											</div>
										</div>
									</BlurFade>
								</div>
							)}
						</section>
					</BlurFade>

					{/* Stripe Connect Status (Owner Only) */}
					{profile.owner_profile && (
						<BlurFade delay={0.55} inView>
							<section className="rounded-lg border bg-card p-6">
								<h3 className="mb-4 text-lg font-semibold">Payment Settings</h3>

								{profile.owner_profile.stripe_connected ? (
									<div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
												<CheckCircle className="h-5 w-5 text-emerald-600" />
											</div>
											<div>
												<p className="text-sm font-medium">Stripe Connected</p>
												<p className="text-xs text-muted-foreground">
													You can receive payments from tenants
												</p>
											</div>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => router.push('/settings/billing')}
										>
											<ExternalLink className="h-3 w-3 mr-2" />
											Manage
										</Button>
									</div>
								) : (
									<div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
												<Building2 className="h-5 w-5 text-amber-600" />
											</div>
											<div>
												<p className="text-sm font-medium">
													Stripe Not Connected
												</p>
												<p className="text-xs text-muted-foreground">
													Connect your bank account to receive payments
												</p>
											</div>
										</div>
										<Button
											size="sm"
											onClick={() => router.push('/settings/billing')}
										>
											Connect Now
										</Button>
									</div>
								)}
							</section>
						</BlurFade>
					)}

					{/* Security Status */}
					<BlurFade delay={0.6} inView>
						<section className="rounded-lg border bg-card p-6">
							<h3 className="mb-4 text-lg font-semibold">Security Status</h3>

							<div className="grid gap-3 sm:grid-cols-2">
								{/* Password */}
								<BlurFade delay={0.65} inView>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 hover:bg-muted/70 transition-colors">
										<div className="flex items-center gap-3">
											<Key className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">Password</p>
												<p className="text-xs text-muted-foreground">
													Secure your account
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setShowChangePasswordDialog(true)}
										>
											Change
										</Button>
									</div>
								</BlurFade>

								{/* 2FA Status */}
								<BlurFade delay={0.7} inView>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 relative overflow-hidden hover:bg-muted/70 transition-colors">
										<div className="flex items-center gap-3">
											<Shield className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">Two-Factor Auth</p>
												<p className="text-xs text-muted-foreground">
													Extra security layer
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => router.push('/settings?tab=security')}
										>
											Setup
										</Button>
									</div>
								</BlurFade>
							</div>
						</section>
					</BlurFade>

					{/* Quick Links */}
					<BlurFade delay={0.75} inView>
						<section className="rounded-lg border bg-card p-6">
							<h3 className="mb-4 text-lg font-semibold">Quick Links</h3>

							<div className="grid gap-3 sm:grid-cols-4">
								<button
									type="button"
									onClick={() => router.push('/settings')}
									className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
										<Settings className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-medium">Account Settings</p>
										<p className="text-xs text-muted-foreground">
											Manage your account preferences
										</p>
									</div>
								</button>

								<button
									type="button"
									onClick={() => router.push('/settings?tab=billing')}
									className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
										<ExternalLink className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-medium">Billing</p>
										<p className="text-xs text-muted-foreground">
											Plans and payment details
										</p>
									</div>
								</button>

								<button
									type="button"
									onClick={() => router.push('/settings?tab=security')}
									className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
										<Shield className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-medium">Security</p>
										<p className="text-xs text-muted-foreground">
											Password and 2FA settings
										</p>
									</div>
								</button>

								<button
									type="button"
									onClick={() => router.push('/settings?tab=notifications')}
									className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
										<Mail className="h-5 w-5" />
									</div>
									<div>
										<p className="text-sm font-medium">Notifications</p>
										<p className="text-xs text-muted-foreground">
											Manage notification preferences
										</p>
									</div>
								</button>
							</div>
						</section>
					</BlurFade>

					{/* Recent Activity */}
					<BlurFade delay={0.9} inView>
						<section className="rounded-lg border bg-card p-6">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-lg font-semibold">Recent Activity</h3>
								<button
									type="button"
									onClick={() => router.push('/activity')}
									className="text-sm font-medium text-primary hover:underline"
								>
									View All
								</button>
							</div>

							<div className="space-y-4">
								<BlurFade delay={0.95} inView>
									<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
											<Edit className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm">
												<span className="text-muted-foreground">
													Updated profile information
												</span>
											</p>
											<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
												<Calendar className="h-3 w-3" />
												Recently
											</div>
										</div>
									</div>
								</BlurFade>

								<BlurFade delay={1.0} inView>
									<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
											<Building2 className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm">
												<span className="text-muted-foreground">
													Viewed properties dashboard
												</span>
											</p>
											<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
												<Calendar className="h-3 w-3" />
												Today
											</div>
										</div>
									</div>
								</BlurFade>

								<BlurFade delay={1.05} inView>
									<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
											<Shield className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm">
												<span className="text-muted-foreground">
													Logged in to account
												</span>
											</p>
											<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
												<Calendar className="h-3 w-3" />
												Today
											</div>
										</div>
									</div>
								</BlurFade>
							</div>
						</section>
					</BlurFade>
				</div>
			</div>

			{/* Password Change Dialog */}
			<ChangePasswordDialog
				open={showChangePasswordDialog}
				onOpenChange={setShowChangePasswordDialog}
			/>
		</div>
	)
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProfileSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-48 mb-2" />
				<Skeleton className="h-5 w-64" />
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-1">
					<div className="rounded-lg border bg-card p-6">
						<div className="flex flex-col items-center">
							<Skeleton className="h-24 w-24 rounded-full" />
							<Skeleton className="h-6 w-32 mt-4" />
							<Skeleton className="h-4 w-24 mt-2" />
							<Skeleton className="h-3 w-40 mt-2" />
						</div>
						<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
							<Skeleton className="h-16" />
							<Skeleton className="h-16" />
						</div>
						<Skeleton className="h-10 w-full mt-6" />
					</div>
				</div>

				<div className="space-y-6 lg:col-span-2">
					<div className="rounded-lg border bg-card p-6">
						<Skeleton className="h-6 w-48 mb-4" />
						<div className="grid gap-4 sm:grid-cols-2">
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</div>
					</div>
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-32 rounded-lg" />
					<Skeleton className="h-48 rounded-lg" />
				</div>
			</div>
		</div>
	)
}
