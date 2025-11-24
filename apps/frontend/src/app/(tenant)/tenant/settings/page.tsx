/**
 * Tenant Settings Page
 *
 * Allows tenants to manage:
 * - Notification preferences
 * - Account settings
 * - Password changes
 * - Privacy settings
 */

'use client'

import { TenantGuard } from '#components/auth/tenant-guard'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Checkbox } from '#components/ui/checkbox'
import { FieldLabel } from '#components/ui/field'
import {
	useNotificationPreferences,
	useUpdateNotificationPreferences
} from '#hooks/api/use-notification-preferences'
import { useUserProfile } from '#hooks/use-user-profile'
// Icons removed - CardLayout doesn't support icon prop
import { useEffect, useState } from 'react'

export default function TenantSettingsPage() {
	// Get tenant ID from user profile
	const { data: profile } = useUserProfile()
	const tenant_id = profile?.id || ''

	// Fetch notification preferences
	const { data: preferences, isLoading: prefsLoading } =
		useNotificationPreferences(tenant_id)
	const updatePreferences = useUpdateNotificationPreferences(tenant_id)

	// Local state for form
	const [emailNotifications, setEmailNotifications] = useState(true)
	const [smsNotifications, setSmsNotifications] = useState(false)
	const [maintenanceUpdates, setMaintenanceUpdates] = useState(true)
	const [rentReminders, setRentReminders] = useState(true)

	// Sync form state with fetched preferences
	useEffect(() => {
		if (preferences) {
			setEmailNotifications(preferences.emailNotifications ?? true)
			setSmsNotifications(preferences.smsNotifications ?? false)
			setMaintenanceUpdates(preferences.maintenanceUpdates ?? true)
			setRentReminders(preferences.rentReminders ?? true)
		}
	}, [preferences])

	const handleSaveNotifications = async () => {
		if (!tenant_id) return

		await updatePreferences.mutateAsync({
			emailNotifications,
			smsNotifications,
			maintenanceUpdates,
			rentReminders
		})
	}

	return (
		<TenantGuard>
		<div className="max-w-4xl mx-auto space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Manage your account preferences and settings
				</p>
			</div>

			{/* Notification Settings */}
			<CardLayout
				title="Notification Preferences"
				description="Choose how you want to receive updates"
			>
				<div className="space-y-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel htmlFor="email-notifications">Email Notifications</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive updates via email
								</p>
							</div>
							<Checkbox
								id="email-notifications"
								checked={emailNotifications}
								onCheckedChange={(checked) => setEmailNotifications(!!checked)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel htmlFor="sms-notifications">SMS Notifications</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive updates via text message
								</p>
							</div>
							<Checkbox
								id="sms-notifications"
								checked={smsNotifications}
								onCheckedChange={(checked) => setSmsNotifications(!!checked)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel htmlFor="maintenance-updates">Maintenance Updates</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Get notified about maintenance request status
								</p>
							</div>
							<Checkbox
								id="maintenance-updates"
								checked={maintenanceUpdates}
								onCheckedChange={(checked) => setMaintenanceUpdates(!!checked)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel htmlFor="rent-reminders">Rent Reminders</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive reminders before rent is due
								</p>
							</div>
							<Checkbox
								id="rent-reminders"
								checked={rentReminders}
								onCheckedChange={(checked) => setRentReminders(!!checked)}
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={handleSaveNotifications}
							disabled={!tenant_id || updatePreferences.isPending || prefsLoading}
						>
							{updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
						</Button>
					</div>
				</div>
			</CardLayout>

			{/* Security Settings */}
			<CardLayout
				title="Security"
				description="Manage your account security"
			>
				<div className="space-y-4">
					<div>
						<FieldLabel>Change Password</FieldLabel>
						<p className="text-sm text-muted-foreground mb-3">
							Update your password to keep your account secure
						</p>
						<Button variant="outline">Change Password</Button>
					</div>

					<div className="pt-4 border-t">
						<FieldLabel>Two-Factor Authentication</FieldLabel>
						<p className="text-sm text-muted-foreground mb-3">
							Add an extra layer of security to your account
						</p>
						<Button variant="outline">Enable 2FA</Button>
					</div>
				</div>
			</CardLayout>

			{/* Account Settings */}
			<CardLayout
				title="Account Information"
				description="Manage your account details"
			>
				<div className="space-y-4">
					<div>
						<FieldLabel>Email Address</FieldLabel>
						<p className="text-sm text-muted-foreground mb-3">
							Update the email address associated with your account
						</p>
						<Button variant="outline">Update Email</Button>
					</div>

					<div className="pt-4 border-t">
						<FieldLabel>Account Privacy</FieldLabel>
						<p className="text-sm text-muted-foreground mb-3">
							Manage your privacy and data sharing preferences
						</p>
						<Button variant="outline">Privacy Settings</Button>
					</div>
				</div>
			</CardLayout>

			{/* Danger Zone */}
			<CardLayout
				title="Danger Zone"
				description="Irreversible account actions"
				className="border-destructive/50"
			>
				<div className="space-y-4">
					<div>
						<FieldLabel className="text-destructive">Close Account</FieldLabel>
						<p className="text-sm text-muted-foreground mb-3">
							Permanently close your tenant account. This action cannot be undone.
						</p>
						<Button variant="destructive" disabled>
							Close Account
						</Button>
						<p className="text-xs text-muted-foreground mt-2">
							Please contact your property manager to close your account
						</p>
					</div>
				</div>
			</CardLayout>
		</div>
		</TenantGuard>
	)
}
