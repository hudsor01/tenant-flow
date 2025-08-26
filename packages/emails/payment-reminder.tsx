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

interface PaymentReminderEmailProps {
	tenantName?: string
	propertyAddress?: string
	rentAmount?: number
	dueDate?: string
	daysOverdue?: number
	lateFee?: number
	landlordName?: string
	landlordPhone?: string
	paymentUrl?: string
	reminderType?: 'upcoming' | 'due' | 'overdue'
}

export default function PaymentReminderEmail({
	tenantName = 'Tenant',
	propertyAddress = '123 Main Street, Unit 1',
	rentAmount = 1200,
	dueDate = 'March 1, 2024',
	daysOverdue = 0,
	lateFee = 0,
	landlordName = 'Property Manager',
	landlordPhone = '(555) 123-4567',
	paymentUrl = 'https://tenantflow.app/tenant/pay-rent',
	reminderType = 'upcoming'
}: PaymentReminderEmailProps) {
	const getReminderData = () => {
		switch (reminderType) {
			case 'upcoming':
				return {
					emoji: '🔔',
					title: 'Rent Payment Reminder',
					urgency: 'Friendly Reminder',
					color: 'blue',
					message:
						'Your rent payment is due soon. Pay early and stay ahead!',
					buttonText: 'Pay Rent Now',
					priority: 'normal'
				}
			case 'due':
				return {
					emoji: '📅',
					title: 'Rent Payment Due Today',
					urgency: 'Payment Due',
					color: 'orange',
					message:
						'Your rent payment is due today. Please submit payment to avoid late fees.',
					buttonText: 'Pay Now to Avoid Late Fees',
					priority: 'high'
				}
			case 'overdue':
				return {
					emoji: '⚠️',
					title: 'Overdue Rent Payment',
					urgency: 'Urgent: Payment Overdue',
					color: 'red',
					message:
						'Your rent payment is past due. Please submit payment immediately.',
					buttonText: 'Pay Immediately',
					priority: 'urgent'
				}
			default:
				return {
					emoji: '🏠',
					title: 'Rent Payment Notice',
					urgency: 'Payment Notice',
					color: 'blue',
					message: 'This is a notice regarding your rent payment.',
					buttonText: 'Pay Rent',
					priority: 'normal'
				}
		}
	}

	const reminderData = getReminderData()
	const totalAmount = rentAmount + lateFee

	const getUrgencyBadgeClasses = (color: string) => {
		switch (color) {
			case 'red':
				return 'bg-red-100 text-red-800'
			case 'orange':
				return 'bg-orange-100 text-orange-800'
			case 'blue':
				return 'bg-blue-100 text-blue-800'
			default:
				return ''
		}
	}

	const getPaymentButtonClasses = (color: string) => {
		switch (color) {
			case 'red':
				return 'bg-red-600 hover:bg-red-700'
			case 'orange':
				return 'bg-orange-600 hover:bg-orange-700'
			case 'blue':
				return 'bg-blue-600 hover:bg-blue-700'
			default:
				return ''
		}
	}

	return (
		<Html>
			<Head />
			<Preview>
				{reminderData.title} - ${String(rentAmount)} due {dueDate}
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
							{/* Urgency Badge */}
							<Section className="mb-6 text-center">
								<div
									className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${getUrgencyBadgeClasses(reminderData.color)}`}
								>
									{reminderData.urgency}
								</div>
							</Section>

							<div className="mb-6 text-center">
								<div className="mb-3 text-4xl">
									{reminderData.emoji}
								</div>
								<Heading className="mb-2 text-2xl font-bold text-gray-800">
									{reminderData.title}
								</Heading>
							</div>

							<Text className="mb-6 text-lg text-gray-600">
								Hi {tenantName}, {reminderData.message}
							</Text>

							{/* Payment Details */}
							<Section
								className={`bg-${reminderData.color}-50 border-l-4 border-${reminderData.color}-500 mb-6 rounded-r-lg p-6`}
							>
								<Heading
									className={`text-lg font-semibold text-${reminderData.color}-800 mb-4`}
								>
									💰 Payment Details
								</Heading>

								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Text
											className={`text-${reminderData.color}-700 font-medium`}
										>
											Property:
										</Text>
										<Text
											className={`text-${reminderData.color}-800 font-semibold`}
										>
											{propertyAddress}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${reminderData.color}-700 font-medium`}
										>
											Rent Amount:
										</Text>
										<Text
											className={`text-${reminderData.color}-800 font-semibold`}
										>
											${String(rentAmount.toFixed(2))}
										</Text>
									</div>

									{lateFee > 0 && (
										<div className="flex items-center justify-between">
											<Text className="font-medium text-red-700">
												Late Fee:
											</Text>
											<Text className="font-semibold text-red-800">
												${String(lateFee.toFixed(2))}
											</Text>
										</div>
									)}

									<Hr
										className={`border-${reminderData.color}-200 my-3`}
									/>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${reminderData.color}-800 text-lg font-bold`}
										>
											Total Due:
										</Text>
										<Text
											className={`text-${reminderData.color}-800 text-xl font-bold`}
										>
											${String(totalAmount.toFixed(2))}
										</Text>
									</div>

									<div className="flex items-center justify-between">
										<Text
											className={`text-${reminderData.color}-700 font-medium`}
										>
											Due Date:
										</Text>
										<Text
											className={`text-${reminderData.color}-800 font-semibold`}
										>
											{dueDate}
										</Text>
									</div>

									{daysOverdue > 0 && (
										<div className="flex items-center justify-between">
											<Text className="font-medium text-red-700">
												Days Overdue:
											</Text>
											<Text className="font-bold text-red-800">
												{String(daysOverdue)} days
											</Text>
										</div>
									)}
								</div>
							</Section>

							{/* Payment Button */}
							<Section className="mb-6 text-center">
								<Button
									href={paymentUrl}
									className={`rounded-lg px-8 py-4 text-lg font-semibold text-white transition-colors ${getPaymentButtonClasses(reminderData.color)}`}
								>
									{reminderData.buttonText}
								</Button>
							</Section>

							{/* Payment Methods */}
							<Section className="mb-6">
								<Heading className="mb-4 text-lg font-semibold text-gray-800">
									💳 Payment Options
								</Heading>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
										<div className="mb-2 text-2xl">🏦</div>
										<Text className="mb-1 font-semibold text-green-800">
											Bank Transfer
										</Text>
										<Text className="text-sm text-green-700">
											Direct from your bank account
										</Text>
									</div>

									<div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
										<div className="mb-2 text-2xl">💳</div>
										<Text className="mb-1 font-semibold text-purple-800">
											Credit/Debit Card
										</Text>
										<Text className="text-sm text-purple-700">
											Instant payment processing
										</Text>
									</div>

									<div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-center">
										<div className="mb-2 text-2xl">📱</div>
										<Text className="mb-1 font-semibold text-indigo-800">
											Digital Wallet
										</Text>
										<Text className="text-sm text-indigo-700">
											PayPal, Apple Pay, Google Pay
										</Text>
									</div>
								</div>
							</Section>

							{/* Important Information */}
							{reminderType === 'overdue' && (
								<Section className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6">
									<Heading className="mb-3 text-lg font-semibold text-red-800">
										⚠️ Important Notice
									</Heading>
									<Text className="mb-2 text-red-700">
										Your payment is now {daysOverdue} days
										overdue. Continued non-payment may
										result in:
									</Text>
									<ul className="ml-6 space-y-1 text-sm text-red-700">
										<li>• Additional late fees</li>
										<li>
											• Negative impact on your credit
											score
										</li>
										<li>
											• Legal action for eviction
											proceedings
										</li>
										<li>• Collection agency involvement</li>
									</ul>
								</Section>
							)}

							{/* Autopay Promotion */}
							{reminderType !== 'overdue' && (
								<Section className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6">
									<Heading className="mb-3 text-lg font-semibold text-green-800">
										🎯 Never Miss a Payment
									</Heading>
									<Text className="mb-3 text-green-700">
										Set up automatic rent payments and enjoy
										peace of mind:
									</Text>
									<ul className="mb-4 ml-6 space-y-1 text-sm text-green-700">
										<li>• Never worry about due dates</li>
										<li>• Avoid late fees completely</li>
										<li>
											• Get early payment discounts (when
											available)
										</li>
										<li>• Cancel or modify anytime</li>
									</ul>
									<Button
										href="https://tenantflow.app/tenant/autopay-setup"
										className="rounded bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
									>
										Set Up Autopay
									</Button>
								</Section>
							)}

							{/* Payment History */}
							<Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
								<Text className="mb-2 font-semibold text-gray-800">
									📊 Quick Access
								</Text>
								<div className="flex flex-wrap gap-4">
									<Link
										href="https://tenantflow.app/tenant/payment-history"
										className="text-sm text-blue-600 underline"
									>
										View Payment History
									</Link>
									<Link
										href="https://tenantflow.app/tenant/receipts"
										className="text-sm text-blue-600 underline"
									>
										Download Receipts
									</Link>
									<Link
										href="https://tenantflow.app/tenant/lease"
										className="text-sm text-blue-600 underline"
									>
										View Lease Agreement
									</Link>
								</div>
							</Section>

							{/* Contact Information */}
							<Section className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
								<Heading className="mb-3 text-lg font-semibold text-yellow-800">
									📞 Questions or Payment Issues?
								</Heading>
								<Text className="mb-3 text-yellow-700">
									If you're experiencing financial hardship or
									have questions about your payment:
								</Text>
								<Text className="mb-1 text-yellow-700">
									<strong>Contact:</strong> {landlordName}
								</Text>
								<Text className="mb-3 text-yellow-700">
									<strong>Phone:</strong> {landlordPhone}
								</Text>
								<Text className="text-sm text-yellow-700">
									We're here to work with you on payment
									arrangements when needed.
								</Text>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								Secure payments powered by TenantFlow
								<br />
								Questions? Contact {landlordName}
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								This payment reminder was sent automatically by
								TenantFlow.{' '}
								<Link
									href="https://tenantflow.app/tenant/notifications"
									className="text-gray-400 underline"
								>
									Manage notification preferences
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
