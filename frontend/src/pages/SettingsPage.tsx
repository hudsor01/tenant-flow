import React, { useState, useEffect } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LucideIcon } from 'lucide-react'
import {
	Settings as SettingsIcon,
	Bell,
	Palette,
	Shield,
	CreditCard
} from 'lucide-react'
import { motion } from 'framer-motion'
import BillingDashboard from '@/components/billing/BillingDashboard'
import { useSearchParams } from 'react-router-dom'

interface SettingsCategoryProps {
	icon: LucideIcon
	title: string
	description: string
	children: React.ReactNode
}

const SettingsCategory: React.FC<SettingsCategoryProps> = ({
	icon: Icon,
	title,
	description,
	children
}) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5 }}
	>
		<Card className="bg-card shadow-lg">
			<CardHeader>
				<div className="flex items-center space-x-3">
					<Icon className="text-primary h-6 w-6" />
					<CardTitle className="text-foreground text-xl">
						{title}
					</CardTitle>
				</div>
				<CardDescription className="text-muted-foreground pt-1 font-sans">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	</motion.div>
)

const SettingsPage: React.FC = () => {
	const [searchParams] = useSearchParams()
	const [activeTab, setActiveTab] = useState('general')

	// Basic toggle for dark mode for demonstration
	const toggleDarkMode = (): void => {
		document.documentElement.classList.toggle('dark')
	}

	useEffect(() => {
		const tab = searchParams.get('tab')
		if (tab) {
			setActiveTab(tab)
		}
	}, [searchParams])

	return (
		<div className="space-y-8 p-1">
			<motion.h1
				className="text-foreground text-3xl font-bold tracking-tight"
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.5 }}
			>
				Settings
			</motion.h1>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="notifications">
						Notifications
					</TabsTrigger>
					<TabsTrigger value="appearance">Appearance</TabsTrigger>
					<TabsTrigger value="security">Security</TabsTrigger>
					<TabsTrigger value="billing">
						<CreditCard className="mr-2 h-4 w-4" />
						Billing
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="space-y-6">
					<SettingsCategory
						icon={SettingsIcon}
						title="General"
						description="General application settings."
					>
						<p className="text-foreground font-sans">
							More general settings will appear here...
						</p>
					</SettingsCategory>
				</TabsContent>

				<TabsContent value="notifications" className="space-y-6">
					<SettingsCategory
						icon={Bell}
						title="Notifications"
						description="Manage your notification preferences."
					>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-foreground font-sans">
									Email Notifications
								</p>
								<Button
									variant="outline"
									size="sm"
									className="font-sans"
								>
									Toggle
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-foreground font-sans">
									Push Notifications
								</p>
								<Button
									variant="outline"
									size="sm"
									className="font-sans"
								>
									Toggle
								</Button>
							</div>
						</div>
					</SettingsCategory>
				</TabsContent>

				<TabsContent value="appearance" className="space-y-6">
					<SettingsCategory
						icon={Palette}
						title="Appearance"
						description="Customize the look and feel of the application."
					>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-foreground font-sans">
									Theme
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={toggleDarkMode}
									className="font-sans"
								>
									Toggle Dark Mode
								</Button>
							</div>
							<div className="flex items-center justify-between">
								<p className="text-foreground font-sans">
									Accent Color
								</p>
								<div className="flex space-x-2">
									<button className="border-border ring-ring h-6 w-6 rounded-full border-2 bg-blue-600 hover:ring-2"></button>
									<button className="border-border ring-ring h-6 w-6 rounded-full border-2 bg-teal-500 hover:ring-2"></button>
									<button className="border-border ring-ring h-6 w-6 rounded-full border-2 bg-slate-600 hover:ring-2"></button>
								</div>
							</div>
						</div>
					</SettingsCategory>
				</TabsContent>

				<TabsContent value="security" className="space-y-6">
					<SettingsCategory
						icon={Shield}
						title="Security"
						description="Manage your account security settings."
					>
						<div className="space-y-3">
							<Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full font-sans">
								Change Password
							</Button>
							<Button
								variant="outline"
								className="w-full font-sans"
							>
								Enable Two-Factor Authentication
							</Button>
						</div>
					</SettingsCategory>
				</TabsContent>

				<TabsContent value="billing" className="space-y-6">
					<BillingDashboard />
				</TabsContent>
			</Tabs>
		</div>
	)
}

export default SettingsPage
