// TODO: [VIOLATION] CLAUDE.md Standards - KISS Principle violation
// This file is ~981 lines. Per CLAUDE.md: "Small, Focused Modules - Maximum 300 lines per file"
// Recommended refactoring:
// 1. Extract ProfileSettingsSection into: `./sections/profile-settings-section.tsx`
// 2. Extract NotificationSettingsSection into: `./sections/notification-settings-section.tsx`
// 3. Extract BillingSettingsSection into: `./sections/billing-settings-section.tsx`
// 4. Keep main page as layout wrapper that imports sections

'use client'

import { PasswordUpdateSection } from '#app/(tenant)/tenant/settings/password-update-section'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { apiRequest } from '#lib/api-request'

import { useAuth } from '#providers/auth-provider'
import {
	useDeleteNotification,
	useBulkMarkNotificationsRead,
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
	useNotifications,
	useUnreadNotificationsCount
} from '#hooks/api/use-notifications'
import {
	useOwnerNotificationSettings,
	useUpdateOwnerNotificationSettings
} from '#hooks/api/use-notification-settings'
import { useUserSessions, useRevokeSession } from '#hooks/api/use-sessions'
import { useInvoices } from '#hooks/api/use-billing'
import { useMfaFactors, useMfaStatus } from '#hooks/api/use-mfa'
import {
	TwoFactorSetupDialog,
	DisableTwoFactorDialog
} from '#components/auth/two-factor-setup-dialog'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Database } from '@repo/shared/types/supabase'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Checkbox } from '#components/ui/checkbox'
import { PreferenceRow } from '#components/notification/preference-row'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Switch } from '#components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { Textarea } from '#components/ui/textarea'
import {
	Bell,
	CheckCircle2,
	CreditCard,
	Download,
	ExternalLink,
	Loader2,
	RefreshCw,
	Save,
	Settings,
	Shield,
	Smartphone,
	Monitor,
	Tablet,
	Trash2,
	Upload,
	User
} from 'lucide-react'
import { Skeleton } from '#components/ui/skeleton'

const OWNER_SETTINGS_TABS = [
	'profile',
	'notifications',
	'security',
	'billing',
	'system'
] as const
type OwnerSettingsTab = (typeof OWNER_SETTINGS_TABS)[number]

function isOwnerSettingsTab(value: string | null): value is OwnerSettingsTab {
	return value !== null && (OWNER_SETTINGS_TABS as readonly string[]).includes(value)
}

export default function SettingsPage() {
	const [isPending, startTransition] = useTransition()
	const { session, user, isLoading: authLoading } = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()
	const tabParam = searchParams.get('tab')
	const [activeTab, setActiveTab] = useState<OwnerSettingsTab>(() =>
		isOwnerSettingsTab(tabParam) ? tabParam : 'profile'
	)
	const [notificationPage, setNotificationPage] = useState(1)
	const {
		data: notificationsData,
		isLoading: notificationsLoading,
		isFetching: notificationsFetching
	} = useNotifications({ page: notificationPage, limit: 10 })
	const {
		data: unreadData,
		isLoading: unreadLoading
	} = useUnreadNotificationsCount()
	const unreadCount = unreadData?.total ?? 0
	const markNotificationRead = useMarkNotificationRead()
	const deleteNotification = useDeleteNotification()
	const markAllNotificationsRead = useMarkAllNotificationsRead()
	const bulkMarkNotificationsRead = useBulkMarkNotificationsRead()
	const {
		data: notificationSettings,
		isLoading: notificationSettingsLoading
	} = useOwnerNotificationSettings()
	const updateNotificationSettings = useUpdateOwnerNotificationSettings()
	const { data: invoices, isLoading: invoicesLoading } = useInvoices()
	const {
		data: sessions,
		isLoading: sessionsLoading,
		refetch: refetchSessions
	} = useUserSessions()
	const revokeSession = useRevokeSession()
	const { isLoading: mfaStatusLoading } = useMfaStatus()
	const { data: mfaFactors, isLoading: mfaFactorsLoading, refetch: refetchMfaFactors } = useMfaFactors()

	const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
	const [showSetup2faDialog, setShowSetup2faDialog] = useState(false)
	const [showDisable2faDialog, setShowDisable2faDialog] = useState(false)

	// Get the first enrolled TOTP factor if any
	const enrolledTotpFactor = mfaFactors?.find(f => f.type === 'totp' && f.status === 'verified')
	const is2faEnabled = !!enrolledTotpFactor

	const isSettingsPending =
		notificationSettingsLoading || updateNotificationSettings.isPending

	type PreferenceKey =
		| 'email'
		| 'sms'
		| 'push'
		| 'inApp'
		| 'maintenance'
		| 'leases'
		| 'general'

	const isCategoryKey = (key: PreferenceKey): key is 'maintenance' | 'leases' | 'general' =>
		key === 'maintenance' || key === 'leases' || key === 'general'

	const handlePreferenceToggle = (key: PreferenceKey, value: boolean) => {
		const payload = isCategoryKey(key)
			? ({ categories: { [key]: value } } as const)
			: ({ [key]: value } as const)

		updateNotificationSettings.mutate(payload)
	}

	const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!session?.access_token) {
			toast.error('Authentication required', {
				description: 'Please sign in to update your profile'
			})
			return
		}

		const formData = new FormData(e.currentTarget)
		const profileData = {
			first_name: formData.get('first_name') as string,
			last_name: formData.get('last_name') as string,
			email: formData.get('email') as string,
			phone: (formData.get('phone') as string) || undefined,
			company: (formData.get('company') as string) || undefined,
			timezone: (formData.get('timezone') as string) || undefined,
			bio: (formData.get('bio') as string) || undefined
		}

		startTransition(async () => {
			try {
				await apiRequest<void>('/api/v1/users/profile', {
					method: 'PATCH',
					body: JSON.stringify(profileData)
				})

				handleMutationSuccess('Update profile')
			} catch (error) {
				handleMutationError(error, 'Update profile')
			}
		})
	}

	const handleOpenNotification = (
		notification: Database['public']['Tables']['notifications']['Row']
	) => {
		if (!notification.action_url) return

		router.push(notification.action_url)

		if (!notification.is_read) {
			markNotificationRead.mutate(notification.id)
			}
		}

	const totalPages =
		notificationsData && notificationsData.limit
			? Math.max(1, Math.ceil(notificationsData.total / notificationsData.limit))
			: 1

	const currentPageIds = notificationsData?.data.map(notification => notification.id) ?? []
	const allSelectedOnPage =
		currentPageIds.length > 0 &&
		currentPageIds.every(id => selectedNotifications.includes(id))

	const toggleSelectAll = (checked: boolean | string) => {
		if (checked) {
			setSelectedNotifications(prev =>
				Array.from(new Set([...prev, ...currentPageIds]))
			)
		} else {
			setSelectedNotifications(prev =>
				prev.filter(id => !currentPageIds.includes(id))
			)
		}
	}

	const toggleSelectOne = (id: string, checked: boolean | string) => {
		if (checked) {
			setSelectedNotifications(prev =>
				prev.includes(id) ? prev : [...prev, id]
			)
		} else {
			setSelectedNotifications(prev => prev.filter(item => item !== id))
		}
	}

	const handleBulkMarkRead = () => {
		if (!selectedNotifications.length) return
		bulkMarkNotificationsRead.mutate(selectedNotifications, {
			onSuccess: () => setSelectedNotifications([])
		})
	}

	useEffect(() => {
		setSelectedNotifications([])
	}, [notificationPage])

	useEffect(() => {
		if (isOwnerSettingsTab(tabParam)) {
			setActiveTab(tabParam)
		}
	}, [tabParam])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div className="flex-between">
				<div>
					<h1 className="typography-h2 text-foreground">
						Settings & Preferences
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage your account and application preferences
					</p>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) =>
					setActiveTab(isOwnerSettingsTab(value) ? value : 'profile')
				}
				className="space-y-6"
			>
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="profile" className="flex items-center gap-2">
						<User className="size-4" />
						Profile
					</TabsTrigger>
					<TabsTrigger
						value="notifications"
						className="flex items-center gap-2"
					>
						<Bell className="size-4" />
						Notifications
						{!unreadLoading && unreadCount > 0 ? (
							<Badge variant="secondary" className="px-2 py-0.5 text-xs">
								{unreadCount}
							</Badge>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="security" className="flex items-center gap-2">
						<Shield className="size-4" />
						Security
					</TabsTrigger>
					<TabsTrigger value="billing" className="flex items-center gap-2">
						<CreditCard className="size-4" />
						Billing
					</TabsTrigger>
					<TabsTrigger value="system" className="flex items-center gap-2">
						<Settings className="size-4" />
						System
					</TabsTrigger>
				</TabsList>

				{/* TODO [LOW PRIORITY]: Add avatar/profile photo upload functionality.
				 * The profile section currently only has text fields for name, email, phone, etc.
				 * To implement avatar upload:
				 * 1. Create an AvatarUpload component with drag-and-drop or click-to-upload
				 * 2. Use Supabase Storage bucket 'avatars' for storing images
				 * 3. Validate file types (JPEG, PNG, WebP) and max size (5MB)
				 * 4. Add image cropping UI (react-image-crop or similar) for square aspect ratio
				 * 5. Store avatar URL in user_metadata: supabase.auth.updateUser({ data: { avatar_url } })
				 * 6. Generate unique filename: `${userId}/${timestamp}.${ext}` to handle updates
				 * 7. Display avatar in profile section and in the app header/navigation
				 * 8. Add fallback to initials avatar (already implemented in Avatar component)
				 * See: https://supabase.com/docs/guides/storage for Storage setup
				 */}
				<TabsContent value="profile" className="space-y-6">
					<CardLayout
						title="Profile Information"
						className="p-6 border shadow-sm"
					>
						{authLoading ? (
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="mt-6 md:col-span-2 space-y-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-24 w-full" />
								</div>
							</div>
						) : (
							<form
								onSubmit={handleProfileSubmit}
								className="grid grid-cols-1 gap-6 md:grid-cols-2"
							>
								<div className="space-y-2">
									<Label htmlFor="first_name">First Name</Label>
									<Input
										id="first_name"
										name="first_name"
										autoComplete="given-name"
										defaultValue={(user?.user_metadata?.first_name as string) || ''}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="last_name">Last Name</Label>
									<Input
										id="last_name"
										name="last_name"
										autoComplete="family-name"
										defaultValue={(user?.user_metadata?.last_name as string) || ''}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										name="email"
										autoComplete="email"
										type="email"
										defaultValue={user?.email || ''}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="phone">Phone Number</Label>
									<Input
										id="phone"
										name="phone"
										autoComplete="tel"
										type="tel"
										defaultValue={''}
										placeholder="Add your phone number"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="company">Company</Label>
									<Input
										id="company"
										name="company"
										autoComplete="organization"
										defaultValue={''}
										placeholder="Add your company name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="timezone">Timezone</Label>
									<Select name="timezone" defaultValue="cst">
										<SelectTrigger id="timezone">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="pst">Pacific Standard Time</SelectItem>
											<SelectItem value="mst">
												Mountain Standard Time
											</SelectItem>
											<SelectItem value="cst">Central Standard Time</SelectItem>
											<SelectItem value="est">Eastern Standard Time</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="mt-6 md:col-span-2">
									<Label htmlFor="bio">Bio</Label>
									<Textarea
										id="bio"
										name="bio"
										className="mt-2"
										placeholder="Tell us about yourself..."
										rows={3}
									/>
								</div>
								<div className="md:col-span-2 flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											const form = document.querySelector(
												'form'
											) as HTMLFormElement
											form?.reset()
											toast.info('Form reset to defaults')
										}}
									>
										<RefreshCw className="size-4 mr-2" />
										Reset to Defaults
									</Button>
									<Button type="submit" disabled={isPending}>
										<Save className="size-4 mr-2" />
										{isPending ? 'Saving...' : 'Save Changes'}
									</Button>
								</div>
							</form>
						)}
					</CardLayout>
				</TabsContent>

		<TabsContent value="notifications" className="space-y-6">
			<CardLayout
				title="Notification Preferences"
				description="Choose how you want to be notified"
				className="p-6 border shadow-sm"
			>
				<div className="space-y-4">
					{notificationSettingsLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-5 w-48" />
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-5 w-44" />
						</div>
					) : (
						<>
							<PreferenceRow
								label="Email alerts"
								description="Receive notifications via email"
								checked={notificationSettings?.email ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('email', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="SMS alerts"
								description="Critical updates for payments and maintenance"
								checked={notificationSettings?.sms ?? false}
								onCheckedChange={checked =>
									handlePreferenceToggle('sms', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="Push notifications"
								description="Instant in-app alerts on new activity"
								checked={notificationSettings?.push ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('push', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="In-app banners"
								description="Show alert banners inside the dashboard"
								checked={notificationSettings?.inApp ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('inApp', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="Maintenance updates"
								description="Progress on tenant maintenance requests"
								checked={notificationSettings?.categories?.maintenance ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('maintenance', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="Lease updates"
								description="Renewal reminders and signature events"
								checked={notificationSettings?.categories?.leases ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('leases', checked)
								}
								disabled={isSettingsPending}
							/>
							<PreferenceRow
								label="General updates"
								description="Product updates and system alerts"
								checked={notificationSettings?.categories?.general ?? true}
								onCheckedChange={checked =>
									handlePreferenceToggle('general', checked)
								}
								disabled={isSettingsPending}
							/>
						</>
					)}
				</div>
			</CardLayout>

			<CardLayout
				title="Notifications"
				className="p-6 border shadow-sm"
			>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-sm text-muted-foreground">
									Real-time updates for maintenance, leases, payments, and system
									alerts.
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant={unreadCount > 0 ? 'secondary' : 'outline'}>
									{unreadLoading ? '...' : `${unreadCount} unread`}
								</Badge>
								{notificationsData?.data?.length ? (
									<Button
										size="sm"
										variant="outline"
										disabled={
											bulkMarkNotificationsRead.isPending ||
											selectedNotifications.length === 0
										}
										onClick={handleBulkMarkRead}
										className="gap-1"
									>
										{bulkMarkNotificationsRead.isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<CheckCircle2 className="size-4" />
										)}
										Mark selected read
									</Button>
								) : null}
								<Button
									size="sm"
									variant="outline"
									disabled={
										markAllNotificationsRead.isPending || unreadCount === 0
									}
									onClick={() => markAllNotificationsRead.mutate()}
									className="gap-1"
								>
									{markAllNotificationsRead.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<CheckCircle2 className="size-4" />
									)}
									Mark all read
								</Button>
							</div>
						</div>

						{notificationsLoading ? (
							<div className="mt-4 space-y-3">
								{[...Array(3)].map((_, idx) => (
									<div key={idx} className="rounded-lg border p-4">
										<Skeleton className="h-4 w-1/3" />
										<Skeleton className="h-3 w-2/3 mt-2" />
									</div>
								))}
							</div>
						) : (
							<>
								{(notificationsData?.data.length ?? 0) === 0 ? (
									<div className="mt-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
										No notifications yet. You'll see maintenance updates, lease
										actions, and payment alerts here.
									</div>
								) : (
									<div className="mt-4 divide-y rounded-lg border">
										<div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
											<Checkbox
												checked={allSelectedOnPage}
												onCheckedChange={toggleSelectAll}
												aria-label="Select all notifications on this page"
											/>
											<span>
												{selectedNotifications.length > 0
													? `${selectedNotifications.length} selected`
													: 'Select notifications to mark read'}
											</span>
										</div>
										{notificationsData?.data.map(notification => {
											const createdAt = notification.created_at
												? new Date(notification.created_at).toLocaleString()
												: ''
											return (
												<div
													key={notification.id}
													className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
												>
													<div className="flex items-start gap-3">
														<Checkbox
															checked={selectedNotifications.includes(notification.id)}
															onCheckedChange={checked =>
																toggleSelectOne(notification.id, checked)
															}
															aria-label={`Select notification ${notification.title}`}
															className="mt-1"
														/>
														<div className="space-y-1">
														<div className="flex flex-wrap items-center gap-2">
															<Badge
																variant={
																	notification.is_read ? 'outline' : 'default'
																}
															>
																{notification.notification_type}
															</Badge>
															<span className="font-medium text-foreground">
																{notification.title}
															</span>
														</div>
														<p className="text-sm text-muted-foreground">
															{notification.message ?? 'No message provided'}
														</p>
														<p className="text-xs text-muted-foreground">
															{createdAt}
														</p>
														</div>
													</div>
													<div className="flex flex-wrap items-center gap-2 self-start md:self-center">
														{notification.action_url ? (
															<Button
																variant="ghost"
																size="sm"
																className="gap-1"
																onClick={() => handleOpenNotification(notification)}
															>
																<ExternalLink className="size-4" />
																Open
															</Button>
														) : null}
														{!notification.is_read && (
															<Button
																variant="outline"
																size="sm"
																className="gap-1"
																onClick={() =>
																	markNotificationRead.mutate(notification.id)
																}
																disabled={markNotificationRead.isPending}
															>
																{markNotificationRead.isPending ? (
																	<Loader2 className="size-4 animate-spin" />
																) : (
																	<CheckCircle2 className="size-4" />
																)}
																Mark read
															</Button>
														)}
														<Button
															variant="ghost"
															size="sm"
															className="gap-1 text-destructive"
															onClick={() =>
																deleteNotification.mutate(notification.id)
															}
															disabled={deleteNotification.isPending}
														>
															<Trash2 className="size-4" />
															Delete
														</Button>
													</div>
												</div>
											)
										})}
									</div>
								)}
								<div className="mt-4 flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Page {notificationsData?.page ?? 1} of {totalPages}
									</span>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={
												notificationPage === 1 ||
												notificationsLoading ||
												notificationsFetching
											}
											onClick={() =>
												setNotificationPage(prev => Math.max(1, prev - 1))
											}
										>
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={
												notificationPage >= totalPages ||
												notificationsLoading ||
												notificationsFetching
											}
											onClick={() =>
												setNotificationPage(prev =>
													Math.min(totalPages, prev + 1)
												)
											}
										>
											Next
										</Button>
									</div>
								</div>
							</>
						)}
					</CardLayout>
				</TabsContent>

				<TabsContent value="security" className="space-y-6">
					<PasswordUpdateSection />

						<CardLayout
						title="Two-Factor Authentication"
						className="p-6 border shadow-sm"
					>
						<div className="space-y-4">
							{mfaStatusLoading || mfaFactorsLoading ? (
								<div className="flex-between">
									<div className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-3 w-48" />
									</div>
									<Skeleton className="h-6 w-11" />
								</div>
							) : (
								<>
									<div className="flex-between">
										<div>
											<Label className="font-medium">
												{is2faEnabled ? '2FA Enabled' : 'Enable 2FA'}
											</Label>
											<p className="text-muted">
												{is2faEnabled
													? 'Your account is protected with two-factor authentication'
													: 'Add an extra layer of security to your account'}
											</p>
										</div>
										<Switch
											checked={is2faEnabled}
											onCheckedChange={(checked) => {
												if (checked) {
													setShowSetup2faDialog(true)
												} else {
													setShowDisable2faDialog(true)
												}
											}}
										/>
									</div>
									<div className="pt-4 border-t">
										{is2faEnabled ? (
											<div className="flex items-center gap-2">
												<Badge variant="success" className="text-xs">
													<CheckCircle2 className="size-3 mr-1" />
													Active
												</Badge>
												<span className="text-sm text-muted-foreground">
													Using authenticator app
												</span>
											</div>
										) : (
											<Button
												variant="outline"
												onClick={() => setShowSetup2faDialog(true)}
											>
												<Shield className="size-4 mr-2" />
												Set Up 2FA
											</Button>
										)}
									</div>
								</>
							)}
						</div>
					</CardLayout>

					<TwoFactorSetupDialog
						open={showSetup2faDialog}
						onOpenChange={setShowSetup2faDialog}
						onSuccess={() => refetchMfaFactors()}
					/>

					{enrolledTotpFactor && (
						<DisableTwoFactorDialog
							open={showDisable2faDialog}
							onOpenChange={setShowDisable2faDialog}
							factorId={enrolledTotpFactor.id}
							onSuccess={() => refetchMfaFactors()}
						/>
					)}

					<CardLayout title="Active Sessions" className="p-6 border shadow-sm">
						<div className="space-y-4">
							{sessionsLoading ? (
								<>
									<Skeleton className="h-20 w-full" />
									<Skeleton className="h-20 w-full" />
								</>
							) : sessions && sessions.length > 0 ? (
								sessions.map(session => {
									const DeviceIcon = session.device === 'mobile'
										? Smartphone
										: session.device === 'tablet'
										? Tablet
										: Monitor

									const lastActive = new Date(session.updated_at)
									const now = new Date()
									const diffMs = now.getTime() - lastActive.getTime()
									const diffMins = Math.floor(diffMs / 60000)
									const diffHours = Math.floor(diffMins / 60)
									const diffDays = Math.floor(diffHours / 24)

									let lastActiveText: string
									if (session.is_current) {
										lastActiveText = 'Now'
									} else if (diffMins < 1) {
										lastActiveText = 'Just now'
									} else if (diffMins < 60) {
										lastActiveText = `${diffMins} min ago`
									} else if (diffHours < 24) {
										lastActiveText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
									} else {
										lastActiveText = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
									}

									return (
										<div
											key={session.id}
											className={`flex-between p-4 rounded-lg ${
												session.is_current ? 'bg-primary/10' : 'bg-muted/20'
											}`}
										>
											<div className="flex items-center gap-3">
												<div
													className={`size-11 rounded-full flex-center ${
														session.is_current
															? 'bg-primary/20'
															: 'bg-muted'
													}`}
												>
													{session.is_current ? (
														<div className="size-3 rounded-full bg-primary" />
													) : (
														<DeviceIcon className="size-4" />
													)}
												</div>
												<div>
													<p className="font-medium">
														{session.browser || 'Unknown Browser'}
													</p>
													<p className="text-muted">
														{session.os || 'Unknown OS'} • {lastActiveText}
													</p>
												</div>
											</div>
											{session.is_current ? (
												<Badge variant="default" className="text-xs">
													Current
												</Badge>
											) : (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => revokeSession.mutate(session.id)}
													disabled={revokeSession.isPending}
												>
													{revokeSession.isPending ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														'Revoke'
													)}
												</Button>
											)}
										</div>
									)
								})
							) : (
								<div className="text-center py-8 text-muted-foreground">
									<Monitor className="size-12 mx-auto mb-3 opacity-50" />
									<p>No active sessions found</p>
								</div>
							)}
							{sessions && sessions.length > 0 && (
								<div className="pt-4 border-t">
									<Button
										variant="outline"
										size="sm"
										onClick={() => refetchSessions()}
									>
										<RefreshCw className="size-4 mr-2" />
										Refresh Sessions
									</Button>
								</div>
							)}
						</div>
					</CardLayout>
				</TabsContent>

				<TabsContent value="billing" className="space-y-6">
					<CardLayout
						title="Subscription Plan"
						className="p-6 border shadow-sm"
					>
						<div className="flex-between p-4 rounded-lg bg-muted/20">
							<div>
								<p className="font-semibold text-lg">Professional Plan</p>
								<p className="text-muted-foreground">Manage up to 500 units</p>
							</div>
							<div className="text-right">
								<p className="typography-h3">$99</p>
								<p className="text-muted">per month</p>
							</div>
						</div>
						<div className="mt-4 flex items-center gap-2">
							<Button>Upgrade Plan</Button>
							<Button variant="outline">Cancel Subscription</Button>
						</div>
					</CardLayout>

					<CardLayout title="Payment Method" className="p-6 border shadow-sm">
						<div className="flex-between p-4 rounded-lg bg-muted/20">
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-lg bg-background border flex-center">
									<CreditCard className="size-5" />
								</div>
								<div>
									<p className="font-medium">•••• •••• 4242</p>
									<p className="text-muted">Expires 12/25</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								Update
							</Button>
						</div>
					</CardLayout>

					<CardLayout title="Billing History" className="p-6 border shadow-sm">
						<div className="space-y-3">
							{invoicesLoading ? (
								<>
									{[1, 2, 3].map((i) => (
										<div key={i} className="flex-between p-3 rounded-lg bg-muted/20">
											<div className="space-y-2">
												<Skeleton className="h-4 w-24" />
												<Skeleton className="h-3 w-16" />
											</div>
											<div className="flex items-center gap-2">
												<Skeleton className="h-5 w-12" />
												<Skeleton className="h-8 w-8" />
											</div>
										</div>
									))}
								</>
							) : invoices && invoices.length > 0 ? (
								invoices.map((invoice) => (
									<div
										key={invoice.id}
										className="flex-between p-3 rounded-lg bg-muted/20"
									>
										<div>
											<p className="font-medium">{invoice.date}</p>
											<p className="text-muted">
												{invoice.amount}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="default" className="text-xs">
												{invoice.status}
											</Badge>
											{invoice.invoicePdf ? (
												<Button
													variant="ghost"
													size="sm"
													asChild
												>
													<a
														href={invoice.invoicePdf}
														target="_blank"
														rel="noopener noreferrer"
														aria-label="Download invoice PDF"
													>
														<Download className="size-4" />
													</a>
												</Button>
											) : invoice.hostedUrl ? (
												<Button
													variant="ghost"
													size="sm"
													asChild
												>
													<a
														href={invoice.hostedUrl}
														target="_blank"
														rel="noopener noreferrer"
														aria-label="View invoice"
													>
														<ExternalLink className="size-4" />
													</a>
												</Button>
											) : null}
										</div>
									</div>
								))
							) : (
								<p className="text-muted text-sm py-4 text-center">
									No billing history available
								</p>
							)}
						</div>
					</CardLayout>
				</TabsContent>

				<TabsContent value="system" className="space-y-6">
					<CardLayout title="Data Management" className="p-6 border shadow-sm">
						<div className="space-y-4">
							<div className="flex-between">
								<div>
									<Label htmlFor="auto-backup" className="font-medium">
										Auto-backup
									</Label>
									<p className="text-muted">
										Automatically backup your data weekly
									</p>
								</div>
								<Switch id="auto-backup" name="auto-backup" defaultChecked />
							</div>
							<div className="pt-4 border-t">
								<div className="flex items-center gap-2">
									<Button variant="outline">
										<Download className="size-4 mr-2" />
										Export Data
									</Button>
									<Button variant="outline">
										<Upload className="size-4 mr-2" />
										Import Data
									</Button>
								</div>
							</div>
						</div>
					</CardLayout>

					<CardLayout
						title="System Preferences"
						className="p-6 border shadow-sm"
					>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="default-currency">Default Currency</Label>
								<Select defaultValue="usd">
									<SelectTrigger id="default-currency" className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="usd">USD ($)</SelectItem>
										<SelectItem value="cad">CAD ($)</SelectItem>
										<SelectItem value="eur">EUR (€)</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="date-format">Date Format</Label>
								<Select defaultValue="mdy">
									<SelectTrigger id="date-format" className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="mdy">MM/DD/YYYY</SelectItem>
										<SelectItem value="dmy">DD/MM/YYYY</SelectItem>
										<SelectItem value="ymd">YYYY-MM-DD</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardLayout>

					<CardLayout
						title="Danger Zone"
						className="p-6 border shadow-sm border-destructive/20"
					>
						<div className="space-y-4">
							<div>
								<p className="font-medium">Delete Account</p>
								<p className="text-muted mb-3">
									Permanently delete your account and all associated data. This
									action cannot be undone.
								</p>
								<Button variant="destructive">
									<Trash2 className="size-4 mr-2" />
									Delete Account
								</Button>
							</div>
						</div>
					</CardLayout>
				</TabsContent>
			</Tabs>
		</div>
	)
}
