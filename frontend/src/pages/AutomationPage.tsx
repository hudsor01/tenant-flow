import React from 'react'
import { motion } from 'framer-motion'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RentRemindersDashboard from '@/components/automation/RentRemindersDashboard'
import LeaseExpirationDashboard from '@/components/automation/LeaseExpirationDashboard'
import MaintenanceAutoAssignmentDashboard from '@/components/automation/MaintenanceAutoAssignmentDashboard'
import PropertyAnalyticsDashboard from '@/components/automation/PropertyAnalyticsDashboard'
import { Bell, Calendar, Settings, Wrench, TrendingUp } from 'lucide-react'

export default function AutomationPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex items-center justify-between"
			>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Automation
					</h1>
					<p className="text-muted-foreground">
						Automate routine property management tasks and
						communications
					</p>
				</div>
				<Settings className="text-muted-foreground h-8 w-8" />
			</motion.div>

			{/* Feature Overview Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<Card>
						<CardContent className="p-6">
							<div className="mb-2 flex items-center space-x-2">
								<Bell className="h-5 w-5 text-blue-600" />
								<span className="font-medium">
									Rent Reminders
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Automatically track and send rent payment
								reminders to tenants
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<Card>
						<CardContent className="p-6">
							<div className="mb-2 flex items-center space-x-2">
								<Calendar className="h-5 w-5 text-green-600" />
								<span className="font-medium">
									Lease Alerts
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Get notified about upcoming lease expirations
								and renewals
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
				>
					<Card>
						<CardContent className="p-6">
							<div className="mb-2 flex items-center space-x-2">
								<Wrench className="h-5 w-5 text-orange-600" />
								<span className="font-medium">
									Auto-Assignment
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Automatically assign maintenance requests to
								qualified contractors
							</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					<Card>
						<CardContent className="p-6">
							<div className="mb-2 flex items-center space-x-2">
								<TrendingUp className="h-5 w-5 text-purple-600" />
								<span className="font-medium">
									Smart Analytics
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Automated insights and performance tracking for
								your properties
							</p>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Automation Tabs */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
			>
				<Tabs defaultValue="rent-reminders" className="space-y-6">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger
							value="rent-reminders"
							className="flex items-center gap-2"
						>
							<Bell className="h-4 w-4" />
							Rent Reminders
						</TabsTrigger>
						<TabsTrigger
							value="lease-alerts"
							className="flex items-center gap-2"
						>
							<Calendar className="h-4 w-4" />
							Lease Alerts
						</TabsTrigger>
						<TabsTrigger
							value="maintenance"
							className="flex items-center gap-2"
						>
							<Wrench className="h-4 w-4" />
							Maintenance
						</TabsTrigger>
						<TabsTrigger
							value="analytics"
							className="flex items-center gap-2"
						>
							<TrendingUp className="h-4 w-4" />
							Analytics
						</TabsTrigger>
						<TabsTrigger
							value="settings"
							className="flex items-center gap-2"
						>
							<Settings className="h-4 w-4" />
							Settings
						</TabsTrigger>
					</TabsList>

					<TabsContent value="rent-reminders">
						<RentRemindersDashboard />
					</TabsContent>

					<TabsContent value="lease-alerts">
						<LeaseExpirationDashboard />
					</TabsContent>

					<TabsContent value="maintenance">
						<MaintenanceAutoAssignmentDashboard />
					</TabsContent>

					<TabsContent value="analytics">
						<PropertyAnalyticsDashboard />
					</TabsContent>

					<TabsContent value="settings">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Settings className="h-5 w-5" />
									Automation Settings
								</CardTitle>
								<CardDescription>
									Configure your automation preferences and
									notifications
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="py-8 text-center">
									<Settings className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
									<h3 className="text-muted-foreground mb-2 text-lg font-medium">
										Settings Panel Coming Soon
									</h3>
									<p className="text-muted-foreground mx-auto max-w-md text-sm">
										Customize your automation settings,
										notification preferences, and timing for
										automated communications.
									</p>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</motion.div>
		</div>
	)
}
