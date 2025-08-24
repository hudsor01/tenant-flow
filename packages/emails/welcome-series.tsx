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

interface WelcomeEmailProps {
	firstName?: string
	companySize?: 'small' | 'medium' | 'large'
	source?: string
}

export default function WelcomeEmail({
	firstName = 'Property Manager',
	companySize = 'medium',
	source = 'website'
}: WelcomeEmailProps) {
	const getPersonalizedContent = () => {
		switch (companySize) {
			case 'small':
				return {
					tip: 'Start with digitizing your lease agreements to save 5+ hours per tenant onboarding.',
					feature: 'Automated lease generation',
					savings: 'Save 10+ hours per week'
				}
			case 'medium':
				return {
					tip: 'Automate your rent collection to reduce late payments by up to 40%.',
					feature: 'Smart rent collection system',
					savings: 'Save 15+ hours per week'
				}
			case 'large':
				return {
					tip: 'Implement bulk tenant communication to streamline your property management workflow.',
					feature: 'Enterprise tenant management dashboard',
					savings: 'Save 20+ hours per week'
				}
			default:
				return {
					tip: 'Automate your rent collection to reduce late payments by up to 40%.',
					feature: 'Smart rent collection system',
					savings: 'Save 15+ hours per week'
				}
		}
	}

	const content = getPersonalizedContent()

	return (
		<Html>
			<Head />
			<Preview>
				Welcome to TenantFlow - Your Property Management Journey Starts
				Here
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
								Welcome to TenantFlow, {firstName}! 🏠
							</Heading>

							<Text className="mb-6 text-lg text-gray-600">
								Thank you for joining thousands of property
								managers who trust TenantFlow to streamline
								their operations.
							</Text>

							{/* Personalized Tip */}
							<Section className="border-brand-500 mb-6 rounded-r-lg border-l-4 bg-blue-50 p-6">
								<Heading className="mb-2 text-lg font-semibold text-blue-800">
									💡 Quick Win for You
								</Heading>
								<Text className="mb-0 text-blue-700">
									{content.tip}
								</Text>
							</Section>

							{/* Feature Highlight */}
							<Section className="mb-6">
								<Heading className="mb-3 text-xl font-semibold text-gray-800">
									What's Next?
								</Heading>
								<Text className="mb-4 text-gray-600">
									Get started with our {content.feature} and
									begin experiencing the TenantFlow
									difference:
								</Text>

								<Section className="mb-4 rounded-lg bg-green-50 p-4">
									<Text className="mb-2 font-semibold text-green-800">
										⭐ {content.savings} with automation
									</Text>
									<Text className="mb-0 text-green-700">
										Join property managers who've
										transformed their workflow
									</Text>
								</Section>
							</Section>

							{/* CTA Button */}
							<Section className="mb-6 text-center">
								<Button
									href="https://tenantflow.app/dashboard?source=welcome_email"
									className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
								>
									Access Your Dashboard
								</Button>
							</Section>

							{/* What to Expect */}
							<Section className="border-t border-gray-200 pt-6">
								<Heading className="mb-3 text-lg font-semibold text-gray-800">
									What to Expect Next
								</Heading>
								<Text className="mb-2 text-gray-600">
									📧 <strong>Day 3:</strong> Advanced property
									management strategies
								</Text>
								<Text className="mb-2 text-gray-600">
									🎯 <strong>Day 7:</strong> Personalized demo
									invitation
								</Text>
								<Text className="mb-4 text-gray-600">
									💼 <strong>Ongoing:</strong> Weekly tips and
									industry insights
								</Text>
							</Section>

							{/* Support */}
							<Section className="rounded-lg bg-gray-50 p-4">
								<Text className="mb-2 text-gray-600">
									<strong>Need help getting started?</strong>
								</Text>
								<Text className="mb-0 text-gray-600">
									Reply to this email or visit our{' '}
									<Link
										href="https://tenantflow.app/help"
										className="text-blue-600 underline"
									>
										Help Center
									</Link>{' '}
									for instant support.
								</Text>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								Best regards,
								<br />
								The TenantFlow Team
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								You're receiving this because you signed up for
								TenantFlow from {source}.{' '}
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
