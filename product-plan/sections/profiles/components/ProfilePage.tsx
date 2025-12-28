'use client'

import {
	Building2,
	Calendar,
	Camera,
	Clock,
	Edit,
	Key,
	LogOut,
	Mail,
	MapPin,
	Phone,
	Settings,
	Shield,
	User,
	CheckCircle
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '@/components/ui/stat'

interface ActivityItem {
	id: string
	action: string
	target: string
	timestamp: string
	icon: React.ReactNode
}

const recentActivity: ActivityItem[] = [
	{
		id: '1',
		action: 'Updated rent amount for',
		target: 'Unit 4B, Sunset Apartments',
		timestamp: '2 hours ago',
		icon: <Edit className="h-4 w-4" />
	},
	{
		id: '2',
		action: 'Resolved maintenance request',
		target: 'Leaky faucet - Unit 2A',
		timestamp: 'Yesterday',
		icon: <Building2 className="h-4 w-4" />
	},
	{
		id: '3',
		action: 'Sent lease renewal to',
		target: 'Sarah Johnson',
		timestamp: '2 days ago',
		icon: <Mail className="h-4 w-4" />
	},
	{
		id: '4',
		action: 'Added new property',
		target: 'Oak Street Duplex',
		timestamp: '3 days ago',
		icon: <Building2 className="h-4 w-4" />
	},
	{
		id: '5',
		action: 'Updated security settings',
		target: 'Enabled 2FA',
		timestamp: '1 week ago',
		icon: <Shield className="h-4 w-4" />
	}
]

interface QuickLink {
	label: string
	description: string
	icon: React.ReactNode
	href: string
}

const quickLinks: QuickLink[] = [
	{
		label: 'Account Settings',
		description: 'Manage your account preferences',
		icon: <Settings className="h-5 w-5" />,
		href: '/settings'
	},
	{
		label: 'Security',
		description: 'Password and 2FA settings',
		icon: <Shield className="h-5 w-5" />,
		href: '/settings/security'
	},
	{
		label: 'Notifications',
		description: 'Manage notification preferences',
		icon: <Mail className="h-5 w-5" />,
		href: '/settings/notifications'
	}
]

export function ProfilePage() {
	const propertyCount = 12
	const unitCount = 48

	return (
		<div className="space-y-6">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div>
					<h1 className="text-2xl font-bold">My Profile</h1>
					<p className="text-muted-foreground">
						View and manage your account information
					</p>
				</div>
			</BlurFade>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Profile Card */}
				<BlurFade delay={0.15} inView>
					<div className="lg:col-span-1">
						<div className="rounded-lg border bg-card p-6 relative overflow-hidden">
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="hsl(var(--primary))"
								colorTo="hsl(var(--primary)/0.3)"
							/>

							{/* Avatar Section */}
							<div className="flex flex-col items-center">
								<div className="relative">
									<div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
										<User className="h-12 w-12 text-primary" />
									</div>
									<button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
										<Camera className="h-4 w-4" />
									</button>
								</div>

								<h2 className="mt-4 text-xl font-semibold">Michael Chen</h2>
								<p className="text-sm text-muted-foreground">Property Owner</p>

								<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
									<Clock className="h-3 w-3" />
									Member since Jan 2023
								</div>
							</div>

							{/* Stats - Premium Stat Components */}
							<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
								<BlurFade delay={0.2} inView>
									<Stat className="text-center">
										<StatValue className="flex items-center justify-center text-primary">
											<NumberTicker value={propertyCount} duration={1000} />
										</StatValue>
										<StatDescription className="text-center">
											Properties
										</StatDescription>
									</Stat>
								</BlurFade>
								<BlurFade delay={0.25} inView>
									<Stat className="text-center">
										<StatValue className="flex items-center justify-center text-primary">
											<NumberTicker value={unitCount} duration={1200} />
										</StatValue>
										<StatDescription className="text-center">
											Units
										</StatDescription>
									</Stat>
								</BlurFade>
							</div>

							{/* Sign Out */}
							<button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5">
								<LogOut className="h-4 w-4" />
								Sign Out
							</button>
						</div>
					</div>
				</BlurFade>

				{/* Main Content */}
				<div className="space-y-6 lg:col-span-2">
					{/* Personal Information */}
					<BlurFade delay={0.3} inView>
						<section className="rounded-lg border bg-card p-6">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-lg font-semibold">Personal Information</h3>
								<button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
									<Edit className="h-4 w-4" />
									Edit
								</button>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								{/* Full Name */}
								<BlurFade delay={0.35} inView>
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Full Name
										</label>
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">Michael Chen</p>
										</div>
									</div>
								</BlurFade>

								{/* Email */}
								<BlurFade delay={0.4} inView>
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Email Address
										</label>
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">
												michael@sunrisepm.com
											</p>
										</div>
									</div>
								</BlurFade>

								{/* Phone */}
								<BlurFade delay={0.45} inView>
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Phone Number
										</label>
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">(555) 123-4567</p>
										</div>
									</div>
								</BlurFade>

								{/* Location */}
								<BlurFade delay={0.5} inView>
									<div className="space-y-1">
										<label className="text-xs font-medium text-muted-foreground">
											Location
										</label>
										<div className="flex items-center gap-2">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">San Francisco, CA</p>
										</div>
									</div>
								</BlurFade>
							</div>
						</section>
					</BlurFade>

					{/* Security Status */}
					<BlurFade delay={0.55} inView>
						<section className="rounded-lg border bg-card p-6">
							<h3 className="mb-4 text-lg font-semibold">Security Status</h3>

							<div className="grid gap-3 sm:grid-cols-2">
								{/* Password */}
								<BlurFade delay={0.6} inView>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 hover:bg-muted/70 transition-colors">
										<div className="flex items-center gap-3">
											<Key className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">Password</p>
												<p className="text-xs text-muted-foreground">
													Last changed 30 days ago
												</p>
											</div>
										</div>
										<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
											<CheckCircle className="w-3 h-3" />
											Strong
										</span>
									</div>
								</BlurFade>

								{/* 2FA */}
								<BlurFade delay={0.65} inView>
									<div className="flex items-center justify-between rounded-lg bg-muted/50 p-4 relative overflow-hidden hover:bg-muted/70 transition-colors">
										<BorderBeam
											size={60}
											duration={8}
											colorFrom="hsl(142 76% 36%)"
											colorTo="hsl(142 76% 36% / 0.3)"
										/>
										<div className="flex items-center gap-3">
											<Shield className="h-5 w-5 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">Two-Factor Auth</p>
												<p className="text-xs text-muted-foreground">
													Via authenticator app
												</p>
											</div>
										</div>
										<span className="inline-flex items-center gap-1 text-xs font-medium text-success">
											<CheckCircle className="w-3 h-3" />
											Enabled
										</span>
									</div>
								</BlurFade>
							</div>
						</section>
					</BlurFade>

					{/* Quick Links */}
					<BlurFade delay={0.7} inView>
						<section className="rounded-lg border bg-card p-6">
							<h3 className="mb-4 text-lg font-semibold">Quick Links</h3>

							<div className="grid gap-3 sm:grid-cols-3">
								{quickLinks.map((link, idx) => (
									<BlurFade key={link.label} delay={0.75 + idx * 0.05} inView>
										<button className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50 group">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
												{link.icon}
											</div>
											<div>
												<p className="text-sm font-medium">{link.label}</p>
												<p className="text-xs text-muted-foreground">
													{link.description}
												</p>
											</div>
										</button>
									</BlurFade>
								))}
							</div>
						</section>
					</BlurFade>

					{/* Recent Activity */}
					<BlurFade delay={0.9} inView>
						<section className="rounded-lg border bg-card p-6">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-lg font-semibold">Recent Activity</h3>
								<button className="text-sm font-medium text-primary hover:underline">
									View All
								</button>
							</div>

							<div className="space-y-4">
								{recentActivity.map((activity, idx) => (
									<BlurFade key={activity.id} delay={0.95 + idx * 0.05} inView>
										<div className="flex items-start gap-3 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
												{activity.icon}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm">
													<span className="text-muted-foreground">
														{activity.action}
													</span>{' '}
													<span className="font-medium">{activity.target}</span>
												</p>
												<div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
													<Calendar className="h-3 w-3" />
													{activity.timestamp}
												</div>
											</div>
										</div>
									</BlurFade>
								))}
							</div>
						</section>
					</BlurFade>
				</div>
			</div>
		</div>
	)
}
