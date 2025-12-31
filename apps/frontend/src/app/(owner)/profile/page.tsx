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
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
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

// Components
import { ProfileSkeleton } from '#components/profiles/owner/profile-skeleton'
import { ProfileCard } from '#components/profiles/owner/profile-card'
import { PersonalInfoSection } from '#components/profiles/owner/personal-info-section'
import { PaymentSettingsSection } from '#components/profiles/owner/payment-settings-section'
import { SecuritySection } from '#components/profiles/owner/security-section'
import { QuickLinksSection } from '#components/profiles/owner/quick-links-section'
import { RecentActivitySection } from '#components/profiles/owner/recent-activity-section'

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
				<ProfileCard
					profile={profile}
					isPending={isPending}
					fileInputRef={fileInputRef}
					onAvatarClick={handleAvatarClick}
					onAvatarChange={handleAvatarChange}
					onRemoveAvatar={handleRemoveAvatar}
					onSignOut={handleSignOut}
					isUploadingAvatar={uploadAvatar.isPending}
					isRemovingAvatar={removeAvatar.isPending}
					isSigningOut={signOut.isPending}
				/>

				{/* Main Content */}
				<div className="space-y-6 lg:col-span-2">
					<PersonalInfoSection
						profile={{
							email: profile.email,
							phone: profile.phone,
							full_name: profile.full_name,
							status: profile.status
						}}
						isEditing={isEditing}
						isPending={isPending}
						formData={formData}
						onEditClick={handleEditClick}
						onCancelEdit={handleCancelEdit}
						onSaveProfile={handleSaveProfile}
						onFormChange={data => setFormData(prev => ({ ...prev, ...data }))}
					/>

					{profile.owner_profile && (
						<PaymentSettingsSection
							stripeConnected={profile.owner_profile.stripe_connected}
						/>
					)}

					<SecuritySection
						onChangePassword={() => setShowChangePasswordDialog(true)}
					/>

					<QuickLinksSection />

					<RecentActivitySection />
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
