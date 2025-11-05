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
import { Field, FieldLabel } from '#components/ui/field'
import { Bell, Lock, User, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function TenantSettingsPage() {
	const [emailNotifications, setEmailNotifications] = useState(true)
	const [smsNotifications, setSmsNotifications] = useState(false)
	const [maintenanceUpdates, setMaintenanceUpdates] = useState(true)
	const [paymentReminders, setPaymentReminders] = useState(true)

	const handleSaveNotifications = () => {
		// TODO: Implement actual save functionality
		toast.success('Notification preferences saved')
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
				icon={<Bell className="size-5" />}
			>
				<div className="space-y-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel>Email Notifications</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive updates via email
								</p>
							</div>
							<input
								type="checkbox"
								checked={emailNotifications}
								onChange={(e) => setEmailNotifications(e.target.checked)}
								className="size-4 rounded border-gray-300"
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel>SMS Notifications</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive updates via text message
								</p>
							</div>
							<input
								type="checkbox"
								checked={smsNotifications}
								onChange={(e) => setSmsNotifications(e.target.checked)}
								className="size-4 rounded border-gray-300"
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel>Maintenance Updates</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Get notified about maintenance request status
								</p>
							</div>
							<input
								type="checkbox"
								checked={maintenanceUpdates}
								onChange={(e) => setMaintenanceUpdates(e.target.checked)}
								className="size-4 rounded border-gray-300"
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<FieldLabel>Payment Reminders</FieldLabel>
								<p className="text-sm text-muted-foreground">
									Receive reminders before rent is due
								</p>
							</div>
							<input
								type="checkbox"
								checked={paymentReminders}
								onChange={(e) => setPaymentReminders(e.target.checked)}
								className="size-4 rounded border-gray-300"
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<Button onClick={handleSaveNotifications}>
							Save Preferences
						</Button>
					</div>
				</div>
			</CardLayout>

			{/* Security Settings */}
			<CardLayout
				title="Security"
				description="Manage your account security"
				icon={<Lock className="size-5" />}
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
				icon={<User className="size-5" />}
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
