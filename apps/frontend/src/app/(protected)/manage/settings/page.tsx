'use client'

import { PasswordUpdateSection } from '@/components/settings/password-update-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardLayout } from '@/components/ui/card-layout'
import { Input } from '@/components/ui/input'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle
} from '@/components/ui/item'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createCustomerPortalSession } from '@/lib/stripe-client'
import {
	AlertTriangle,
	Bell,
	CreditCard,
	Download,
	Globe,
	RefreshCw,
	Save,
	Settings,
	Shield,
	Trash2,
	Upload,
	User
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
	const [isLoadingPortal, setIsLoadingPortal] = useState(false)

	const handleManageBilling = async () => {
		setIsLoadingPortal(true)
		try {
			const returnUrl = `${window.location.origin}/manage/settings?tab=billing`
			const { url } = await createCustomerPortalSession(returnUrl)
			window.location.href = url
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to open billing portal'
			)
			setIsLoadingPortal(false)
		}
	}
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gradient-authority">
						Settings & Preferences
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage your account settings, notifications, and system preferences
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<RefreshCw className="size-4 mr-2" />
						Reset to Defaults
					</Button>
					<Button size="sm">
						<Save className="size-4 mr-2" />
						Save Changes
					</Button>
				</div>
			</div>

			<Tabs defaultValue="profile" className="space-y-6">
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

				<TabsContent value="profile" className="space-y-6">
					<CardLayout
						title="Profile Information"
						className="p-6 border shadow-sm"
					>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input id="firstName" defaultValue="Johnathan" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name</Label>
								<Input id="lastName" defaultValue="Doe" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Email Address</Label>
								<Input
									id="email"
									type="email"
									defaultValue="john.doe@placeholder.com"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone">Phone Number</Label>
								<Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="company">Company</Label>
								<Input id="company" defaultValue="Property Management Co." />
							</div>
							<div className="space-y-2">
								<Label htmlFor="timezone">Timezone</Label>
								<Select defaultValue="pst">
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pst">Pacific Standard Time</SelectItem>
										<SelectItem value="mst">Mountain Standard Time</SelectItem>
										<SelectItem value="cst">Central Standard Time</SelectItem>
										<SelectItem value="est">Eastern Standard Time</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="mt-6">
							<Label htmlFor="bio">Bio</Label>
							<Textarea
								id="bio"
								className="mt-2"
								placeholder="Tell us about yourself..."
								rows={3}
							/>
						</div>
					</CardLayout>
				</TabsContent>

				<TabsContent value="notifications" className="space-y-6">
					<CardLayout
						title="Email Notifications"
						className="p-6 border shadow-sm"
					>
						<ItemGroup>
							<Item variant="outline">
								<ItemMedia variant="icon">
									<Bell />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>New Maintenance Requests</ItemTitle>
									<ItemDescription>
										Get notified when new maintenance requests are submitted
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch defaultChecked />
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<RefreshCw />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Lease Renewals</ItemTitle>
									<ItemDescription>
										Reminders for upcoming lease renewals
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch defaultChecked />
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<CreditCard />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Payment Notifications</ItemTitle>
									<ItemDescription>
										Alerts for rent payments and overdue accounts
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch defaultChecked />
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<Settings />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>System Updates</ItemTitle>
									<ItemDescription>
										Information about system maintenance and updates
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch />
								</ItemActions>
							</Item>
						</ItemGroup>
					</CardLayout>

					<CardLayout
						title="Push Notifications"
						className="p-6 border shadow-sm"
					>
						<ItemGroup>
							<Item variant="outline">
								<ItemMedia variant="icon">
									<AlertTriangle />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>Emergency Maintenance</ItemTitle>
									<ItemDescription>
										Immediate alerts for critical issues
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch defaultChecked />
								</ItemActions>
							</Item>

							<ItemSeparator />

							<Item variant="outline">
								<ItemMedia variant="icon">
									<Bell />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>New Messages</ItemTitle>
									<ItemDescription>
										Notifications for tenant messages
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Switch defaultChecked />
								</ItemActions>
							</Item>
						</ItemGroup>
					</CardLayout>
				</TabsContent>

				<TabsContent value="security" className="space-y-6">
					<PasswordUpdateSection />

					<CardLayout
						title="Two-Factor Authentication"
						className="p-6 border shadow-sm"
					>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Enable 2FA</p>
									<p className="text-sm text-muted-foreground">
										Add an extra layer of security to your account
									</p>
								</div>
								<Switch />
							</div>
							<div className="pt-4 border-t">
								<Button variant="outline">
									<Shield className="size-4 mr-2" />
									Configure 2FA
								</Button>
							</div>
						</div>
					</CardLayout>

					<CardLayout title="Active Sessions" className="p-6 border shadow-sm">
						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
										<div className="w-3 h-3 rounded-full bg-primary"></div>
									</div>
									<div>
										<p className="font-medium">Current Session</p>
										<p className="text-sm text-muted-foreground">
											Chrome on macOS • San Francisco, CA
										</p>
									</div>
								</div>
								<Badge variant="default" className="text-xs">
									Current
								</Badge>
							</div>
							<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
										<Globe className="size-4" />
									</div>
									<div>
										<p className="font-medium">Mobile App</p>
										<p className="text-sm text-muted-foreground">
											iPhone • Last active 2 hours ago
										</p>
									</div>
								</div>
								<Button variant="ghost" size="sm">
									Revoke
								</Button>
							</div>
						</div>
					</CardLayout>
				</TabsContent>

				<TabsContent value="billing" className="space-y-6">
					<CardLayout
						title="Subscription & Billing"
						description="Manage your subscription, payment methods, and billing history"
						className="p-6 border shadow-sm"
					>
						<div className="text-center py-12">
							<CreditCard className="size-12 mx-auto mb-4 text-muted-foreground" />
							<h3 className="text-lg font-semibold mb-2">
								Stripe Customer Portal
							</h3>
							<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
								Manage your subscription, update payment methods, view invoices,
								and download receipts through our secure Stripe portal.
							</p>
							<div className="flex items-center justify-center gap-3">
								<Button
									onClick={handleManageBilling}
									disabled={isLoadingPortal}
									className="min-w-[200px]"
								>
									{isLoadingPortal ? (
										<>
											<Spinner className="size-4 mr-2" />
											Opening Portal...
										</>
									) : (
										<>
											<Shield className="size-4 mr-2" />
											Manage Billing
										</>
									)}
								</Button>
							</div>
							<div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
								<div className="flex items-center gap-1">
									<Shield className="size-3" />
									<span>Secure</span>
								</div>
								<div className="flex items-center gap-1">
									<CreditCard className="size-3" />
									<span>PCI Compliant</span>
								</div>
								<div className="flex items-center gap-1">
									<RefreshCw className="size-3" />
									<span>Instant Updates</span>
								</div>
							</div>
						</div>
					</CardLayout>
				</TabsContent>

				<TabsContent value="system" className="space-y-6">
					<CardLayout title="Data Management" className="p-6 border shadow-sm">
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Auto-backup</p>
									<p className="text-sm text-muted-foreground">
										Automatically backup your data weekly
									</p>
								</div>
								<Switch defaultChecked />
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
								<Label>Default Currency</Label>
								<Select defaultValue="usd">
									<SelectTrigger className="w-48">
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
								<Label>Date Format</Label>
								<Select defaultValue="mdy">
									<SelectTrigger className="w-48">
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
								<p className="text-sm text-muted-foreground mb-3">
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
