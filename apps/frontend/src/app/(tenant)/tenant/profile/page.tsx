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

import type { FormEvent } from 'react'

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
} from '#components/ui/dialog'
import { useSupabaseUpdateProfileMutation } from '#hooks/api/use-auth'
import {
	useTenantNotificationPreferences,
	useUpdateTenantNotificationPreferences
} from '#hooks/api/use-tenant-portal'
import {
	useEmergencyContact,
	useUpdateEmergencyContact,
	useDeleteEmergencyContact
} from '#hooks/api/use-emergency-contact'
import { useCurrentUser } from '#hooks/use-current-user'
import { handleMutationError } from '#lib/mutation-error-handler'
import { emailSchema } from '@repo/shared/validation/common'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PersonalInformationSection } from '#components/profiles/tenant/personal-information-section'
import { EmergencyContactSection } from '#components/profiles/tenant/emergency-contact-section'
import { NotificationPreferencesSection } from '#components/profiles/tenant/notification-preferences-section'
import { AccountSecuritySection } from '#components/profiles/tenant/account-security-section'

export default function TenantProfilePage() {
	const [isEditing, setIsEditing] = useState(false)
	const [emergency_contactEditing, setEmergencyContactEditing] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [showChangePasswordDialog, setShowChangePasswordDialog] =
		useState(false)
	const { user, isLoading: authLoading } = useCurrentUser()
	const updateProfile = useSupabaseUpdateProfileMutation()

	// Notification preferences (uses authenticated context - no tenant ID needed)
	const { data: notificationPrefs, isLoading: prefsLoading } =
		useTenantNotificationPreferences()
	const updatePreferences = useUpdateTenantNotificationPreferences()

	// Emergency contact (uses authenticated context - no tenant ID needed)
	const { data: emergency_contact, isLoading: emergency_contactLoading } =
		useEmergencyContact()
	const updateEmergencyContact = useUpdateEmergencyContact()
	const deleteEmergencyContact = useDeleteEmergencyContact()

	// Form state
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		phone: ''
	})

	// Emergency contact form state
	const [emergency_contactForm, setEmergencyContactForm] = useState({
		name: '',
		relationship: '',
		phone: ''
	})

	// Sync form with user data
	useEffect(() => {
		if (user) {
			queueMicrotask(() => {
				setFormData({
					first_name: (user.user_metadata?.first_name || '') as string,
					last_name: (user.user_metadata?.last_name || '') as string,
					email: (user.email || '') as string,
					phone: (user.user_metadata?.phone || '') as string
				})
			})
		}
	}, [user])

	// Sync emergency contact form with data
	useEffect(() => {
		if (emergency_contact) {
			setEmergencyContactForm({
				name: emergency_contact.name || '',
				relationship: emergency_contact.relationship || '',
				phone: emergency_contact.phone || ''
			})
		}
	}, [emergency_contact])

	const handleSave = async (e: FormEvent) => {
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

	const handleCancelEdit = () => {
		setIsEditing(false)
		if (user) {
			setFormData({
				first_name: (user.user_metadata?.first_name || '') as string,
				last_name: (user.user_metadata?.last_name || '') as string,
				email: (user.email || '') as string,
				phone: (user.user_metadata?.phone || '') as string
			})
		}
	}

	const isLoading = authLoading || updateProfile.isPending

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

	const handleSaveEmergencyContact = async (e: FormEvent) => {
		e.preventDefault()

		// Validate required fields
		if (
			!emergency_contactForm.name ||
			!emergency_contactForm.phone
		) {
			toast.error('Please fill in name and phone number')
			return
		}

		try {
			// Use PUT to upsert (create or update)
			await updateEmergencyContact.mutateAsync({
				name: emergency_contactForm.name,
				phone: emergency_contactForm.phone,
				relationship: emergency_contactForm.relationship || null
			})
			setEmergencyContactEditing(false)
		} catch (error) {
			handleMutationError(error, 'Save emergency contact')
		}
	}

	const handleDeleteEmergencyContact = () => {
		if (!emergency_contact) return
		setDeleteDialogOpen(true)
	}

	const confirmDeleteEmergencyContact = async () => {
		if (!emergency_contact) return

		try {
			await deleteEmergencyContact.mutateAsync()
			setEmergencyContactForm({
				name: '',
				relationship: '',
				phone: ''
			})
			setEmergencyContactEditing(false)
			setDeleteDialogOpen(false)
		} catch (error) {
			handleMutationError(error, 'Delete emergency contact')
		}
	}

	const handleCancelEmergencyContactEdit = () => {
		if (emergency_contact) {
			setEmergencyContactForm({
				name: emergency_contact.name || '',
				relationship: emergency_contact.relationship || '',
				phone: emergency_contact.phone || ''
			})
		} else {
			setEmergencyContactForm({
				name: '',
				relationship: '',
				phone: ''
			})
		}
		setEmergencyContactEditing(false)
	}

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="typography-h1">My Profile</h1>
				<p className="text-muted-foreground">
					Manage your contact information and account settings
				</p>
			</div>

			<PersonalInformationSection
				formData={formData}
				isEditing={isEditing}
				isLoading={isLoading}
				onEditToggle={setIsEditing}
				onChange={handleChange}
				onSave={handleSave}
				onCancel={handleCancelEdit}
			/>

			<EmergencyContactSection
				formData={emergency_contactForm}
				hasExistingContact={!!emergency_contact}
				isEditing={emergency_contactEditing}
				isLoading={emergency_contactLoading || deleteEmergencyContact.isPending}
				isSaving={updateEmergencyContact.isPending}
				onEditToggle={setEmergencyContactEditing}
				onChange={handleEmergencyContactChange}
				onSave={handleSaveEmergencyContact}
				onCancel={handleCancelEmergencyContactEdit}
				onDelete={handleDeleteEmergencyContact}
			/>

			<NotificationPreferencesSection
				preferences={notificationPrefs}
				isLoading={prefsLoading}
				isSaving={updatePreferences.isPending}
				onToggle={handleTogglePreference}
			/>

			<AccountSecuritySection
				lastSignInAt={user?.last_sign_in_at}
				onChangePassword={() => setShowChangePasswordDialog(true)}
			/>

			<ChangePasswordDialog
				open={showChangePasswordDialog}
				onOpenChange={setShowChangePasswordDialog}
			/>

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
