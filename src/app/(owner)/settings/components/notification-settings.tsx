'use client'

import { Bell, Globe, Mail, MessageSquare } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Skeleton } from '#components/ui/skeleton'
import { Switch } from '#components/ui/switch'
import {
	useOwnerNotificationSettings,
	useUpdateOwnerNotificationSettingsMutation
} from '#hooks/api/use-owner-notification-settings'

export function NotificationSettings() {
	const { data: settings, isLoading } = useOwnerNotificationSettings()
	const updateSettings = useUpdateOwnerNotificationSettingsMutation()

	const handleChannelToggle = (
		channel: 'email' | 'sms' | 'push' | 'inApp',
		value: boolean
	) => {
		updateSettings.mutate({ [channel]: value })
	}

	const handleCategoryToggle = (
		category: 'maintenance' | 'leases' | 'general',
		value: boolean
	) => {
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
					<p className="text-sm text-muted-foreground">
						Choose how you want to be notified
					</p>
				</div>
			</BlurFade>

			{/* Quick Toggle */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-sm font-medium">Enable All Notifications</h3>
							<p className="text-xs text-muted-foreground">
								Receive notifications across all channels
							</p>
						</div>
						<Switch
							checked={settings?.email ?? true}
							onCheckedChange={value => handleChannelToggle('email', value)}
							disabled={updateSettings.isPending}
						/>
					</div>
				</section>
			</BlurFade>

			{/* Channel Toggles */}
			<BlurFade delay={0.2} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Notification Channels
					</h3>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Email Notifications</p>
									<p className="text-xs text-muted-foreground">
										Receive updates via email
									</p>
								</div>
							</div>
							<Switch
								checked={settings?.email ?? true}
								onCheckedChange={value => handleChannelToggle('email', value)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<MessageSquare className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">SMS Notifications</p>
									<p className="text-xs text-muted-foreground">
										Receive text messages
									</p>
								</div>
							</div>
							<Switch
								checked={settings?.sms ?? false}
								onCheckedChange={value => handleChannelToggle('sms', value)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Bell className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Push Notifications</p>
									<p className="text-xs text-muted-foreground">
										Browser push notifications
									</p>
								</div>
							</div>
							<Switch
								checked={settings?.push ?? true}
								onCheckedChange={value => handleChannelToggle('push', value)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">In-App Notifications</p>
									<p className="text-xs text-muted-foreground">
										Show notifications in the app
									</p>
								</div>
							</div>
							<Switch
								checked={settings?.inApp ?? true}
								onCheckedChange={value => handleChannelToggle('inApp', value)}
								disabled={updateSettings.isPending}
							/>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Category Preferences */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Notification Categories
					</h3>

					<div className="space-y-4">
						<div className="flex items-center justify-between py-2 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
							<div>
								<p className="text-sm font-medium">Maintenance Requests</p>
								<p className="text-xs text-muted-foreground">
									When tenants submit new maintenance requests
								</p>
							</div>
							<Switch
								checked={settings?.categories?.maintenance ?? true}
								onCheckedChange={value => handleCategoryToggle('maintenance', value)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between py-2 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
							<div>
								<p className="text-sm font-medium">Lease Updates</p>
								<p className="text-xs text-muted-foreground">
									Lease expirations, renewals, and signatures
								</p>
							</div>
							<Switch
								checked={settings?.categories?.leases ?? true}
								onCheckedChange={value => handleCategoryToggle('leases', value)}
								disabled={updateSettings.isPending}
							/>
						</div>

						<div className="flex items-center justify-between py-2 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
							<div>
								<p className="text-sm font-medium">General Notifications</p>
								<p className="text-xs text-muted-foreground">
									System updates and announcements
								</p>
							</div>
							<Switch
								checked={settings?.categories?.general ?? true}
								onCheckedChange={value => handleCategoryToggle('general', value)}
								disabled={updateSettings.isPending}
							/>
						</div>
					</div>
				</section>
			</BlurFade>
		</div>
	)
}
