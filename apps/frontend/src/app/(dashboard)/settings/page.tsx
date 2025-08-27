import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettings } from '@/components/settings/profile-settings'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { SecuritySettings } from '@/components/settings/security-settings'
import { BillingSettings } from '@/components/settings/billing-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { DataSettings } from '@/components/settings/data-settings'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Settings | TenantFlow',
	description: 'Manage your account settings and preferences'
}

function SettingsHeader() {
	return (
		<div className="space-y-1">
			<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
				Settings
			</h1>
			<p className="text-muted-foreground">
				Manage your account settings and preferences
			</p>
		</div>
	)
}

function SettingsLoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<div className="grid gap-6 lg:grid-cols-2">
					{[...Array(4)].map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
								<Skeleton className="h-4 w-48" />
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-24" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	)
}

export default function SettingsPage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<SettingsHeader />

			<Suspense fallback={<SettingsLoadingSkeleton />}>
				<Tabs defaultValue="profile" className="space-y-6">
					<TabsList className="grid w-full grid-cols-6 lg:w-[600px]">
						<TabsTrigger
							value="profile"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-user inline-block h-4 w-4"  />
							<span className="hidden sm:inline">Profile</span>
						</TabsTrigger>
						<TabsTrigger
							value="notifications"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-bell inline-block h-4 w-4"  />
							<span className="hidden sm:inline">
								Notifications
							</span>
						</TabsTrigger>
						<TabsTrigger
							value="security"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-shield inline-block h-4 w-4"  />
							<span className="hidden sm:inline">Security</span>
						</TabsTrigger>
						<TabsTrigger
							value="billing"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-credit-card inline-block h-4 w-4"  />
							<span className="hidden sm:inline">Billing</span>
						</TabsTrigger>
						<TabsTrigger
							value="appearance"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-palette inline-block h-4 w-4"  />
							<span className="hidden sm:inline">Appearance</span>
						</TabsTrigger>
						<TabsTrigger
							value="data"
							className="flex items-center gap-2"
						>
							<i className="i-lucide-database inline-block h-4 w-4"  />
							<span className="hidden sm:inline">Data</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="profile" className="space-y-6">
						<ProfileSettings />
					</TabsContent>

					<TabsContent value="notifications" className="space-y-6">
						<NotificationSettings />
					</TabsContent>

					<TabsContent value="security" className="space-y-6">
						<SecuritySettings />
					</TabsContent>

					<TabsContent value="billing" className="space-y-6">
						<BillingSettings />
					</TabsContent>

					<TabsContent value="appearance" className="space-y-6">
						<AppearanceSettings />
					</TabsContent>

					<TabsContent value="data" className="space-y-6">
						<DataSettings />
					</TabsContent>
				</Tabs>
			</Suspense>
		</div>
	)
}
