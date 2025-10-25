import { PasswordUpdateSection } from '@/app/(protected)/settings/password-update-section'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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

export default function SettingsPage() {
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
									<div className="size-11 rounded-full bg-primary/20 flex items-center justify-center">
										<div className="size-3 rounded-full bg-primary"></div>
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
									<div className="size-11 rounded-full bg-muted flex items-center justify-center">
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
						title="Subscription Plan"
						className="p-6 border shadow-sm"
					>
						<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
							<div>
								<p className="font-semibold text-lg">Professional Plan</p>
								<p className="text-muted-foreground">Manage up to 500 units</p>
							</div>
							<div className="text-right">
								<p className="text-2xl font-bold">$99</p>
								<p className="text-sm text-muted-foreground">per month</p>
							</div>
						</div>
						<div className="mt-4 flex items-center gap-2">
							<Button>Upgrade Plan</Button>
							<Button variant="outline">Cancel Subscription</Button>
						</div>
					</CardLayout>

					<CardLayout title="Payment Method" className="p-6 border shadow-sm">
						<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-lg bg-background border flex items-center justify-center">
									<CreditCard className="size-5" />
								</div>
								<div>
									<p className="font-medium">•••• •••• 4242</p>
									<p className="text-sm text-muted-foreground">Expires 12/25</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								Update
							</Button>
						</div>
					</CardLayout>

					<CardLayout title="Billing History" className="p-6 border shadow-sm">
						<div className="space-y-3">
							{[
								{ date: 'Jan 15, 2024', amount: '$99.00', status: 'Paid' },
								{ date: 'Dec 15, 2023', amount: '$99.00', status: 'Paid' },
								{ date: 'Nov 15, 2023', amount: '$99.00', status: 'Paid' }
							].map((invoice, index) => (
								<div
									key={index}
									className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
								>
									<div>
										<p className="font-medium">{invoice.date}</p>
										<p className="text-sm text-muted-foreground">
											{invoice.amount}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="default" className="text-xs">
											{invoice.status}
										</Badge>
										<Button variant="ghost" size="sm">
											<Download className="size-4" />
										</Button>
									</div>
								</div>
							))}
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
