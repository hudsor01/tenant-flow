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

interface FeatureAnnouncementEmailProps {
	firstName?: string
	featureName?: string
	featureDescription?: string
	featureImage?: string
	betaAccess?: boolean
	releaseDate?: string
}

export default function FeatureAnnouncementEmail({
	firstName = 'Property Manager',
	featureName = 'Smart Maintenance Scheduling',
	featureDescription = 'AI-powered maintenance scheduling that predicts optimal service times and reduces tenant disruptions by 60%.',
	featureImage = 'https://tenantflow.app/features/maintenance-ai.png',
	betaAccess = false,
	releaseDate = 'This Week'
}: FeatureAnnouncementEmailProps) {
	const benefits = [
		{
			icon: '🤖',
			title: 'AI-Powered Scheduling',
			description:
				'Automatically optimize maintenance windows based on tenant preferences and historical data.'
		},
		{
			icon: '📱',
			title: 'Instant Notifications',
			description:
				'Real-time updates keep tenants informed and reduce complaints by 40%.'
		},
		{
			icon: '⏰',
			title: 'Time Savings',
			description:
				'Reduce coordination time by 75% with automated scheduling and confirmations.'
		},
		{
			icon: '📊',
			title: 'Smart Analytics',
			description:
				'Track completion rates, tenant satisfaction, and cost optimization insights.'
		}
	]

	return (
		<Html>
			<Head />
			<Preview>
				🚀 NEW: {featureName} - Now Available in TenantFlow
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
							{/* Beta Badge */}
							{betaAccess && (
								<Section className="mb-6 text-center">
									<div className="inline-block rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
										🌟 EXCLUSIVE BETA ACCESS
									</div>
								</Section>
							)}

							<Heading className="mb-4 text-center text-3xl font-bold text-gray-800">
								🚀 Introducing {featureName}
							</Heading>

							<Text className="mb-6 text-center text-lg text-gray-600">
								Hey {firstName}, we're excited to share our
								latest innovation that will transform how you
								handle property maintenance.
							</Text>

							{/* Feature Image */}
							<Section className="mb-6 text-center">
								<Img
									src={featureImage}
									width="500"
									height="300"
									alt={featureName}
									className="mx-auto rounded-lg border border-gray-200"
								/>
							</Section>

							{/* Feature Description */}
							<Section className="border-brand-500 mb-6 rounded-r-lg border-l-4 bg-blue-50 p-6">
								<Text className="mb-3 text-lg font-medium text-blue-800">
									What's New?
								</Text>
								<Text className="mb-0 text-blue-700">
									{featureDescription}
								</Text>
							</Section>

							{/* Key Benefits */}
							<Section className="mb-6">
								<Heading className="mb-4 text-xl font-semibold text-gray-800">
									🎯 Key Benefits
								</Heading>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									{benefits.map((benefit, index) => (
										<div
											key={index}
											className="rounded-lg border border-gray-200 bg-gray-50 p-4"
										>
											<div className="flex items-start gap-3">
												<div className="text-2xl">
													{benefit.icon}
												</div>
												<div>
													<Text className="mb-1 font-semibold text-gray-800">
														{benefit.title}
													</Text>
													<Text className="mb-0 text-sm text-gray-600">
														{benefit.description}
													</Text>
												</div>
											</div>
										</div>
									))}
								</div>
							</Section>

							{/* Call to Action */}
							<Section className="mb-6 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-6 text-center">
								<Heading className="mb-3 text-xl font-semibold text-gray-800">
									{betaAccess
										? "🎉 You're Invited to Beta!"
										: `🚀 Available ${releaseDate}`}
								</Heading>
								<Text className="mb-4 text-gray-600">
									{betaAccess
										? 'As a valued TenantFlow user, you get exclusive early access to test this feature before the public release.'
										: 'Ready to revolutionize your maintenance workflow? Get started with Smart Maintenance Scheduling now.'}
								</Text>

								<Button
									href={
										betaAccess
											? 'https://tenantflow.app/beta/maintenance-scheduling?source=announcement_email'
											: 'https://tenantflow.app/features/maintenance-scheduling?source=announcement_email'
									}
									className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-700"
								>
									{betaAccess
										? 'Join Beta Program'
										: 'Try It Now'}
								</Button>
							</Section>

							{/* How It Works */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									🔄 How It Works
								</Heading>

								<div className="space-y-4">
									<div className="flex items-start gap-4">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
											1
										</div>
										<div>
											<Text className="font-medium text-gray-800">
												Create Maintenance Request
											</Text>
											<Text className="text-sm text-gray-600">
												Log maintenance needs through
												your dashboard or tenant portal
											</Text>
										</div>
									</div>

									<div className="flex items-start gap-4">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
											2
										</div>
										<div>
											<Text className="font-medium text-gray-800">
												AI Optimizes Scheduling
											</Text>
											<Text className="text-sm text-gray-600">
												Our AI analyzes tenant
												preferences, urgency, and
												availability
											</Text>
										</div>
									</div>

									<div className="flex items-start gap-4">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
											3
										</div>
										<div>
											<Text className="font-medium text-gray-800">
												Automatic Coordination
											</Text>
											<Text className="text-sm text-gray-600">
												Tenants and service providers
												receive notifications and
												confirmations
											</Text>
										</div>
									</div>

									<div className="flex items-start gap-4">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
											4
										</div>
										<div>
											<Text className="font-medium text-gray-800">
												Track & Optimize
											</Text>
											<Text className="text-sm text-gray-600">
												Monitor completion and gather
												feedback for continuous
												improvement
											</Text>
										</div>
									</div>
								</div>
							</Section>

							{/* Early Feedback */}
							{betaAccess && (
								<Section className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-6">
									<Heading className="mb-3 text-lg font-semibold text-purple-800">
										🗣️ Help Shape the Future
									</Heading>
									<Text className="mb-4 text-purple-700">
										Your feedback during the beta period is
										invaluable. We'll use your insights to
										refine the feature before the public
										launch.
									</Text>
									<Text className="mb-0 text-sm text-purple-700">
										💎 Beta participants get 3 months free
										access to premium features as a thank
										you!
									</Text>
								</Section>
							)}

							{/* Help & Support */}
							<Section className="rounded-lg bg-gray-50 p-4">
								<Text className="mb-2 text-gray-600">
									<strong>Need Help Getting Started?</strong>
								</Text>
								<Text className="mb-2 text-gray-600">
									📚{' '}
									<Link
										href="https://tenantflow.app/help/maintenance-scheduling"
										className="text-blue-600 underline"
									>
										View Documentation
									</Link>
								</Text>
								<Text className="mb-0 text-gray-600">
									💬{' '}
									<Link
										href="https://tenantflow.app/support"
										className="text-blue-600 underline"
									>
										Contact Support
									</Link>
								</Text>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								Keep innovating with property management,
								<br />
								The TenantFlow Product Team
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								You're receiving this because you're a
								TenantFlow user.{' '}
								<Link
									href="https://tenantflow.app/email-preferences"
									className="text-gray-400 underline"
								>
									Update preferences
								</Link>{' '}
								|{' '}
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
