'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
	Bell,
	Building2,
	CreditCard,
	Globe,
	Key,
	Mail,
	MessageSquare,
	Shield,
	Smartphone,
	User,
	CheckCircle,
	ChevronRight,
	LogOut,
	Eye,
	EyeOff,
	Loader2,
	AlertTriangle,
	Moon,
	Sun,
	Monitor,
	ExternalLink,
	LayoutGrid,
	LayoutList,
	ShieldCheck,
	ShieldOff
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Skeleton } from '#components/ui/skeleton'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Switch } from '#components/ui/switch'
import { usePreferencesStore, useDataDensity } from '#providers/preferences-provider'
import { useSubscriptionStatus } from '#hooks/api/use-subscription-status'
import { usePaymentHistory } from '#hooks/api/use-payment-history'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { toast } from 'sonner'
import { createClient } from '#utils/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '#lib/formatters/currency'
import type { ThemeMode } from '@repo/shared/types/domain'
import type { DataDensity } from '#stores/preferences-store'
import {
	useOwnerNotificationSettings,
	useUpdateOwnerNotificationSettings
} from '#hooks/api/use-notification-settings'
import { useUserSessions, useRevokeSession } from '#hooks/api/use-sessions'
import {
	useMfaStatus,
	useMfaFactors
} from '#hooks/api/use-mfa'
import {
	TwoFactorSetupDialog,
	DisableTwoFactorDialog
} from '#components/auth/two-factor-setup-dialog'
import { PasswordStrength } from '#components/auth/password-strength'

type SettingsTab = 'general' | 'notifications' | 'security' | 'billing'

interface SettingsSection {
	id: SettingsTab
	label: string
	icon: React.ReactNode
	description: string
}

const sections: SettingsSection[] = [
	{ id: 'general', label: 'General', icon: <Building2 className="h-4 w-4" />, description: 'Business profile and preferences' },
	{ id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, description: 'Email, SMS, and push settings' },
	{ id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" />, description: 'Password and authentication' },
	{ id: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" />, description: 'Subscription and payment info' }
]

// ============================================================================
// GENERAL SETTINGS TAB
// ============================================================================
function GeneralSettings() {
	const themeMode = usePreferencesStore(state => state.themeMode)
	const setThemeMode = usePreferencesStore(state => state.setThemeMode)
	const { dataDensity, setDataDensity } = useDataDensity()
	const supabase = createClient()

	// Fetch current user profile
	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ['user-profile'],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('users')
				.select('first_name, last_name, email, phone')
				.eq('id', user.id)
				.single()

			if (error) throw error
			return data
		},
		staleTime: 5 * 60 * 1000
	})

	// Fetch company profile from stripe_connected_accounts
	const { data: companyProfile, isLoading: companyLoading } = useQuery({
		queryKey: ['company-profile'],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('stripe_connected_accounts')
				.select('business_name, business_type')
				.eq('user_id', user.id)
				.maybeSingle()

			if (error) throw error
			return data
		},
		staleTime: 5 * 60 * 1000
	})

	const [businessName, setBusinessName] = React.useState('')
	const [contactEmail, setContactEmail] = React.useState('')
	const [phone, setPhone] = React.useState('')
	const [timezone, setTimezone] = React.useState('America/Chicago')
	const [language, setLanguage] = React.useState('en-US')

	// Update form when data loads
	React.useEffect(() => {
		if (companyProfile?.business_name) {
			setBusinessName(companyProfile.business_name)
		}
		if (profile?.email) {
			setContactEmail(profile.email)
		}
		if (profile?.phone) {
			setPhone(profile.phone)
		}
	}, [companyProfile, profile])

	const queryClient = useQueryClient()

	// Update profile mutation
	const updateProfile = useMutation({
		mutationFn: async (updates: { phone?: string; email?: string }) => {
			return apiRequest('/api/v1/users/profile', {
				method: 'PATCH',
				body: JSON.stringify(updates)
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-profile'] })
			toast.success('Profile updated successfully')
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to update profile')
		}
	})

	const handleThemeChange = (value: string) => {
		setThemeMode(value as ThemeMode)
	}

	const handleDensityChange = (value: string) => {
		setDataDensity(value as DataDensity)
	}

	const handleSaveChanges = () => {
		const updates: { phone?: string; email?: string } = {}
		if (phone !== profile?.phone) {
			updates.phone = phone
		}
		if (Object.keys(updates).length > 0) {
			updateProfile.mutate(updates)
		} else {
			toast.info('No changes to save')
		}
	}

	const isLoading = profileLoading || companyLoading

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-64 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">General Settings</h2>
					<p className="text-sm text-muted-foreground">Manage your business profile and preferences</p>
				</div>
			</BlurFade>

			{/* Business Profile */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Business Profile</h3>

					<div className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="businessName">Business Name</Label>
							<Input
								id="businessName"
								type="text"
								value={businessName}
								onChange={(e) => setBusinessName(e.target.value)}
								placeholder="Your business name"
								className="h-10"
							/>
							<p className="text-xs text-muted-foreground">
								Business name is managed through Stripe Connect
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<Input
									id="contactEmail"
									type="email"
									value={contactEmail}
									onChange={(e) => setContactEmail(e.target.value)}
									placeholder="contact@example.com"
									className="h-10 flex-1"
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="phone">Phone Number</Label>
							<div className="flex items-center gap-2">
								<Smartphone className="h-4 w-4 text-muted-foreground" />
								<Input
									id="phone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="(555) 123-4567"
									className="h-10 flex-1"
								/>
							</div>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Preferences */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Preferences</h3>

					<div className="space-y-4">
						{/* Theme */}
						<div className="grid gap-2">
							<Label>Theme</Label>
							<Select value={themeMode} onValueChange={handleThemeChange}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="system">
										<div className="flex items-center gap-2">
											<Monitor className="h-4 w-4" />
											System
										</div>
									</SelectItem>
									<SelectItem value="light">
										<div className="flex items-center gap-2">
											<Sun className="h-4 w-4" />
											Light
										</div>
									</SelectItem>
									<SelectItem value="dark">
										<div className="flex items-center gap-2">
											<Moon className="h-4 w-4" />
											Dark
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Data Density */}
						<div className="grid gap-2">
							<Label>Data Density</Label>
							<Select value={dataDensity} onValueChange={handleDensityChange}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="compact">
										<div className="flex items-center gap-2">
											<LayoutList className="h-4 w-4" />
											Compact
										</div>
									</SelectItem>
									<SelectItem value="comfortable">
										<div className="flex items-center gap-2">
											<LayoutGrid className="h-4 w-4" />
											Comfortable
										</div>
									</SelectItem>
									<SelectItem value="spacious">
										<div className="flex items-center gap-2">
											<LayoutGrid className="h-4 w-4" />
											Spacious
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Controls spacing and row heights in tables and lists
							</p>
						</div>

						{/* Timezone */}
						<div className="grid gap-2">
							<Label>Timezone</Label>
							<Select value={timezone} onValueChange={setTimezone}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
									<SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
									<SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
									<SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Language */}
						<div className="grid gap-2">
							<Label>Language</Label>
							<Select value={language} onValueChange={setLanguage}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en-US">English (US)</SelectItem>
									<SelectItem value="es">Spanish (ES)</SelectItem>
									<SelectItem value="fr">French (FR)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Save Button */}
			<BlurFade delay={0.35} inView>
				<div className="flex justify-end">
					<Button
						onClick={handleSaveChanges}
						disabled={updateProfile.isPending}
					>
						{updateProfile.isPending ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							'Save Changes'
						)}
					</Button>
				</div>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// NOTIFICATIONS TAB - Connected to real API
// ============================================================================
function NotificationSettings() {
	const { data: settings, isLoading } = useOwnerNotificationSettings()
	const updateSettings = useUpdateOwnerNotificationSettings()

	const handleChannelToggle = (channel: 'email' | 'sms' | 'push' | 'inApp', value: boolean) => {
		updateSettings.mutate({ [channel]: value })
	}

	const handleCategoryToggle = (category: 'maintenance' | 'leases' | 'general', value: boolean) => {
		updateSettings.mutate({
			categories: { [category]: value }
		})
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-24 rounded-lg" />
				<Skeleton className="h-64 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Notification Settings</h2>
					<p className="text-sm text-muted-foreground">Choose how you want to be notified</p>
				</div>
			</BlurFade>

			{/* Channel Toggles */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Notification Channels</h3>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Email Notifications</p>
									<p className="text-xs text-muted-foreground">Receive updates via email</p>
								</div>
							</div>
							<Switch
								checked={settings?.email ?? true}
								onCheckedChange={(checked) => handleChannelToggle('email', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<MessageSquare className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">SMS Notifications</p>
									<p className="text-xs text-muted-foreground">Receive text messages</p>
								</div>
							</div>
							<Switch
								checked={settings?.sms ?? false}
								onCheckedChange={(checked) => handleChannelToggle('sms', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Bell className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Push Notifications</p>
									<p className="text-xs text-muted-foreground">Browser push notifications</p>
								</div>
							</div>
							<Switch
								checked={settings?.push ?? true}
								onCheckedChange={(checked) => handleChannelToggle('push', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">In-App Notifications</p>
									<p className="text-xs text-muted-foreground">Show notifications in the app</p>
								</div>
							</div>
							<Switch
								checked={settings?.inApp ?? true}
								onCheckedChange={(checked) => handleChannelToggle('inApp', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Category Preferences */}
			<BlurFade delay={0.2} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Notification Categories</h3>

					<div className="space-y-4">
						<div className="flex items-center justify-between py-2">
							<div>
								<p className="text-sm font-medium">Maintenance Requests</p>
								<p className="text-xs text-muted-foreground">When tenants submit new maintenance requests</p>
							</div>
							<Switch
								checked={settings?.categories?.maintenance ?? true}
								onCheckedChange={(checked) => handleCategoryToggle('maintenance', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between py-2">
							<div>
								<p className="text-sm font-medium">Lease Updates</p>
								<p className="text-xs text-muted-foreground">Lease expirations, renewals, and signatures</p>
							</div>
							<Switch
								checked={settings?.categories?.leases ?? true}
								onCheckedChange={(checked) => handleCategoryToggle('leases', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between py-2">
							<div>
								<p className="text-sm font-medium">General Notifications</p>
								<p className="text-xs text-muted-foreground">System updates and announcements</p>
							</div>
							<Switch
								checked={settings?.categories?.general ?? true}
								onCheckedChange={(checked) => handleCategoryToggle('general', checked)}
								disabled={updateSettings.isPending}
							/>
						</div>
					</div>
				</section>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// SECURITY TAB - Connected to real MFA and Sessions
// ============================================================================
function SecuritySettings() {
	const supabase = createClient()
	const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
	const [currentPassword, setCurrentPassword] = React.useState('')
	const [newPassword, setNewPassword] = React.useState('')
	const [confirmPassword, setConfirmPassword] = React.useState('')

	// Real MFA status from API
	const { data: mfaStatus, isLoading: mfaLoading } = useMfaStatus()
	const { data: mfaFactors } = useMfaFactors()

	// Real sessions from API
	const { data: sessions, isLoading: sessionsLoading } = useUserSessions()
	const revokeSession = useRevokeSession()

	// 2FA dialogs
	const [show2FASetup, setShow2FASetup] = React.useState(false)
	const [show2FADisable, setShow2FADisable] = React.useState(false)

	const is2FAEnabled = mfaStatus?.isMfaEnabled ?? false
	const verifiedFactor = mfaFactors?.find(f => f.status === 'verified')

	// Password update mutation
	const updatePassword = useMutation({
		mutationFn: async () => {
			if (newPassword !== confirmPassword) {
				throw new Error('Passwords do not match')
			}
			if (newPassword.length < 8) {
				throw new Error('Password must be at least 8 characters')
			}

			const { data: { user }, error: userError } = await supabase.auth.getUser()
			if (userError || !user?.email) throw new Error('Unable to verify user')

			// Verify current password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword
			})
			if (signInError) throw new Error('Current password is incorrect')

			// Update password
			const { error } = await supabase.auth.updateUser({ password: newPassword })
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Password updated successfully')
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to update password')
		}
	})

	const handlePasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		updatePassword.mutate()
	}

	const handleRevokeSession = (sessionId: string) => {
		revokeSession.mutate(sessionId)
	}

	const isLoading = mfaLoading || sessionsLoading

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-6 w-48 mb-2" />
				<Skeleton className="h-48 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Security Settings</h2>
					<p className="text-sm text-muted-foreground">Manage your password and authentication methods</p>
				</div>
			</BlurFade>

			{/* Password Section */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Password</h3>

					<form onSubmit={handlePasswordSubmit} className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="currentPassword">Current Password</Label>
							<div className="relative">
								<Input
									id="currentPassword"
									type={showCurrentPassword ? 'text' : 'password'}
									placeholder="Enter current password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									className="h-10 pr-10"
									autoComplete="current-password"
								/>
								<button
									type="button"
									onClick={() => setShowCurrentPassword(!showCurrentPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
								>
									{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="newPassword">New Password</Label>
							<PasswordStrength
								id="newPassword"
								placeholder="Enter new password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								disabled={updatePassword.isPending}
								showStrengthIndicator={true}
								minLength={8}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="confirmPassword">Confirm New Password</Label>
							<Input
								id="confirmPassword"
								type="password"
								placeholder="Confirm new password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="h-10"
								autoComplete="new-password"
							/>
							{confirmPassword && newPassword !== confirmPassword && (
								<p className="text-xs text-destructive flex items-center gap-1">
									<AlertTriangle className="h-3 w-3" />
									Passwords do not match
								</p>
							)}
							{confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
								<p className="text-xs text-primary flex items-center gap-1">
									<CheckCircle className="h-3 w-3" />
									Passwords match
								</p>
							)}
						</div>

						<div className="flex justify-end">
							<Button
								type="submit"
								variant="outline"
								disabled={
									updatePassword.isPending ||
									!currentPassword ||
									!newPassword ||
									!confirmPassword ||
									newPassword !== confirmPassword ||
									newPassword.length < 8
								}
							>
								{updatePassword.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Updating...
									</>
								) : (
									'Update Password'
								)}
							</Button>
						</div>
					</form>
				</section>
			</BlurFade>

			{/* Two-Factor Authentication */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam size={80} duration={10} variant="primary" />
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Two-Factor Authentication</h3>

					{is2FAEnabled ? (
						<div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
									<ShieldCheck className="h-5 w-5 text-emerald-600" />
								</div>
								<div>
									<p className="text-sm font-medium flex items-center gap-2">
										2FA is Enabled
										<CheckCircle className="h-4 w-4 text-emerald-600" />
									</p>
									<p className="text-xs text-muted-foreground">Your account is protected with authenticator app</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="text-destructive hover:bg-destructive/10"
								onClick={() => setShow2FADisable(true)}
							>
								<ShieldOff className="h-4 w-4 mr-2" />
								Disable
							</Button>
						</div>
					) : (
						<div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
									<Shield className="h-5 w-5 text-amber-600" />
								</div>
								<div>
									<p className="text-sm font-medium">2FA is Not Enabled</p>
									<p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
								</div>
							</div>
							<Button variant="outline" size="sm" onClick={() => setShow2FASetup(true)}>
								<Key className="h-4 w-4 mr-2" />
								Enable
							</Button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Active Sessions */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Sessions</h3>
					</div>

					<div className="space-y-3">
						{sessions && sessions.length > 0 ? (
							sessions.map((session, idx) => (
								<BlurFade key={session.id} delay={0.4 + idx * 0.05} inView>
									<div
										className={`flex items-center justify-between p-3 rounded-lg border ${
											session.is_current
												? 'bg-primary/5 border-primary/20'
												: 'hover:bg-muted/30 border-border'
										} transition-colors`}
									>
										<div className="flex items-center gap-3">
											<User className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium flex items-center gap-2">
													{session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
													{session.is_current && (
														<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{session.device === 'mobile' ? 'Mobile' : session.device === 'tablet' ? 'Tablet' : 'Desktop'} · Last active: {new Date(session.updated_at).toLocaleDateString()}
												</p>
											</div>
										</div>
										{!session.is_current && (
											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleRevokeSession(session.id)}
												disabled={revokeSession.isPending}
												className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
												aria-label="Sign out this device"
											>
												{revokeSession.isPending ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<LogOut className="h-4 w-4" />
												)}
											</Button>
										)}
									</div>
								</BlurFade>
							))
						) : (
							<p className="text-sm text-muted-foreground text-center py-4">No active sessions found</p>
						)}
					</div>
				</section>
			</BlurFade>

			{/* 2FA Dialogs */}
			<TwoFactorSetupDialog
				open={show2FASetup}
				onOpenChange={setShow2FASetup}
			/>

			{verifiedFactor && (
				<DisableTwoFactorDialog
					open={show2FADisable}
					onOpenChange={setShow2FADisable}
					factorId={verifiedFactor.id}
				/>
			)}
		</div>
	)
}

// ============================================================================
// BILLING TAB
// ============================================================================
function BillingSettings() {
	const supabase = createClient()
	const { data: subscriptionStatus, isLoading: statusLoading } = useSubscriptionStatus()
	const { data: paymentHistory, isLoading: historyLoading } = usePaymentHistory()

	// Fetch payment methods
	const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
		queryKey: ['payment-methods'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('payment_methods')
				.select('id, type, brand, last_four, exp_month, exp_year')
				.order('created_at', { ascending: false })
			if (error) throw error
			return data || []
		},
		staleTime: 2 * 60 * 1000
	})

	// Create billing portal session
	const createPortalSession = useMutation({
		mutationFn: async () => {
			return apiRequest<{ url: string }>(
				'/api/v1/stripe/create-billing-portal-session',
				{ method: 'POST' }
			)
		},
		onSuccess: (data) => {
			window.location.href = data.url
		},
		onError: (error) => {
			const message = error instanceof Error && error.message.includes('No Stripe customer')
				? 'Your billing account is not set up yet. Please contact support.'
				: 'Failed to open billing portal. Please try again.'
			toast.error(message)
		}
	})

	const isLoading = statusLoading || historyLoading || methodsLoading

	const getStatusBadge = (status: string | null) => {
		switch (status) {
			case 'active':
				return (
					<span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
						<CheckCircle className="w-3 h-3" />
						Active
					</span>
				)
			case 'trialing':
				return (
					<span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
						Trial
					</span>
				)
			case 'past_due':
				return (
					<span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
						Past Due
					</span>
				)
			case 'canceled':
				return (
					<span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
						Canceled
					</span>
				)
			default:
				return (
					<span className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
						No Subscription
					</span>
				)
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="mb-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64" />
				</div>
				<Skeleton className="h-40 rounded-lg" />
				<Skeleton className="h-32 rounded-lg" />
				<Skeleton className="h-48 rounded-lg" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Billing & Subscription</h2>
					<p className="text-sm text-muted-foreground">Manage your subscription and payment methods</p>
				</div>
			</BlurFade>

			{/* Current Plan */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border border-border bg-card p-6 relative overflow-hidden">
					<BorderBeam size={100} duration={12} variant="primary" />
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Plan</h3>

					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<h4 className="text-xl font-bold">
									{subscriptionStatus?.subscriptionStatus === 'active' ? 'Professional' : 'Free'}
								</h4>
								{getStatusBadge(subscriptionStatus?.subscriptionStatus ?? null)}
							</div>
							{subscriptionStatus?.subscriptionStatus === 'active' && (
								<>
									<p className="text-2xl font-bold text-primary">
										$49<span className="text-sm font-normal text-muted-foreground">/month</span>
									</p>
									<p className="text-sm text-muted-foreground mt-1">Up to 50 units · Unlimited tenants</p>
								</>
							)}
							{!subscriptionStatus?.subscriptionStatus && (
								<p className="text-sm text-muted-foreground mt-1">
									Upgrade to unlock premium features
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<Button
								onClick={() => createPortalSession.mutate()}
								disabled={createPortalSession.isPending}
							>
								{createPortalSession.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Loading...
									</>
								) : (
									<>
										Manage Plan
										<ExternalLink className="h-3 w-3 ml-2" />
									</>
								)}
							</Button>
							<Button variant="ghost" size="sm" className="text-muted-foreground">
								View All Plans
							</Button>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Payment Method */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Payment Method</h3>

					{paymentMethods && paymentMethods.length > 0 ? (
						<div className="space-y-3">
							{paymentMethods.map((pm: { id: string; brand: string | null; last_four: string | null; exp_month: number | null; exp_year: number | null }) => (
								<div key={pm.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-14 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white uppercase">
											{pm.brand || 'Card'}
										</div>
										<div>
											<p className="text-sm font-medium">**** **** **** {pm.last_four}</p>
											<p className="text-xs text-muted-foreground">
												Expires {pm.exp_month}/{pm.exp_year}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-primary"
										onClick={() => createPortalSession.mutate()}
									>
										Update Card
									</Button>
								</div>
							))}
						</div>
					) : (
						<div className="p-4 rounded-lg border border-dashed border-border text-center">
							<CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
							<p className="text-sm text-muted-foreground">No payment methods on file</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => createPortalSession.mutate()}
							>
								Add Payment Method
							</Button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Billing History */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border border-border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Billing History</h3>

					{paymentHistory && paymentHistory.length > 0 ? (
						<div className="space-y-2">
							{paymentHistory.slice(0, 5).map((invoice: { id: string; created_at: string; amount: number; status: string }, idx: number) => (
								<BlurFade key={invoice.id} delay={0.4 + idx * 0.05} inView>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors gap-2">
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium font-mono">{invoice.id.slice(0, 12)}...</span>
											<span className="text-sm text-muted-foreground">
												{new Date(invoice.created_at).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm font-medium tabular-nums">
												{formatCurrency(invoice.amount / 100)}
											</span>
											<span className={`inline-flex items-center gap-1 text-xs font-medium ${
												invoice.status === 'succeeded'
													? 'text-emerald-600'
													: 'text-amber-600'
											}`}>
												{invoice.status === 'succeeded' && <CheckCircle className="w-3 h-3" />}
												{invoice.status === 'succeeded' ? 'Paid' : invoice.status}
											</span>
											<button className="text-sm text-primary hover:underline">Download</button>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					) : (
						<div className="p-4 text-center">
							<p className="text-sm text-muted-foreground">No billing history yet</p>
						</div>
					)}

					{paymentHistory && paymentHistory.length > 5 && (
						<div className="mt-4 text-center">
							<Button variant="ghost" size="sm" onClick={() => createPortalSession.mutate()}>
								View All Invoices
							</Button>
						</div>
					)}
				</section>
			</BlurFade>

			{/* Danger Zone */}
			<BlurFade delay={0.55} inView>
				<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
					<h3 className="mb-4 text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
						<AlertTriangle className="h-4 w-4" />
						Danger Zone
					</h3>

					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium">Cancel Subscription</p>
							<p className="text-xs text-muted-foreground">Your data will be retained for 30 days after cancellation</p>
						</div>
						<Button
							variant="outline"
							className="border-destructive/20 text-destructive hover:bg-destructive/10"
							onClick={() => createPortalSession.mutate()}
						>
							Cancel Plan
						</Button>
					</div>
				</section>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================
export default function SettingsPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const tabParam = searchParams.get('tab') as SettingsTab | null
	const [activeTab, setActiveTab] = React.useState<SettingsTab>(
		tabParam && ['general', 'notifications', 'security', 'billing'].includes(tabParam)
			? tabParam
			: 'general'
	)

	// Update tab when URL changes
	React.useEffect(() => {
		if (tabParam && ['general', 'notifications', 'security', 'billing'].includes(tabParam)) {
			setActiveTab(tabParam)
		}
	}, [tabParam])

	// Update URL when tab changes
	const handleTabChange = (tab: SettingsTab) => {
		setActiveTab(tab)
		router.push(`/settings?tab=${tab}`, { scroll: false })
	}

	const renderContent = () => {
		switch (activeTab) {
			case 'general':
				return <GeneralSettings />
			case 'notifications':
				return <NotificationSettings />
			case 'security':
				return <SecuritySettings />
			case 'billing':
				return <BillingSettings />
			default:
				return <GeneralSettings />
		}
	}

	return (
		<div className="p-4 sm:p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h1 className="text-2xl font-bold">Settings</h1>
					<p className="text-sm text-muted-foreground">
						Manage your account and application preferences
					</p>
				</div>
			</BlurFade>

			{/* Settings Layout */}
			<div className="flex flex-col lg:flex-row gap-6">
				{/* Sidebar Navigation */}
				<BlurFade delay={0.15} inView>
					<nav className="lg:w-56 shrink-0">
						<div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
							{sections.map((section, index) => (
								<BlurFade key={section.id} delay={0.2 + index * 0.05} inView>
									<button
										onClick={() => handleTabChange(section.id)}
										className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors whitespace-nowrap min-h-11 ${
											activeTab === section.id
												? 'bg-primary text-primary-foreground'
												: 'text-muted-foreground hover:bg-muted hover:text-foreground'
										} lg:w-full`}
									>
										<div className="flex items-center gap-3">
											{section.icon}
											<span>{section.label}</span>
										</div>
										<ChevronRight className={`h-4 w-4 transition-transform hidden lg:block ${activeTab === section.id ? 'rotate-90' : ''}`} />
									</button>
								</BlurFade>
							))}
						</div>
					</nav>
				</BlurFade>

				{/* Main Content */}
				<div className="flex-1 min-w-0">
					{renderContent()}
				</div>
			</div>
		</div>
	)
}
