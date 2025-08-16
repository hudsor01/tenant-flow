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

interface ReEngagementEmailProps {
	firstName?: string
	lastLoginDate?: string
	daysSinceLogin?: number
	unfinishedTasks?: string[]
	specialOffer?: {
		title: string
		description: string
		discount: string
		expires: string
	}
}

export default function ReEngagementEmail({
	firstName = 'Property Manager',
	lastLoginDate = '2 weeks ago',
	daysSinceLogin = 14,
	unfinishedTasks = [
		'Add first property',
		'Invite tenants',
		'Set up rent collection'
	],
	specialOffer = {
		title: 'Welcome Back Bonus',
		description: 'Complete your setup and get 2 extra months free',
		discount: '60 days free',
		expires: 'April 15, 2024'
	}
}: ReEngagementEmailProps) {
	const getUrgencyLevel = () => {
		if (daysSinceLogin <= 7) return 'gentle'
		if (daysSinceLogin <= 21) return 'moderate'
		return 'strong'
	}

	const urgency = getUrgencyLevel()

	const getHeadline = () => {
		switch (urgency) {
			case 'gentle':
				return `We miss you, ${firstName}! 🏠`
			case 'moderate':
				return `Your properties are waiting, ${firstName} 📋`
			case 'strong':
				return `Last chance to save your account, ${firstName} ⚠️`
			default:
				return `Come back to TenantFlow, ${firstName}!`
		}
	}

	const getMotivation = () => {
		switch (urgency) {
			case 'gentle':
				return "You started something great with TenantFlow. Let's help you finish setting up your property management system."
			case 'moderate':
				return "Your rental properties deserve better management. You're just a few steps away from transforming your workflow."
			case 'strong':
				return "Don't lose the progress you've made. Your account and data will be archived soon if we don't hear from you."
			default:
				return 'Ready to get back to efficient property management?'
		}
	}

	const quickWins = [
		{
			icon: '⚡',
			title: '5-Minute Setup',
			description: 'Add your first property in under 5 minutes',
			action: 'Add Property',
			url: 'https://tenantflow.app/properties/new?source=reengagement'
		},
		{
			icon: '📧',
			title: 'Instant Invites',
			description: 'Send secure tenant invitations with one click',
			action: 'Invite Tenants',
			url: 'https://tenantflow.app/tenants/invite?source=reengagement'
		},
		{
			icon: '💰',
			title: 'Auto Collection',
			description: 'Set up automatic rent reminders and payments',
			action: 'Setup Payments',
			url: 'https://tenantflow.app/payments/setup?source=reengagement'
		}
	]

	const testimonials = [
		{
			quote: "I wish I had started using TenantFlow sooner. It's saved me hours every week.",
			author: 'Sarah M.',
			properties: '8 properties'
		},
		{
			quote: 'The setup was so simple, I had everything running in one afternoon.',
			author: 'Mike R.',
			properties: '3 properties'
		}
	]

	return (
		<Html>
			<Head />
			<Preview>
				{getHeadline()} - Your TenantFlow Setup is Waiting
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
							<Heading className="mb-4 text-center text-2xl font-bold text-gray-800">
								{getHeadline()}
							</Heading>

							<Text className="mb-6 text-center text-lg text-gray-600">
								{getMotivation()}
							</Text>

							{/* Account Status */}
							<Section
								className={`${urgency === 'strong' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'} mb-6 rounded-lg border p-6`}
							>
								<div className="mb-3 flex items-center gap-3">
									<div
										className={`h-3 w-3 rounded-full ${urgency === 'strong' ? 'bg-red-500' : 'bg-blue-500'}`}
									></div>
									<Text
										className={`font-semibold ${urgency === 'strong' ? 'text-red-800' : 'text-blue-800'}`}
									>
										Account Status
									</Text>
								</div>
								<Text
									className={`${urgency === 'strong' ? 'text-red-700' : 'text-blue-700'} mb-2`}
								>
									Last login: {lastLoginDate}
								</Text>
								{urgency === 'strong' && (
									<Text className="mb-0 text-sm text-red-700">
										⚠️ Account will be archived in 7 days
										without activity
									</Text>
								)}
							</Section>

							{/* Special Offer */}
							{urgency !== 'gentle' && (
								<Section className="mb-6 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
									<Heading className="mb-2 text-xl font-semibold text-green-800">
										🎁 {specialOffer.title}
									</Heading>
									<Text className="mb-3 text-green-700">
										{specialOffer.description}
									</Text>
									<div className="mb-4 inline-block rounded-lg bg-white p-3">
										<Text className="mb-1 text-2xl font-bold text-green-800">
											{specialOffer.discount}
										</Text>
										<Text className="text-sm text-green-600">
											Expires {specialOffer.expires}
										</Text>
									</div>
									<br />
									<Button
										href="https://tenantflow.app/dashboard?source=reengagement_offer"
										className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-700"
									>
										Claim Your Bonus
									</Button>
								</Section>
							)}

							{/* Unfinished Tasks */}
							{unfinishedTasks.length > 0 && (
								<Section className="mb-6">
									<Heading className="mb-4 text-lg font-semibold text-gray-800">
										📋 Pick Up Where You Left Off
									</Heading>
									<div className="space-y-3">
										{unfinishedTasks.map((task, index) => (
											<div
												key={index}
												className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
											>
												<div className="h-6 w-6 rounded border-2 border-gray-400"></div>
												<Text className="text-gray-700">
													{task}
												</Text>
											</div>
										))}
									</div>
								</Section>
							)}

							{/* Quick Wins */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									🚀 Quick Wins to Get Started
								</Heading>

								<div className="space-y-4">
									{quickWins.map((win, index) => (
										<div
											key={index}
											className="rounded-lg border border-gray-200 bg-gray-50 p-4"
										>
											<div className="flex items-start justify-between">
												<div className="flex items-start gap-3">
													<div className="text-2xl">
														{win.icon}
													</div>
													<div className="flex-1">
														<Text className="mb-1 font-semibold text-gray-800">
															{win.title}
														</Text>
														<Text className="mb-3 text-sm text-gray-600">
															{win.description}
														</Text>
													</div>
												</div>
												<Button
													href={win.url}
													className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
												>
													{win.action}
												</Button>
											</div>
										</div>
									))}
								</div>
							</Section>

							{/* Social Proof */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									💬 What Others Are Saying
								</Heading>

								<div className="space-y-4">
									{testimonials.map((testimonial, index) => (
										<div
											key={index}
											className="border-brand-500 rounded-lg border-l-4 bg-blue-50 p-4"
										>
											<Text className="mb-2 text-gray-700 italic">
												"{testimonial.quote}"
											</Text>
											<Text className="text-sm text-gray-600">
												— {testimonial.author},{' '}
												{testimonial.properties}
											</Text>
										</div>
									))}
								</div>
							</Section>

							{/* Main CTA */}
							<Section className="mb-6 text-center">
								<Text className="mb-4 text-gray-600">
									Ready to transform your property management?
								</Text>
								<Button
									href="https://tenantflow.app/dashboard?source=reengagement_main"
									className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
								>
									Continue My Setup
								</Button>
							</Section>

							{/* Alternative Actions */}
							<Section className="rounded-lg bg-gray-50 p-6">
								<Text className="mb-4 text-center text-gray-600">
									<strong>
										Need help or have questions?
									</strong>
								</Text>
								<div className="flex flex-wrap justify-center gap-4">
									<Link
										href="https://tenantflow.app/help?source=reengagement"
										className="text-sm text-blue-600 underline"
									>
										📚 Browse Help Center
									</Link>
									<Link
										href="https://tenantflow.app/contact?source=reengagement"
										className="text-sm text-blue-600 underline"
									>
										💬 Contact Support
									</Link>
									<Link
										href="https://tenantflow.app/book-demo?source=reengagement"
										className="text-sm text-blue-600 underline"
									>
										🎥 Schedule Demo
									</Link>
								</div>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								We're here to help you succeed,
								<br />
								The TenantFlow Team
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								Don't want to receive these emails?{' '}
								<Link
									href="https://tenantflow.app/unsubscribe"
									className="text-gray-400 underline"
								>
									Unsubscribe here
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
