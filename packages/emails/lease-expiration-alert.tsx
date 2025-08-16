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

interface LeaseExpirationAlertEmailProps {
	landlordName?: string
	tenantName?: string
	propertyAddress?: string
	unitNumber?: string
	leaseEndDate?: string
	daysUntilExpiration?: number
	currentRent?: number
	alertType?: 'early' | 'moderate' | 'urgent'
}

export default function LeaseExpirationAlertEmail({
	landlordName = 'Property Manager',
	tenantName = 'John Doe',
	propertyAddress = '123 Main Street',
	unitNumber = 'Unit 1',
	leaseEndDate = 'April 30, 2024',
	daysUntilExpiration = 30,
	currentRent = 1200,
	alertType = 'moderate'
}: LeaseExpirationAlertEmailProps) {
	const getAlertData = () => {
		switch (alertType) {
			case 'early':
				return {
					emoji: '📅',
					title: 'Lease Renewal Planning',
					urgency: 'Early Notice',
					color: 'blue',
					message:
						'Start planning for lease renewal to secure continued tenancy.',
					timeframe: '90 days notice',
					priority: 'Plan Ahead'
				}
			case 'moderate':
				return {
					emoji: '⏰',
					title: 'Lease Expiring Soon',
					urgency: 'Action Needed',
					color: 'orange',
					message:
						'Time to initiate lease renewal discussions with your tenant.',
					timeframe: '30-60 days notice',
					priority: 'Take Action'
				}
			case 'urgent':
				return {
					emoji: '🚨',
					title: 'Lease Expires Very Soon',
					urgency: 'Urgent Action Required',
					color: 'red',
					message:
						'Immediate action needed - lease expires in less than 30 days.',
					timeframe: 'Less than 30 days',
					priority: 'Immediate'
				}
			default:
				return {
					emoji: '📋',
					title: 'Lease Status Update',
					urgency: 'Notification',
					color: 'blue',
					message: 'Lease status update for your property.',
					timeframe: '',
					priority: 'Review'
				}
		}
	}

	const alertData = getAlertData()

	const renewalActions = [
		{
			icon: '📞',
			title: 'Contact Tenant',
			description: 'Reach out to discuss renewal intentions and terms',
			action: 'Send Message',
			url: `https://tenantflow.app/tenants/contact?tenant=${encodeURIComponent(tenantName)}`
		},
		{
			icon: '📄',
			title: 'Prepare New Lease',
			description: 'Draft renewal agreement with updated terms',
			action: 'Create Lease',
			url: 'https://tenantflow.app/leases/new?type=renewal'
		},
		{
			icon: '💰',
			title: 'Review Rent Rates',
			description: 'Research market rates and adjust pricing if needed',
			action: 'Market Analysis',
			url: 'https://tenantflow.app/analytics/market-rates'
		}
	]

	const checklist = [
		'Review current lease terms and tenant history',
		'Research current market rental rates in your area',
		'Contact tenant to discuss renewal intentions',
		'Negotiate new lease terms if needed',
		'Prepare and send renewal agreement',
		'Schedule property inspection if required',
		'Update insurance and documentation',
		'Plan for potential vacancy if renewal is declined'
	]

	return (
		<Html>
			<Head />
			<Preview>
				Lease Alert: {tenantName} - {propertyAddress} expires in{' '}
				{String(daysUntilExpiration)} days
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
							{/* Alert Badge */}
							<Section className="mb-6 text-center">
								<div
									className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${
										alertData.color === 'red'
											? 'bg-red-100 text-red-800'
											: alertData.color === 'orange'
												? 'bg-orange-100 text-orange-800'
												: 'bg-blue-100 text-blue-800'
									}`}
								>
									{alertData.urgency}
								</div>
							</Section>

							<div className="mb-6 text-center">
								<div className="mb-3 text-4xl">
									{alertData.emoji}
								</div>
								<Heading className="mb-2 text-2xl font-bold text-gray-800">
									{alertData.title}
								</Heading>
							</div>

							<Text className="mb-6 text-lg text-gray-600">
								Hi {landlordName}, {alertData.message}
							</Text>

							{/* Lease Details */}
							<Section
								className={`bg-${alertData.color}-50 border-l-4 border-${alertData.color}-500 mb-6 rounded-r-lg p-6`}
							>
								<Heading
									className={`text-lg font-semibold text-${alertData.color}-800 mb-4`}
								>
									🏠 Lease Information
								</Heading>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-700 font-medium`}
										>
											Tenant:
										</Text>
										<Text
											className={`text-${alertData.color}-800 font-semibold`}
										>
											{tenantName}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-700 font-medium`}
										>
											Property:
										</Text>
										<Text
											className={`text-${alertData.color}-800 font-semibold`}
										>
											{propertyAddress}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-700 font-medium`}
										>
											Unit:
										</Text>
										<Text
											className={`text-${alertData.color}-800 font-semibold`}
										>
											{unitNumber}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-700 font-medium`}
										>
											Current Rent:
										</Text>
										<Text
											className={`text-${alertData.color}-800 font-semibold`}
										>
											${String(currentRent)}/month
										</Text>
									</div>

									<Hr
										className={`border-${alertData.color}-200 my-3`}
									/>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-800 text-lg font-bold`}
										>
											Lease Ends:
										</Text>
										<Text
											className={`text-${alertData.color}-800 text-xl font-bold`}
										>
											{leaseEndDate}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${alertData.color}-700 font-medium`}
										>
											Days Remaining:
										</Text>
										<Text
											className={`text-${alertData.color}-800 text-lg font-bold`}
										>
											{String(daysUntilExpiration)} days
										</Text>
									</div>
								</div>
							</Section>

							{/* Quick Actions */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									🚀 Recommended Actions
								</Heading>

								<div className="space-y-4">
									{renewalActions.map((action, index) => (
										<div
											key={index}
											className="rounded-lg border border-gray-200 bg-gray-50 p-4"
										>
											<div className="flex items-start justify-between">
												<div className="flex items-start gap-3">
													<div className="text-2xl">
														{action.icon}
													</div>
													<div className="flex-1">
														<Text className="mb-1 font-semibold text-gray-800">
															{action.title}
														</Text>
														<Text className="mb-3 text-sm text-gray-600">
															{action.description}
														</Text>
													</div>
												</div>
												<Button
													href={action.url}
													className={`rounded px-4 py-2 text-sm font-medium text-white transition-colors ${
														alertData.color ===
														'red'
															? 'bg-red-600 hover:bg-red-700'
															: alertData.color ===
																  'orange'
																? 'bg-orange-600 hover:bg-orange-700'
																: 'bg-blue-600 hover:bg-blue-700'
													}`}
												>
													{action.action}
												</Button>
											</div>
										</div>
									))}
								</div>
							</Section>

							{/* Renewal Checklist */}
							<Section className="mb-6 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
								<Heading className="mb-4 text-lg font-semibold text-purple-800">
									✅ Lease Renewal Checklist
								</Heading>

								<div className="space-y-2">
									{checklist.map((item, index) => (
										<div
											key={index}
											className="flex items-start gap-3"
										>
											<div className="mt-0.5 h-5 w-5 rounded border-2 border-purple-400"></div>
											<Text className="text-sm text-purple-700">
												{item}
											</Text>
										</div>
									))}
								</div>
							</Section>

							{/* Market Insights */}
							<Section className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
								<Heading className="mb-3 text-lg font-semibold text-green-800">
									📈 Market Insights
								</Heading>
								<Text className="mb-4 text-green-700">
									Before negotiating renewal terms, consider
									these factors:
								</Text>
								<ul className="mb-4 ml-6 space-y-1 text-sm text-green-700">
									<li>• Current market rates in your area</li>
									<li>
										• Tenant payment history and reliability
									</li>
									<li>
										• Property condition and needed
										improvements
									</li>
									<li>• Local rental market demand</li>
									<li>
										• Cost of finding and screening new
										tenants
									</li>
								</ul>
								<Button
									href="https://tenantflow.app/analytics/market-research"
									className="rounded bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
								>
									View Market Analysis
								</Button>
							</Section>

							{/* Timeline Reminder */}
							{alertType === 'urgent' && (
								<Section className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6">
									<Heading className="mb-3 text-lg font-semibold text-red-800">
										⏰ Time-Sensitive Actions
									</Heading>
									<Text className="mb-2 text-red-700">
										With less than 30 days remaining, you
										should:
									</Text>
									<ul className="ml-6 space-y-1 text-sm text-red-700">
										<li>
											• Immediately contact the tenant
											about renewal
										</li>
										<li>
											• Begin marketing the unit if tenant
											won't renew
										</li>
										<li>
											• Review local notice requirements
											for move-out
										</li>
										<li>
											• Prepare for potential vacancy
											period
										</li>
									</ul>
								</Section>
							)}

							{/* TenantFlow Tools */}
							<Section className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
								<Heading className="mb-3 text-lg font-semibold text-blue-800">
									🛠️ TenantFlow Tools to Help
								</Heading>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div>
										<Text className="mb-2 font-medium text-blue-800">
											📧 Automated Reminders
										</Text>
										<Text className="mb-3 text-sm text-blue-700">
											Set up automatic lease expiration
											alerts for all properties
										</Text>
									</div>
									<div>
										<Text className="mb-2 font-medium text-blue-800">
											📋 Lease Templates
										</Text>
										<Text className="mb-3 text-sm text-blue-700">
											Use pre-built renewal agreement
											templates
										</Text>
									</div>
								</div>
								<Button
									href="https://tenantflow.app/leases/management"
									className="rounded bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
								>
									Manage All Leases
								</Button>
							</Section>

							{/* Contact Support */}
							<Section className="rounded-lg bg-gray-50 p-4">
								<Text className="mb-2 text-gray-600">
									<strong>
										Need help with lease renewals?
									</strong>
								</Text>
								<Text className="mb-0 text-sm text-gray-600">
									Our support team can help with renewal
									strategies, legal requirements, and best
									practices.{' '}
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
								Stay ahead of lease expirations with TenantFlow
								<br />
								Automated Property Management
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								This alert was sent automatically by TenantFlow.{' '}
								<Link
									href="https://tenantflow.app/settings/notifications"
									className="text-gray-400 underline"
								>
									Manage alert preferences
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
