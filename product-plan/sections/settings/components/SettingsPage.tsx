'use client'

import { useState } from 'react'
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
	Check,
	X,
	AlertTriangle
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'

type SettingsTab = 'general' | 'notifications' | 'security' | 'billing'

interface SettingsSection {
	id: SettingsTab
	label: string
	icon: React.ReactNode
	description: string
}

const sections: SettingsSection[] = [
	{
		id: 'general',
		label: 'General',
		icon: <Building2 className="h-4 w-4" />,
		description: 'Business profile and preferences'
	},
	{
		id: 'notifications',
		label: 'Notifications',
		icon: <Bell className="h-4 w-4" />,
		description: 'Email, SMS, and push settings'
	},
	{
		id: 'security',
		label: 'Security',
		icon: <Shield className="h-4 w-4" />,
		description: 'Password and authentication'
	},
	{
		id: 'billing',
		label: 'Billing',
		icon: <CreditCard className="h-4 w-4" />,
		description: 'Subscription and payment info'
	}
]

interface NotificationPreference {
	id: string
	label: string
	description: string
	email: boolean
	sms: boolean
	push: boolean
}

const notificationPreferences: NotificationPreference[] = [
	{
		id: 'maintenance',
		label: 'Maintenance Requests',
		description: 'When tenants submit new maintenance requests',
		email: true,
		sms: true,
		push: true
	},
	{
		id: 'payments',
		label: 'Payment Received',
		description: 'When rent payments are received',
		email: true,
		sms: false,
		push: true
	},
	{
		id: 'leases',
		label: 'Lease Updates',
		description: 'Lease expirations and renewals',
		email: true,
		sms: false,
		push: false
	},
	{
		id: 'messages',
		label: 'New Messages',
		description: 'When tenants send you messages',
		email: false,
		sms: true,
		push: true
	},
	{
		id: 'reports',
		label: 'Weekly Reports',
		description: 'Summary of property performance',
		email: true,
		sms: false,
		push: false
	}
]

interface Invoice {
	id: string
	date: string
	amount: number
	status: 'paid' | 'pending'
}

const invoices: Invoice[] = [
	{ id: 'INV-001', date: 'Dec 1, 2024', amount: 49.0, status: 'paid' },
	{ id: 'INV-002', date: 'Nov 1, 2024', amount: 49.0, status: 'paid' },
	{ id: 'INV-003', date: 'Oct 1, 2024', amount: 49.0, status: 'paid' },
	{ id: 'INV-004', date: 'Sep 1, 2024', amount: 49.0, status: 'paid' }
]

interface Session {
	id: string
	device: string
	location: string
	lastActive: string
	current: boolean
}

const activeSessions: Session[] = [
	{
		id: '1',
		device: 'MacBook Pro - Chrome',
		location: 'Austin, TX',
		lastActive: 'Now',
		current: true
	},
	{
		id: '2',
		device: 'iPhone 15 - Safari',
		location: 'Austin, TX',
		lastActive: '2 hours ago',
		current: false
	}
]

// ============================================================================
// GENERAL SETTINGS TAB
// ============================================================================
function GeneralSettings() {
	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">General Settings</h2>
					<p className="text-sm text-muted-foreground">
						Manage your business profile and preferences
					</p>
				</div>
			</BlurFade>

			{/* Business Profile */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Business Profile
					</h3>

					<div className="space-y-4">
						{/* Business Name */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Business Name</label>
							<input
								type="text"
								defaultValue="Sunrise Property Management"
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						{/* Contact Email */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Contact Email</label>
							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground" />
								<input
									type="email"
									defaultValue="contact@sunrisepm.com"
									className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
							</div>
						</div>

						{/* Phone */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Phone Number</label>
							<div className="flex items-center gap-2">
								<Smartphone className="h-4 w-4 text-muted-foreground" />
								<input
									type="tel"
									defaultValue="(555) 123-4567"
									className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
							</div>
						</div>

						{/* Website */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Website</label>
							<div className="flex items-center gap-2">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<input
									type="url"
									defaultValue="https://sunrisepm.com"
									className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
							</div>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Preferences */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Preferences
					</h3>

					<div className="space-y-4">
						{/* Timezone */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Timezone</label>
							<select className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
								<option>America/Los_Angeles (PST)</option>
								<option>America/Denver (MST)</option>
								<option selected>America/Chicago (CST)</option>
								<option>America/New_York (EST)</option>
							</select>
						</div>

						{/* Language */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Language</label>
							<select className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
								<option selected>English (US)</option>
								<option>Spanish (ES)</option>
								<option>French (FR)</option>
							</select>
						</div>

						{/* Theme */}
						<div className="grid gap-2">
							<label className="text-sm font-medium">Theme</label>
							<select className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
								<option selected>System</option>
								<option>Light</option>
								<option>Dark</option>
							</select>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Save Button */}
			<BlurFade delay={0.35} inView>
				<div className="flex justify-end">
					<button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
						Save Changes
					</button>
				</div>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// NOTIFICATIONS TAB
// ============================================================================
function NotificationSettings() {
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
						<label className="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" defaultChecked className="sr-only peer" />
							<div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
						</label>
					</div>
				</section>
			</BlurFade>

			{/* Notification Preferences */}
			<BlurFade delay={0.2} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Notification Preferences
					</h3>

					{/* Column Headers */}
					<div className="flex items-center border-b pb-3 mb-4">
						<div className="flex-1" />
						<div className="flex w-40 justify-around text-xs text-muted-foreground">
							<span className="flex flex-col items-center gap-1">
								<Mail className="h-4 w-4" />
								Email
							</span>
							<span className="flex flex-col items-center gap-1">
								<MessageSquare className="h-4 w-4" />
								SMS
							</span>
							<span className="flex flex-col items-center gap-1">
								<Bell className="h-4 w-4" />
								Push
							</span>
						</div>
					</div>

					{/* Notification Rows */}
					<div className="space-y-4">
						{notificationPreferences.map((pref, idx) => (
							<BlurFade key={pref.id} delay={0.25 + idx * 0.05} inView>
								<div className="flex items-center py-2 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
									<div className="flex-1">
										<p className="text-sm font-medium">{pref.label}</p>
										<p className="text-xs text-muted-foreground">
											{pref.description}
										</p>
									</div>
									<div className="flex w-40 justify-around">
										<input
											type="checkbox"
											defaultChecked={pref.email}
											className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
										/>
										<input
											type="checkbox"
											defaultChecked={pref.sms}
											className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
										/>
										<input
											type="checkbox"
											defaultChecked={pref.push}
											className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
										/>
									</div>
								</div>
							</BlurFade>
						))}
					</div>
				</section>
			</BlurFade>

			{/* Save Button */}
			<BlurFade delay={0.5} inView>
				<div className="flex justify-end">
					<button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
						Save Preferences
					</button>
				</div>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// SECURITY TAB
// ============================================================================
function SecuritySettings() {
	const [showPassword, setShowPassword] = useState(false)

	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Security Settings</h2>
					<p className="text-sm text-muted-foreground">
						Manage your password and authentication methods
					</p>
				</div>
			</BlurFade>

			{/* Password Section */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Password
					</h3>

					<div className="space-y-4">
						<div className="grid gap-2">
							<label className="text-sm font-medium">Current Password</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter current password"
									className="h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<div className="grid gap-2">
							<label className="text-sm font-medium">New Password</label>
							<input
								type="password"
								placeholder="Enter new password"
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
							<p className="text-xs text-muted-foreground">
								Must be at least 8 characters with uppercase, lowercase, and
								numbers
							</p>
						</div>

						<div className="grid gap-2">
							<label className="text-sm font-medium">
								Confirm New Password
							</label>
							<input
								type="password"
								placeholder="Confirm new password"
								className="h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
							/>
						</div>

						<div className="flex justify-end">
							<button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
								Update Password
							</button>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Two-Factor Authentication */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={80}
						duration={10}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary)/0.3)"
					/>
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Two-Factor Authentication
					</h3>

					<div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
								<Shield className="h-5 w-5 text-success" />
							</div>
							<div>
								<p className="text-sm font-medium flex items-center gap-2">
									2FA is Enabled
									<CheckCircle className="h-4 w-4 text-success" />
								</p>
								<p className="text-xs text-muted-foreground">
									Your account is protected with authenticator app
								</p>
							</div>
						</div>
						<button className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
							Disable
						</button>
					</div>
				</section>
			</BlurFade>

			{/* Active Sessions */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
							Active Sessions
						</h3>
						<button className="text-sm font-medium text-destructive hover:underline">
							Sign Out All Other Devices
						</button>
					</div>

					<div className="space-y-3">
						{activeSessions.map((session, idx) => (
							<BlurFade key={session.id} delay={0.4 + idx * 0.05} inView>
								<div
									className={`flex items-center justify-between p-3 rounded-lg border ${session.current ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/30'} transition-colors`}
								>
									<div className="flex items-center gap-3">
										<User className="h-5 w-5 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium flex items-center gap-2">
												{session.device}
												{session.current && (
													<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
														Current
													</span>
												)}
											</p>
											<p className="text-xs text-muted-foreground">
												{session.location} · {session.lastActive}
											</p>
										</div>
									</div>
									{!session.current && (
										<button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
											<LogOut className="h-4 w-4" />
										</button>
									)}
								</div>
							</BlurFade>
						))}
					</div>
				</section>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// BILLING TAB
// ============================================================================
function BillingSettings() {
	return (
		<div className="space-y-6">
			<BlurFade delay={0.1} inView>
				<div className="mb-6">
					<h2 className="text-lg font-semibold">Billing & Subscription</h2>
					<p className="text-sm text-muted-foreground">
						Manage your subscription and payment methods
					</p>
				</div>
			</BlurFade>

			{/* Current Plan */}
			<BlurFade delay={0.15} inView>
				<section className="rounded-lg border bg-card p-6 relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary)/0.3)"
					/>
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Current Plan
					</h3>

					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<h4 className="text-xl font-bold">Professional</h4>
								<span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
									Active
								</span>
							</div>
							<p className="text-2xl font-bold text-primary">
								$49
								<span className="text-sm font-normal text-muted-foreground">
									/month
								</span>
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Up to 50 units · Unlimited tenants
							</p>
							<p className="text-xs text-muted-foreground mt-2">
								Next billing date: January 1, 2025
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
								Upgrade Plan
							</button>
							<button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
								View All Plans
							</button>
						</div>
					</div>
				</section>
			</BlurFade>

			{/* Payment Method */}
			<BlurFade delay={0.25} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Payment Method
					</h3>

					<div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-14 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
								VISA
							</div>
							<div>
								<p className="text-sm font-medium">•••• •••• •••• 4242</p>
								<p className="text-xs text-muted-foreground">Expires 12/2026</p>
							</div>
						</div>
						<button className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
							Update Card
						</button>
					</div>
				</section>
			</BlurFade>

			{/* Billing History */}
			<BlurFade delay={0.35} inView>
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Billing History
					</h3>

					<div className="space-y-2">
						{invoices.map((invoice, idx) => (
							<BlurFade key={invoice.id} delay={0.4 + idx * 0.05} inView>
								<div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
									<div className="flex items-center gap-4">
										<span className="text-sm font-medium">{invoice.id}</span>
										<span className="text-sm text-muted-foreground">
											{invoice.date}
										</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm font-medium">
											${invoice.amount.toFixed(2)}
										</span>
										<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
											<CheckCircle className="w-3 h-3" />
											Paid
										</span>
										<button className="text-sm text-primary hover:underline">
											Download
										</button>
									</div>
								</div>
							</BlurFade>
						))}
					</div>

					<div className="mt-4 text-center">
						<button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
							View All Invoices
						</button>
					</div>
				</section>
			</BlurFade>

			{/* Danger Zone */}
			<BlurFade delay={0.55} inView>
				<section className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
					<h3 className="mb-4 text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
						<AlertTriangle className="h-4 w-4" />
						Danger Zone
					</h3>

					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Cancel Subscription</p>
							<p className="text-xs text-muted-foreground">
								Your data will be retained for 30 days after cancellation
							</p>
						</div>
						<button className="px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors">
							Cancel Plan
						</button>
					</div>
				</section>
			</BlurFade>
		</div>
	)
}

// ============================================================================
// MAIN SETTINGS PAGE
// ============================================================================
export function SettingsPage() {
	const [activeTab, setActiveTab] = useState<SettingsTab>('general')

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
		<div className="p-6 lg:p-8 bg-background min-h-full">
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
						<div className="space-y-1">
							{sections.map((section, index) => (
								<BlurFade key={section.id} delay={0.2 + index * 0.05} inView>
									<button
										onClick={() => setActiveTab(section.id)}
										className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
											activeTab === section.id
												? 'bg-primary text-primary-foreground'
												: 'text-muted-foreground hover:bg-muted hover:text-foreground'
										}`}
									>
										<div className="flex items-center gap-3">
											{section.icon}
											<span>{section.label}</span>
										</div>
										<ChevronRight
											className={`h-4 w-4 transition-transform ${activeTab === section.id ? 'rotate-90' : ''}`}
										/>
									</button>
								</BlurFade>
							))}
						</div>
					</nav>
				</BlurFade>

				{/* Main Content */}
				<div className="flex-1 min-w-0">{renderContent()}</div>
			</div>
		</div>
	)
}
