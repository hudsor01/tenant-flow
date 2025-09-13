'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
	Key,
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
			{/* Page Header */}
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

				{/* Profile Settings */}
				<TabsContent value="profile" className="space-y-6">
					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Profile Information</h3>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name</Label>
								<Input id="firstName" defaultValue="John" />
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
									defaultValue="john.doe@example.com"
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
					</Card>
				</TabsContent>

				{/* Notification Settings */}
				<TabsContent value="notifications" className="space-y-6">
					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">New Maintenance Requests</p>
									<p className="text-sm text-muted-foreground">
										Get notified when new maintenance requests are submitted
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Lease Renewals</p>
									<p className="text-sm text-muted-foreground">
										Reminders for upcoming lease renewals
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Payment Notifications</p>
									<p className="text-sm text-muted-foreground">
										Alerts for rent payments and overdue accounts
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">System Updates</p>
									<p className="text-sm text-muted-foreground">
										Information about system maintenance and updates
									</p>
								</div>
								<Switch />
							</div>
						</div>
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">Emergency Maintenance</p>
									<p className="text-sm text-muted-foreground">
										Immediate alerts for critical issues
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium">New Messages</p>
									<p className="text-sm text-muted-foreground">
										Notifications for tenant messages
									</p>
								</div>
								<Switch defaultChecked />
							</div>
						</div>
					</Card>
				</TabsContent>

				{/* Security Settings */}
				<TabsContent value="security" className="space-y-6">
					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">
							Password & Authentication
						</h3>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="currentPassword">Current Password</Label>
								<Input id="currentPassword" type="password" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="newPassword">New Password</Label>
								<Input id="newPassword" type="password" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
								<Input id="confirmPassword" type="password" />
							</div>
							<Button>
								<Key className="size-4 mr-2" />
								Update Password
							</Button>
						</div>
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">
							Two-Factor Authentication
						</h3>
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
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
										<div className="w-3 h-3 rounded-full bg-green-500"></div>
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
					</Card>
				</TabsContent>

				{/* Billing Settings */}
				<TabsContent value="billing" className="space-y-6">
					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Subscription Plan</h3>
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
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Payment Method</h3>
						<div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center">
									<CreditCard className="size-5" />
								</div>
								<div>
									<p className="font-medium">•••• •••• •••• 4242</p>
									<p className="text-sm text-muted-foreground">Expires 12/25</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								Update
							</Button>
						</div>
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Billing History</h3>
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
					</Card>
				</TabsContent>

				{/* System Settings */}
				<TabsContent value="system" className="space-y-6">
					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">Data Management</h3>
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
					</Card>

					<Card className="p-6 border shadow-sm">
						<h3 className="text-lg font-semibold mb-4">System Preferences</h3>
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
					</Card>

					<Card className="p-6 border shadow-sm border-destructive/20">
						<h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
							<AlertTriangle className="size-5" />
							Danger Zone
						</h3>
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
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
