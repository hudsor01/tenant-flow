import * as React from 'react'
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text,
	Tailwind
} from '@react-email/components'

interface Day3EducationEmailProps {
	firstName?: string
	propertyCount?: number
	lastLogin?: string
}

export default function Day3EducationEmail({
	firstName = 'Property Manager',
	propertyCount = 0,
	lastLogin = 'recently'
}: Day3EducationEmailProps) {
	const getTips = () => {
		if (propertyCount === 0) {
			return [
				{
					icon: '🏠',
					title: 'Add Your First Property',
					description:
						'Start by adding your rental property details - address, type, and basic information.',
					actionText: 'Add Property',
					actionUrl:
						'https://tenantflow.app/properties/new?source=day3_email'
				},
				{
					icon: '📋',
					title: 'Create Unit Listings',
					description:
						'Set up individual units with rent amounts, bedrooms, and amenities.',
					actionText: 'Learn More',
					actionUrl:
						'https://tenantflow.app/help/units?source=day3_email'
				},
				{
					icon: '👥',
					title: 'Invite Your First Tenant',
					description:
						'Send secure invitations to tenants and streamline your onboarding process.',
					actionText: 'View Guide',
					actionUrl:
						'https://tenantflow.app/help/tenants?source=day3_email'
				}
			]
		} else if (propertyCount <= 3) {
			return [
				{
					icon: '💰',
					title: 'Automate Rent Collection',
					description:
						'Set up automatic rent reminders and reduce late payments by 40%.',
					actionText: 'Setup Automation',
					actionUrl:
						'https://tenantflow.app/payments/setup?source=day3_email'
				},
				{
					icon: '📊',
					title: 'Track Your Finances',
					description:
						'Monitor income, expenses, and profitability across all your properties.',
					actionText: 'View Analytics',
					actionUrl:
						'https://tenantflow.app/analytics?source=day3_email'
				},
				{
					icon: '🔧',
					title: 'Maintenance Management',
					description:
						'Create maintenance workflows and track repair requests efficiently.',
					actionText: 'Get Started',
					actionUrl:
						'https://tenantflow.app/maintenance?source=day3_email'
				}
			]
		} else {
			return [
				{
					icon: '📈',
					title: 'Scale Your Portfolio',
					description:
						'Advanced reporting and bulk operations for growing property portfolios.',
					actionText: 'Explore Enterprise',
					actionUrl:
						'https://tenantflow.app/tenantflow_max?source=day3_email'
				},
				{
					icon: '🤖',
					title: 'Advanced Automation',
					description:
						'Implement smart workflows for lease renewals and tenant communications.',
					actionText: 'Setup Workflows',
					actionUrl:
						'https://tenantflow.app/automation?source=day3_email'
				},
				{
					icon: '📱',
					title: 'Mobile Management',
					description:
						'Manage properties on-the-go with our mobile-optimized interface.',
					actionText: 'Learn More',
					actionUrl:
						'https://tenantflow.app/help/mobile?source=day3_email'
				}
			]
		}
	}

	const tips = getTips()

	return (
		<Html>
			<Head />
			<Preview>
				Day 3: Advanced Property Management Strategies - TenantFlow
			</Preview>
			<Tailwind>
				<Body className="bg-gray-50 font-sans">
					<Container className="mx-auto max-w-2xl px-4 py-8">
						{/* Header */}
						<Section className="rounded-t-lg border-b border-gray-200 bg-white px-8 py-6">
							<Img
								src="https://tenantflow.app/logo-email.png"
								width="180"
								height="60"
								alt="TenantFlow"
								className="mx-auto"
							/>
						</Section>

						{/* Main Content */}
						<Section className="bg-white px-8 py-6">
							<Heading className="mb-4 text-2xl font-bold text-gray-800">
								Day 3: Advanced Strategies, {firstName} 📈
							</Heading>

							<Text className="mb-6 text-lg text-gray-600">
								Ready to take your property management to the
								next level? Here are personalized strategies
								based on your current setup.
							</Text>

							{/* Progress Indicator */}
							<Section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
								<Text className="mb-2 font-semibold text-blue-800">
									📊 Your Progress
								</Text>
								<Text className="mb-2 text-blue-700">
									Properties:{' '}
									{propertyCount > 0
										? `${propertyCount} active`
										: 'Ready to start'}
								</Text>
								<Text className="mb-0 text-blue-700">
									Last activity: {lastLogin}
								</Text>
							</Section>

							{/* Tips Section */}
							<Heading className="mb-4 text-xl font-semibold text-gray-800">
								🎯 Recommended Next Steps
							</Heading>

							{tips.map((tip, index) => (
								<Section
									key={index}
									className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-6"
								>
									<div className="flex items-start gap-4">
										<div className="text-2xl">
											{tip.icon}
										</div>
										<div className="flex-1">
											<Heading className="mb-2 text-lg font-semibold text-gray-800">
												{tip.title}
											</Heading>
											<Text className="mb-4 text-gray-600">
												{tip.description}
											</Text>
											<Button
												href={tip.actionUrl}
												className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
											>
												{tip.actionText}
											</Button>
										</div>
									</div>
								</Section>
							))}

							{/* Quick Win Section */}
							<Section className="mb-6 rounded-r-lg border-l-4 border-green-500 bg-green-50 p-6">
								<Heading className="mb-2 text-lg font-semibold text-green-800">
									💡 Quick Win This Week
								</Heading>
								<Text className="mb-4 text-green-700">
									{propertyCount === 0
										? 'Add your first property and see how TenantFlow organizes everything automatically.'
										: 'Set up automated rent reminders to reduce your late payment rate by 40%.'}
								</Text>
								<Button
									href={
										propertyCount === 0
											? 'https://tenantflow.app/properties/new?source=day3_quickwin'
											: 'https://tenantflow.app/payments/automation?source=day3_quickwin'
									}
									className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
								>
									{propertyCount === 0
										? 'Add Property'
										: 'Setup Automation'}
								</Button>
							</Section>

							{/* Industry Insights */}
							<Section className="border-t border-gray-200 pt-6">
								<Heading className="mb-3 text-lg font-semibold text-gray-800">
									📚 Industry Insights
								</Heading>
								<Text className="mb-2 text-gray-600">
									📈 <strong>Market Trend:</strong> Digital
									rent collection adoption increased 67% in
									2024
								</Text>
								<Text className="mb-2 text-gray-600">
									⏰ <strong>Time Savings:</strong> Automated
									workflows save property managers 15+ hours
									per week
								</Text>
								<Text className="mb-4 text-gray-600">
									💼 <strong>Best Practice:</strong> Proactive
									maintenance reduces repair costs by 30%
								</Text>
							</Section>

							{/* What's Coming */}
							<Section className="rounded-lg bg-gray-50 p-4">
								<Text className="mb-2 text-gray-600">
									<strong>Coming up:</strong>
								</Text>
								<Text className="mb-0 text-gray-600">
									🎯 <strong>Day 7:</strong> Personalized demo
									based on your specific needs and questions
								</Text>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								Questions? Reply to this email - we read every
								message!
								<br />
								The TenantFlow Team
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								You're receiving this as part of your TenantFlow
								onboarding series.{' '}
								<Link
									href="https://tenantflow.app/unsubscribe"
									className="text-gray-400 underline"
								>
									Unsubscribe
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
