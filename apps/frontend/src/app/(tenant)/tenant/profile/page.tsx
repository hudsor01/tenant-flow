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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Field, FieldLabel } from '#components/ui/field'
import { ToggleSwitch } from '#components/ui/toggle-switch'
import { useSupabaseUpdateProfile } from '#hooks/api/use-auth'
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
import { useUserProfile } from '#hooks/use-user-profile'
import { handleMutationError } from '#lib/mutation-error-handler'
import { emailSchema } from '@repo/shared/validation/common'
import { Bell, Mail, Phone, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useModalStore } from '#stores/modal-store'

export default function TenantProfilePage() {
	const [isEditing, setIsEditing] = useState(false)
	const [emergency_contactEditing, setEmergencyContactEditing] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const { openModal } = useModalStore()
	const { user, isLoading: authLoading } = useCurrentUser()
	const { data: profile, isLoading: profileLoading } = useUserProfile()
	const updateProfile = useSupabaseUpdateProfile()

	// Notification preferences (get tenant ID from profile)
	const tenant_id = profile?.id || ''
	const { data: notificationPrefs, isLoading: prefsLoading } =
		useNotificationPreferences(tenant_id)
	const updatePreferences = useUpdateNotificationPreferences(tenant_id)

	// Emergency contact
	const { data: emergency_contact, isLoading: emergency_contactLoading } =
		useEmergencyContact(tenant_id)
	const createEmergencyContact = useCreateEmergencyContact(tenant_id)
	const updateEmergencyContact = useUpdateEmergencyContact(tenant_id)
	const deleteEmergencyContact = useDeleteEmergencyContact(tenant_id)

	// Form state
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		phone: ''
	})

	// Emergency contact form state
	const [emergency_contactForm, setEmergencyContactForm] = useState({
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
					first_name: (user?.user_metadata?.first_name ||
						profile?.first_name ||
						'') as string,
					last_name: (user?.user_metadata?.last_name ||
						profile?.last_name ||
						'') as string,
					email: (user?.email || '') as string,
					phone: (user?.user_metadata?.phone || '') as string
				})
			})
		}
	}, [user, profile])

	// Sync emergency contact form with data
	useEffect(() => {
		if (emergency_contact) {
			setEmergencyContactForm({
				contactName: emergency_contact.contactName,
				relationship: emergency_contact.relationship,
				phoneNumber: emergency_contact.phoneNumber,
				email: emergency_contact.email || ''
			})
		}
	}, [emergency_contact])

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validate email format if provided
		if (formData.email && formData.email.trim()) {
			const emailResult = emailSchema.safeParse(formData.email)
			if (!emailResult.success) {
				toast.error('Please enter a valid email address')
				return
			}
		}

		// Validate phone format if provided
		if (formData.phone && formData.phone.trim()) {
			const phoneRegex = /^\+?[\d\s\-()]+$/
			if (
				!phoneRegex.test(formData.phone) ||
				formData.phone.replace(/\D/g, '').length < 10
			) {
				toast.error('Please enter a valid phone number (at least 10 digits)')
				return
			}
		}

		try {
			await updateProfile.mutateAsync({
				first_name: formData.first_name,
				last_name: formData.last_name,
				phone: formData.phone
			})
			setIsEditing(false)
		} catch (error) {
			handleMutationError(error, 'Update profile')
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
			handleMutationError(error, 'Update notification preference')
		}
	}

	const handleEmergencyContactChange = (
		field: keyof typeof emergency_contactForm,
		value: string
	) => {
		setEmergencyContactForm(prev => ({ ...prev, [field]: value }))
	}

	const handleSaveEmergencyContact = async (e: React.FormEvent) => {
		e.preventDefault()

		// Validate required fields
		if (
			!emergency_contactForm.contactName ||
			!emergency_contactForm.relationship ||
			!emergency_contactForm.phoneNumber
		) {
			toast.error('Please fill in all required fields')
			return
		}

		try {
			if (emergency_contact) {
				// Update existing contact
				await updateEmergencyContact.mutateAsync({
					contactName: emergency_contactForm.contactName,
					relationship: emergency_contactForm.relationship,
					phoneNumber: emergency_contactForm.phoneNumber,
					email: emergency_contactForm.email || null
				})
			} else {
				// Create new contact
				await createEmergencyContact.mutateAsync({
					contactName: emergency_contactForm.contactName,
					relationship: emergency_contactForm.relationship,
					phoneNumber: emergency_contactForm.phoneNumber,
					email: emergency_contactForm.email || null
				})
			}
			setEmergencyContactEditing(false)
		} catch (error) {
			handleMutationError(error, 'Save emergency contact')
		}
	}

	const handleDeleteEmergencyContact = async () => {
		if (!emergency_contact) return
		setDeleteDialogOpen(true)
	}

	const confirmDeleteEmergencyContact = async () => {
		if (!emergency_contact) return

		try {
			await deleteEmergencyContact.mutateAsync()
		setEmergencyContactForm({
			contactName: '',
			relationship: '',
			phoneNumber: '',
			email: ''
		})
			setEmergencyContactEditing(false)
			setDeleteDialogOpen(false)
		} catch (error) {
			handleMutationError(error, 'Delete emergency contact')
		}
	}

	const handleCancelEmergencyContactEdit = () => {
		if (emergency_contact) {
			// Reset to existing data
			setEmergencyContactForm({
				contactName: emergency_contact.contactName,
				relationship: emergency_contact.relationship,
				phoneNumber: emergency_contact.phoneNumber,
				email: emergency_contact.email || ''
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
								value={formData.first_name}
								onChange={e => handleChange('first_name', e.target.value)}
								disabled={!isEditing || isLoading}
								required
							/>
						</Field>

						<Field>
							<FieldLabel>Last Name *</FieldLabel>
							<input
								type="text"
								className="input w-full"
								value={formData.last_name}
								onChange={e => handleChange('last_name', e.target.value)}
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
												first_name: (user?.user_metadata?.first_name ||
													profile?.first_name ||
													'') as string,
												last_name: (user?.user_metadata?.last_name ||
													profile?.last_name ||
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
								value={emergency_contactForm.contactName}
								onChange={e =>
									handleEmergencyContactChange('contactName', e.target.value)
								}
								disabled={
									!emergency_contactEditing ||
									emergency_contactLoading ||
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
								value={emergency_contactForm.relationship}
								onChange={e =>
									handleEmergencyContactChange('relationship', e.target.value)
								}
								disabled={
									!emergency_contactEditing ||
									emergency_contactLoading ||
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
							value={emergency_contactForm.phoneNumber}
							onChange={e =>
								handleEmergencyContactChange('phoneNumber', e.target.value)
							}
							disabled={
								!emergency_contactEditing ||
								emergency_contactLoading ||
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
							value={emergency_contactForm.email}
							onChange={e =>
								handleEmergencyContactChange('email', e.target.value)
							}
							disabled={
								!emergency_contactEditing ||
								emergency_contactLoading ||
								createEmergencyContact.isPending ||
								updateEmergencyContact.isPending
							}
						/>
					</Field>

					{!emergency_contact && !emergency_contactEditing && (
						<p className="text-sm text-center text-muted-foreground py-4">
							No emergency contact on file
						</p>
					)}

					<div className="flex gap-4">
						{!emergency_contactEditing ? (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => setEmergencyContactEditing(true)}
									disabled={emergency_contactLoading}
								>
									{emergency_contact
										? 'Edit Emergency Contact'
										: 'Add Emergency Contact'}
								</Button>
								{emergency_contact && (
									<Button
										type="button"
										variant="outline"
										onClick={handleDeleteEmergencyContact}
										disabled={
											emergency_contactLoading ||
											deleteEmergencyContact.isPending
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
										emergency_contactLoading ||
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
										emergency_contactLoading ||
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
					<ToggleSwitch
						icon={Bell}
						label="Rent Reminders"
						description="Get notified before rent is due"
						checked={notificationPrefs?.rentReminders ?? true}
						disabled={prefsLoading || updatePreferences.isPending}
						onChange={checked =>
							handleTogglePreference('rentReminders', checked)
						}
					/>

					<ToggleSwitch
						icon={Bell}
						label="Maintenance Updates"
						description="Updates on your maintenance requests"
						checked={notificationPrefs?.maintenanceUpdates ?? true}
						disabled={prefsLoading || updatePreferences.isPending}
						onChange={checked =>
							handleTogglePreference('maintenanceUpdates', checked)
						}
					/>

					<ToggleSwitch
						icon={Bell}
						label="Property Notices"
						description="Important announcements and updates"
						checked={notificationPrefs?.propertyNotices ?? true}
						disabled={prefsLoading || updatePreferences.isPending}
						onChange={checked =>
							handleTogglePreference('propertyNotices', checked)
						}
					/>
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
							onClick={() => openModal('change-password')}
						>
							Change Password
						</Button>
					</div>
				</div>
			</CardLayout>

			{/* Password Change Dialog */}
			<ChangePasswordDialog />

			{/* Delete Emergency Contact Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Emergency Contact</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove this emergency contact? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeleteEmergencyContact}>
							Remove Contact
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
