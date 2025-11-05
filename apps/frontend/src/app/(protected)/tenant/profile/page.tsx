/**
 * Tenant Profile
 *
 * Allows tenants to:
 * - View and update their contact information
 * - Update emergency contacts
 * - Manage account settings
 * - Change password
 * - Update notification preferences
 */

'use client'

import { ChangePasswordDialog } from '#components/auth/change-password-dialog'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import { useSupabaseUpdateProfile } from '#hooks/api/use-supabase-auth'
import {
	useNotificationPreferences,
	useUpdateNotificationPreferences
} from '#hooks/api/use-notification-preferences'
import {
	useEmergencyContact,
	useCreateEmergencyContact,
	useUpdateEmergencyContact,
	useDeleteEmergencyContact
} from '#hooks/api/use-emergency-contact'
import { useCurrentUser } from '#hooks/use-current-user'
import { useUserProfile } from '#hooks/use-user-role'
import { logger } from '@repo/shared/lib/frontend-logger'
import { Bell, Mail, Phone, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TenantProfilePage() {
	const [isEditing, setIsEditing] = useState(false)
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
	const [emergencyContactEditing, setEmergencyContactEditing] = useState(false)
	const { user, isLoading: authLoading } = useCurrentUser()
	const { data: profile, isLoading: profileLoading } = useUserProfile()
	const updateProfile = useSupabaseUpdateProfile()

	// Notification preferences (get tenant ID from profile)
	const tenantId = profile?.id || ''
	const { data: notificationPrefs, isLoading: prefsLoading } =
		useNotificationPreferences(tenantId)
	const updatePreferences = useUpdateNotificationPreferences(tenantId)

	// Emergency contact
	const { data: emergencyContact, isLoading: emergencyContactLoading } =
		useEmergencyContact(tenantId)
	const createEmergencyContact = useCreateEmergencyContact(tenantId)
	const updateEmergencyContact = useUpdateEmergencyContact(tenantId)
	const deleteEmergencyContact = useDeleteEmergencyContact(tenantId)

	// Form state
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		email: '',
		phone: ''
	})

	// Emergency contact form state
	const [emergencyContactForm, setEmergencyContactForm] = useState({
		contactName: '',
		relationship: '',
		phoneNumber: '',
		email: ''
	})

	// Sync form with user data
	useEffect(() => {
		if (user || profile) {
			queueMicrotask(() => {
				setFormData({
					firstName: (user?.user_metadata?.firstName ||
						profile?.firstName ||
						'') as string,
					lastName: (user?.user_metadata?.lastName ||
						profile?.lastName ||
						'') as string,
					email: (user?.email || '') as string,
					phone: (user?.user_metadata?.phone || '') as string
				})
			})
		}
	}, [user, profile])

	// Sync emergency contact form with data
	useEffect(() => {
		if (emergencyContact) {
			setEmergencyContactForm({
				contactName: emergencyContact.contactName,
				relationship: emergencyContact.relationship,
				phoneNumber: emergencyContact.phoneNumber,
				email: emergencyContact.email || ''
			})
		}
	}, [emergencyContact])

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			await updateProfile.mutateAsync({
				firstName: formData.firstName,
				lastName: formData.lastName,
				phone: formData.phone
			})
			setIsEditing(false)
		} catch (error) {
			logger.error('Failed to update profile', {
				action: 'update_profile',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
			toast.error('Failed to update profile')
		}
	}

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const isLoading = authLoading || profileLoading || updateProfile.isPending

	const handleTogglePreference = async (key: string, value: boolean) => {
		try {
			await updatePreferences.mutateAsync({ [key]: value })
		} catch (error) {
			logger.error('Failed to update notification preference', {
				action: 'toggle_notification_preference',
				metadata: { key, value, error }
			})
		}
	}

	const handleEmergencyContactChange = (
		field: keyof typeof emergencyContactForm,
		value: string
	) => {
		setEmergencyContactForm(prev => ({ ...prev, [field]: value }))
	}

	const handleSaveEmergencyContact = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validate required fields
		if (
			!emergencyContactForm.contactName ||
			!emergencyContactForm.relationship ||
			!emergencyContactForm.phoneNumber
		) {
			toast.error('Please fill in all required fields')
			return
		}

		try {
			if (emergencyContact) {
				// Update existing contact
				await updateEmergencyContact.mutateAsync({
					contactName: emergencyContactForm.contactName,
					relationship: emergencyContactForm.relationship,
					phoneNumber: emergencyContactForm.phoneNumber,
					email: emergencyContactForm.email || null
				})
			} else {
				// Create new contact
				await createEmergencyContact.mutateAsync({
					contactName: emergencyContactForm.contactName,
					relationship: emergencyContactForm.relationship,
					phoneNumber: emergencyContactForm.phoneNumber,
					email: emergencyContactForm.email || null
				})
			}
			setEmergencyContactEditing(false)
		} catch (error) {
			logger.error('Failed to save emergency contact', {
				action: 'save_emergency_contact',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
		}
	}

	const handleDeleteEmergencyContact = async () => {
		if (!emergencyContact) return

		if (
			!confirm(
				'Are you sure you want to remove this emergency contact? This action cannot be undone.'
			)
		) {
			return
		}

		try {
			await deleteEmergencyContact.mutateAsync()
			setEmergencyContactForm({
				contactName: '',
				relationship: '',
				phoneNumber: '',
				email: ''
			})
			setEmergencyContactEditing(false)
		} catch (error) {
			logger.error('Failed to delete emergency contact', {
				action: 'delete_emergency_contact',
				metadata: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			})
		}
	}

	const handleCancelEmergencyContactEdit = () => {
		if (emergencyContact) {
			// Reset to existing data
			setEmergencyContactForm({
				contactName: emergencyContact.contactName,
				relationship: emergencyContact.relationship,
				phoneNumber: emergencyContact.phoneNumber,
				email: emergencyContact.email || ''
			})
		} else {
			// Clear form
			setEmergencyContactForm({
				contactName: '',
				relationship: '',
				phoneNumber: '',
				email: ''
			})
		}
		setEmergencyContactEditing(false)
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
				<p className="text-muted-foreground">
					Manage your contact information and account settings
				</p>
			</div>

			{/* Personal Information */}
			<CardLayout
				title="Personal Information"
				description="Your basic contact details"
			>
				<form onSubmit={handleSave} className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Field>
							<FieldLabel>First Name *</FieldLabel>
							<input
								type="text"
								className="input w-full"
								value={formData.firstName}
								onChange={e => handleChange('firstName', e.target.value)}
								disabled={!isEditing || isLoading}
								required
							/>
						</Field>

						<Field>
							<FieldLabel>Last Name *</FieldLabel>
							<input
								type="text"
								className="input w-full"
								value={formData.lastName}
								onChange={e => handleChange('lastName', e.target.value)}
								disabled={!isEditing || isLoading}
								required
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel>
							<div className="flex items-center gap-2">
								<Mail className="size-4" />
								<span>Email Address *</span>
							</div>
						</FieldLabel>
						<input
							type="email"
							className="input w-full"
							value={formData.email}
							disabled
							required
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Email cannot be changed. Contact support if needed.
						</p>
					</Field>

					<Field>
						<FieldLabel>
							<div className="flex items-center gap-2">
								<Phone className="size-4" />
								<span>Phone Number</span>
							</div>
						</FieldLabel>
						<input
							type="tel"
							className="input w-full"
							placeholder="(555) 123-4567"
							value={formData.phone}
							onChange={e => handleChange('phone', e.target.value)}
							disabled={!isEditing || isLoading}
						/>
					</Field>

					<div className="flex gap-4 pt-4">
						{!isEditing ? (
							<Button
								type="button"
								onClick={() => setIsEditing(true)}
								disabled={isLoading}
							>
								Edit Profile
							</Button>
						) : (
							<>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setIsEditing(false)
										// Reset form
										if (user || profile) {
											setFormData({
												firstName: (user?.user_metadata?.firstName ||
													profile?.firstName ||
													'') as string,
												lastName: (user?.user_metadata?.lastName ||
													profile?.lastName ||
													'') as string,
												email: (user?.email || '') as string,
												phone: (user?.user_metadata?.phone || '') as string
											})
										}
									}}
									disabled={isLoading}
								>
									Cancel
								</Button>
							</>
						)}
					</div>
				</form>
			</CardLayout>

			{/* Emergency Contact */}
			<CardLayout
				title="Emergency Contact"
				description="Someone we can contact in case of emergency"
			>
				<form onSubmit={handleSaveEmergencyContact} className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Field>
							<FieldLabel>Contact Name *</FieldLabel>
							<input
								type="text"
								className="input w-full"
								placeholder="Full name"
								value={emergencyContactForm.contactName}
								onChange={e =>
									handleEmergencyContactChange('contactName', e.target.value)
								}
								disabled={
									!emergencyContactEditing ||
									emergencyContactLoading ||
									createEmergencyContact.isPending ||
									updateEmergencyContact.isPending
								}
								required
							/>
						</Field>

						<Field>
							<FieldLabel>Relationship *</FieldLabel>
							<input
								type="text"
								className="input w-full"
								placeholder="e.g., Spouse, Parent"
								value={emergencyContactForm.relationship}
								onChange={e =>
									handleEmergencyContactChange('relationship', e.target.value)
								}
								disabled={
									!emergencyContactEditing ||
									emergencyContactLoading ||
									createEmergencyContact.isPending ||
									updateEmergencyContact.isPending
								}
								required
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel>
							<div className="flex items-center gap-2">
								<Phone className="size-4" />
								<span>Phone Number *</span>
							</div>
						</FieldLabel>
						<input
							type="tel"
							className="input w-full"
							placeholder="(555) 123-4567"
							value={emergencyContactForm.phoneNumber}
							onChange={e =>
								handleEmergencyContactChange('phoneNumber', e.target.value)
							}
							disabled={
								!emergencyContactEditing ||
								emergencyContactLoading ||
								createEmergencyContact.isPending ||
								updateEmergencyContact.isPending
							}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>
							<div className="flex items-center gap-2">
								<Mail className="size-4" />
								<span>Email (optional)</span>
							</div>
						</FieldLabel>
						<input
							type="email"
							className="input w-full"
							placeholder="emergency@example.com"
							value={emergencyContactForm.email}
							onChange={e =>
								handleEmergencyContactChange('email', e.target.value)
							}
							disabled={
								!emergencyContactEditing ||
								emergencyContactLoading ||
								createEmergencyContact.isPending ||
								updateEmergencyContact.isPending
							}
						/>
					</Field>

					{!emergencyContact && !emergencyContactEditing && (
						<p className="text-sm text-center text-muted-foreground py-4">
							No emergency contact on file
						</p>
					)}

					<div className="flex gap-4">
						{!emergencyContactEditing ? (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEmergencyContactEditing(true)}
									disabled={emergencyContactLoading}
								>
									{emergencyContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
								</Button>
								{emergencyContact && (
									<Button
										type="button"
										variant="outline"
										onClick={handleDeleteEmergencyContact}
										disabled={
											emergencyContactLoading || deleteEmergencyContact.isPending
										}
									>
										Remove Contact
									</Button>
								)}
							</>
						) : (
							<>
								<Button
									type="submit"
									disabled={
										emergencyContactLoading ||
										createEmergencyContact.isPending ||
										updateEmergencyContact.isPending
									}
								>
									{createEmergencyContact.isPending ||
									updateEmergencyContact.isPending
										? 'Saving...'
										: 'Save Contact'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleCancelEmergencyContactEdit}
									disabled={
										emergencyContactLoading ||
										createEmergencyContact.isPending ||
										updateEmergencyContact.isPending
									}
								>
									Cancel
								</Button>
							</>
						)}
					</div>
				</form>
			</CardLayout>

			{/* Notification Preferences */}
			<CardLayout
				title="Notification Preferences"
				description="Choose how you want to be notified"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Rent Reminders</p>
								<p className="text-sm text-muted-foreground">
									Get notified before rent is due
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={notificationPrefs?.rentReminders ?? true}
								onChange={e =>
									handleTogglePreference('rentReminders', e.target.checked)
								}
								disabled={prefsLoading || updatePreferences.isPending}
							/>
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
						</label>
					</div>

					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Maintenance Updates</p>
								<p className="text-sm text-muted-foreground">
									Updates on your maintenance requests
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={notificationPrefs?.maintenanceUpdates ?? true}
								onChange={e =>
									handleTogglePreference('maintenanceUpdates', e.target.checked)
								}
								disabled={prefsLoading || updatePreferences.isPending}
							/>
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
						</label>
					</div>

					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Property Notices</p>
								<p className="text-sm text-muted-foreground">
									Important announcements and updates
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={notificationPrefs?.propertyNotices ?? true}
								onChange={e =>
									handleTogglePreference('propertyNotices', e.target.checked)
								}
								disabled={prefsLoading || updatePreferences.isPending}
							/>
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
						</label>
					</div>
				</div>
			</CardLayout>

			{/* Account Security */}
			<CardLayout
				title="Account Security"
				description="Manage your password and security settings"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Shield className="size-5 text-accent-main" />
							<div>
								<p className="font-medium">Password</p>
								<p className="text-sm text-muted-foreground">
									Last changed:{' '}
									{user?.last_sign_in_at
										? new Date(user.last_sign_in_at).toLocaleDateString()
										: 'Never'}
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPasswordDialogOpen(true)}
						>
							Change Password
						</Button>
					</div>
				</div>
			</CardLayout>

			{/* Password Change Dialog */}
			<ChangePasswordDialog
				open={passwordDialogOpen}
				onOpenChange={setPasswordDialogOpen}
			/>
		</div>
	)
}
