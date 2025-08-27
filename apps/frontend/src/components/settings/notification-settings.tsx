'use client'

import { useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface NotificationSetting {
	id: string
	label: string
	description: string
	email: boolean
	push: boolean
	icon: string // UnoCSS icon class name
}

export function NotificationSettings() {
	const [isLoading, setIsLoading] = useState(false)

	const [settings, setSettings] = useState<NotificationSetting[]>([
		{
			id: 'rent_payments',
			label: 'Rent Payments',
			description: 'Get notified when rent is paid or overdue',
			email: true,
			push: true,
			icon: 'i-lucide-dollar-sign'
		},
		{
			id: 'lease_expiry',
			label: 'Lease Expiration',
			description: 'Alerts when leases are expiring soon',
			email: true,
			push: false,
			icon: 'i-lucide-calendar'
		},
		{
			id: 'maintenance_requests',
			label: 'Maintenance Requests',
			description: 'New maintenance requests from tenants',
			email: true,
			push: true,
			icon: 'i-lucide-wrench'
		},
		{
			id: 'tenant_messages',
			label: 'Tenant Messages',
			description: 'Messages and communications from tenants',
			email: false,
			push: true,
			icon: 'i-lucide-users'
		},
		{
			id: 'urgent_issues',
			label: 'Urgent Issues',
			description: 'High priority maintenance or emergency alerts',
			email: true,
			push: true,
			icon: 'i-lucide-alert-triangle'
		}
	])

	const handleToggle = (
		settingId: string,
		type: 'email' | 'push',
		value: boolean
	) => {
		setSettings(prev =>
			prev.map(setting =>
				setting.id === settingId
					? { ...setting, [type]: value }
					: setting
			)
		)
	}

	const handleSave = async () => {
		setIsLoading(true)
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1000))
		setIsLoading(false)
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<i className="i-lucide-bell inline-block h-5 w-5"  />
						Notification Preferences
					</CardTitle>
					<CardDescription>
						Choose how you want to be notified about important
						events.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Notification Types */}
					<div className="space-y-6">
						<div className="grid gap-4 md:grid-cols-3">
							<div className="text-sm font-medium">
								Notification Type
							</div>
							<div className="flex items-center gap-2 text-sm font-medium">
								<i className="i-lucide-mail inline-block h-4 w-4"  />
								Email
							</div>
							<div className="flex items-center gap-2 text-sm font-medium">
								<i className="i-lucide-smartphone inline-block h-4 w-4"  />
								Push
							</div>
						</div>

						<Separator />

						{settings.map(setting => {
							return (
								<div
									key={setting.id}
									className="grid items-center gap-4 md:grid-cols-3"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<i className={`${setting.icon} text-muted-foreground h-4 w-4`} />
											<Label className="font-medium">
												{setting.label}
											</Label>
										</div>
										<p className="text-muted-foreground text-sm">
											{setting.description}
										</p>
									</div>

									<div className="flex items-center justify-center">
										<Switch
											checked={setting.email}
											onCheckedChange={checked =>
												handleToggle(
													setting.id,
													'email',
													checked
												)
											}
										/>
									</div>

									<div className="flex items-center justify-center">
										<Switch
											checked={setting.push}
											onCheckedChange={checked =>
												handleToggle(
													setting.id,
													'push',
													checked
												)
											}
										/>
									</div>
								</div>
							)
						})}
					</div>

					<Separator />

					<div className="flex justify-end">
						<Button onClick={handleSave} disabled={isLoading}>
							{isLoading ? (
								<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
							) : (
								<i className="i-lucide-save inline-block mr-2 h-4 w-4"  />
							)}
							Save Preferences
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Quick Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Settings</CardTitle>
					<CardDescription>
						Common notification preferences for quick adjustment.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label className="font-medium">
								Do Not Disturb
							</Label>
							<p className="text-muted-foreground text-sm">
								Temporarily disable all notifications
							</p>
						</div>
						<Switch />
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label className="font-medium">
								Marketing Communications
							</Label>
							<p className="text-muted-foreground text-sm">
								Receive updates about new features and tips
							</p>
						</div>
						<Switch defaultChecked />
					</div>

					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label className="font-medium">
								Weekly Reports
							</Label>
							<p className="text-muted-foreground text-sm">
								Get weekly summary of your property activity
							</p>
						</div>
						<Switch defaultChecked />
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
