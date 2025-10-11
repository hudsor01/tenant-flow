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

import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Field, FieldLabel } from '@/components/ui/field'
import { useSupabaseUpdateProfile } from '@/hooks/api/use-supabase-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useUserProfile } from '@/hooks/use-user-role'
import { logger } from '@repo/shared/lib/frontend-logger'
import { Bell, Mail, Phone, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TenantProfilePage() {
	const [isEditing, setIsEditing] = useState(false)
	const { user, isLoading: authLoading } = useCurrentUser()
	const { data: profile, isLoading: profileLoading } = useUserProfile()
	const updateProfile = useSupabaseUpdateProfile()

	// Form state
	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		email: '',
		phone: ''
	})

	// Sync form with user data
	useEffect(() => {
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
	}, [user, profile])

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
								<Mail className="h-4 w-4" />
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
								<Phone className="h-4 w-4" />
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
				<div className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<Field>
							<FieldLabel>Contact Name</FieldLabel>
							<input
								type="text"
								className="input w-full"
								placeholder="Full name"
							/>
						</Field>

						<Field>
							<FieldLabel>Relationship</FieldLabel>
							<input
								type="text"
								className="input w-full"
								placeholder="e.g., Spouse, Parent"
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel>
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								<span>Phone Number</span>
							</div>
						</FieldLabel>
						<input
							type="tel"
							className="input w-full"
							placeholder="(555) 123-4567"
						/>
					</Field>

					<p className="text-sm text-center text-muted-foreground py-4">
						No emergency contact on file
					</p>

					<Button variant="outline">Add Emergency Contact</Button>
				</div>
			</CardLayout>

			{/* Notification Preferences */}
			<CardLayout
				title="Notification Preferences"
				description="Choose how you want to be notified"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="h-5 w-5 text-accent-main" />
							<div>
								<p className="font-medium">Rent Reminders</p>
								<p className="text-sm text-muted-foreground">
									Get notified before rent is due
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main"></div>
						</label>
					</div>

					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="h-5 w-5 text-accent-main" />
							<div>
								<p className="font-medium">Maintenance Updates</p>
								<p className="text-sm text-muted-foreground">
									Updates on your maintenance requests
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main"></div>
						</label>
					</div>

					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div className="flex items-center gap-3">
							<Bell className="h-5 w-5 text-accent-main" />
							<div>
								<p className="font-medium">Property Notices</p>
								<p className="text-sm text-muted-foreground">
									Important announcements and updates
								</p>
							</div>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" className="sr-only peer" defaultChecked />
							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-main/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-main"></div>
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
							<Shield className="h-5 w-5 text-accent-main" />
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
						<Button variant="outline" size="sm">
							Change Password
						</Button>
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
