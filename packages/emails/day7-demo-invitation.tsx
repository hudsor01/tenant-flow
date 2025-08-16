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

interface Day7DemoEmailProps {
	firstName?: string
	propertyCount?: number
	completedActions?: string[]
	timeZone?: string
}

export default function Day7DemoEmail({
	firstName = 'Property Manager',
	propertyCount = 0,
	completedActions = [],
	timeZone = 'America/New_York'
}: Day7DemoEmailProps) {
	const getPersonalizedDemo = () => {
		if (propertyCount === 0) {
			return {
				title: 'Getting Started Demo',
				description:
					"Perfect for first-time setup - we'll walk through adding properties, creating units, and inviting your first tenants.",
				duration: '15 minutes',
				features: [
					'Property setup walkthrough',
					'Tenant invitation process',
					'Basic rent collection setup',
					'Q&A for your specific needs'
				]
			}
		} else if (propertyCount <= 5) {
			return {
				title: 'Growth & Automation Demo',
				description:
					'Ideal for growing portfolios - focus on automation, advanced features, and scaling your operations.',
				duration: '20 minutes',
				features: [
					'Advanced automation setup',
					'Financial reporting deep dive',
					'Maintenance workflow optimization',
					'Multi-property management tips'
				]
			}
		} else {
			return {
				title: 'Enterprise Portfolio Demo',
				description:
					'Designed for serious investors - tenantflow_max features, bulk operations, and advanced analytics.',
				duration: '30 minutes',
				features: [
					'Enterprise dashboard overview',
					'Bulk operations and workflows',
					'Advanced analytics and reporting',
					'Custom integrations discussion'
				]
			}
		}
	}

	const demo = getPersonalizedDemo()
	const completionRate = Math.round((completedActions.length / 8) * 100)

	return (
		<Html>
			<Head />
			<Preview>
				Day 7: Your Personalized TenantFlow Demo Invitation
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
								Ready for Your Personal Demo, {firstName}? 🎯
							</Heading>

							<Text className="mb-6 text-lg text-gray-600">
								You've been exploring TenantFlow for a week now.
								Let's have a personalized conversation about
								your specific property management goals.
							</Text>

							{/* Progress Summary */}
							<Section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
								<Heading className="mb-3 text-lg font-semibold text-blue-800">
									📊 Your Week 1 Progress
								</Heading>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Text className="mb-1 font-medium text-blue-700">
											Properties Added
										</Text>
										<Text className="text-2xl font-bold text-blue-800">
											{propertyCount}
										</Text>
									</div>
									<div>
										<Text className="mb-1 font-medium text-blue-700">
											Setup Complete
										</Text>
										<Text className="text-2xl font-bold text-blue-800">
											{completionRate}%
										</Text>
									</div>
								</div>
								{completedActions.length > 0 && (
									<Text className="mt-3 text-sm text-blue-700">
										✅ Completed:{' '}
										{completedActions.join(', ')}
									</Text>
								)}
							</Section>

							{/* Personalized Demo */}
							<Section className="mb-6 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
								<Heading className="mb-3 text-xl font-semibold text-purple-800">
									🎥 {demo.title}
								</Heading>
								<Text className="mb-4 text-purple-700">
									{demo.description}
								</Text>

								<div className="mb-4 rounded-lg bg-white p-4">
									<Text className="mb-2 font-semibold text-gray-800">
										What we'll cover ({demo.duration}):
									</Text>
									{demo.features.map((feature, index) => (
										<Text
											key={index}
											className="mb-1 text-gray-600"
										>
											• {feature}
										</Text>
									))}
								</div>

								<Button
									href="https://tenantflow.app/book-demo?source=day7_email&type=personalized"
									className="w-full rounded-lg bg-purple-600 px-8 py-3 text-center font-semibold text-white transition-colors hover:bg-purple-700"
								>
									Book My Personal Demo
								</Button>
							</Section>

							{/* Alternative Options */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									🕐 Prefer a Different Format?
								</Heading>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="rounded-lg border border-green-200 bg-green-50 p-4">
										<Text className="mb-2 font-semibold text-green-800">
											📞 Quick Call (10 min)
										</Text>
										<Text className="mb-3 text-sm text-green-700">
											Just want to ask a few questions?
											Let's have a quick chat.
										</Text>
										<Button
											href="https://tenantflow.app/book-call?source=day7_email"
											className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
										>
											Schedule Call
										</Button>
									</div>

									<div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
										<Text className="mb-2 font-semibold text-orange-800">
											📺 Self-Guided Tour
										</Text>
										<Text className="mb-3 text-sm text-orange-700">
											Explore at your own pace with our
											interactive product tour.
										</Text>
										<Button
											href="https://tenantflow.app/product-tour?source=day7_email"
											className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
										>
											Start Tour
										</Button>
									</div>
								</div>
							</Section>

							{/* Social Proof */}
							<Section className="mb-6 rounded-lg bg-gray-50 p-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									💬 What Other Property Managers Say
								</Heading>

								<div className="space-y-4">
									<div className="border-brand-500 rounded-lg border-l-4 bg-white p-4">
										<Text className="mb-2 text-gray-700">
											"The demo showed me exactly how to
											save 10+ hours per week. Best
											investment I've made for my rental
											business."
										</Text>
										<Text className="text-sm text-gray-500">
											— Sarah M., 12 properties
										</Text>
									</div>

									<div className="rounded-lg border-l-4 border-green-500 bg-white p-4">
										<Text className="mb-2 text-gray-700">
											"The personalized setup
											recommendations were spot-on. Within
											a week, my rent collection improved
											dramatically."
										</Text>
										<Text className="text-sm text-gray-500">
											— Mike R., 3 properties
										</Text>
									</div>
								</div>
							</Section>

							{/* Time Zone Note */}
							<Section className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
								<Text className="text-sm text-yellow-800">
									⏰ <strong>Note:</strong> All demo times
									will be shown in your local time zone (
									{timeZone}). We offer flexible scheduling
									including evenings and weekends.
								</Text>
							</Section>

							{/* No Demo Option */}
							<Section className="text-center">
								<Text className="mb-2 text-sm text-gray-600">
									Not ready for a demo yet? No problem!
								</Text>
								<Link
									href="https://tenantflow.app/help/getting-started?source=day7_email"
									className="text-sm text-blue-600 underline"
								>
									Continue with self-service resources
								</Link>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								Questions? Reply to this email or text us at
								(555) 123-4567
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
