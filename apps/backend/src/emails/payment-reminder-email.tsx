/**
 * Payment Reminder Email Template
 *
 * Sent to tenants to remind them of upcoming rent due dates.
 * Supports both 7-day and 3-day reminders with different urgency levels.
 */

import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text
} from '@react-email/components'
import {
	main,
	container,
	header,
	h1,
	h2,
	badge,
	content,
	text,
	paymentDetails,
	detailsTitle,
	details,
	buttonContainer,
	button,
	hr,
	footer,
	footerText,
	urgentNotice,
	urgentText
} from './email-styles'

interface PaymentReminderEmailProps {
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber?: string
	amount: number
	currency: string
	dueDate: string
	daysUntilDue: number
	paymentUrl: string
	autopayEnabled: boolean
}

export const PaymentReminderEmail = ({
	tenantName,
	tenantEmail: _tenantEmail,
	propertyName,
	unitNumber,
	amount,
	currency,
	dueDate,
	daysUntilDue,
	paymentUrl,
	autopayEnabled
}: PaymentReminderEmailProps) => {
	const formattedAmount = (amount / 100).toFixed(2)
	const isUrgent = daysUntilDue <= 3
	const badgeColor = isUrgent ? '#dc3545' : '#ffc107'
	const badgeText = isUrgent ? 'Payment Due Soon' : 'Payment Reminder'
	const locationDisplay = unitNumber
		? `${propertyName} - Unit ${unitNumber}`
		: propertyName

	// Format due date for display
	const dueDateObj = new Date(dueDate)
	const formattedDueDate = dueDateObj.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})

	return (
		<Html>
			<Head />
			<Preview>
				{isUrgent
					? `Reminder: Your rent payment of ${currency.toUpperCase()} ${formattedAmount} is due in ${daysUntilDue} days`
					: `Upcoming rent payment reminder for ${locationDisplay}`}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div
							style={{
								...badge,
								backgroundColor: badgeColor,
								color: isUrgent ? '#ffffff' : '#333333'
							}}
						>
							{badgeText}
						</div>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h2}>
							{isUrgent ? 'Your Rent is Due Soon' : 'Upcoming Rent Payment'}
						</Heading>

						<Text style={text}>Hi {tenantName},</Text>

						<Text style={text}>
							This is a friendly reminder that your rent payment for{' '}
							<strong>{locationDisplay}</strong> is due{' '}
							{daysUntilDue === 0
								? 'today'
								: daysUntilDue === 1
									? 'tomorrow'
									: `in ${daysUntilDue} days`}
							.
						</Text>

						<Section style={paymentDetails}>
							<Text style={detailsTitle}>
								<strong>Payment Details:</strong>
							</Text>
							<Text style={details}>
								Property: <strong>{locationDisplay}</strong>
								<br />
								Amount Due:{' '}
								<strong>
									{currency.toUpperCase()} ${formattedAmount}
								</strong>
								<br />
								Due Date: <strong>{formattedDueDate}</strong>
							</Text>
						</Section>

						{autopayEnabled ? (
							<Text style={text}>
								<strong>Good news!</strong> You have autopay enabled, so your
								payment will be processed automatically on the due date. No
								action is required from you.
							</Text>
						) : (
							<>
								{isUrgent && (
									<Section style={urgentNotice}>
										<Text style={urgentText}>
											<strong>Action Required:</strong> Please make your payment
											before the due date to avoid any late fees.
										</Text>
									</Section>
								)}

								<Section style={buttonContainer}>
									<Button style={button} href={paymentUrl}>
										Pay Rent Now
									</Button>
								</Section>

								<Text
									style={{
										...text,
										textAlign: 'center',
										fontSize: '14px',
										color: '#6c757d'
									}}
								>
									Want to never miss a payment?{' '}
									<a href={paymentUrl} style={{ color: '#007bff' }}>
										Set up autopay
									</a>{' '}
									for automatic payments.
								</Text>
							</>
						)}
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							If you have any questions or need assistance, please contact your
							property manager.
						</Text>
						<Text style={footerText}>Thank you for using TenantFlow.</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

export default PaymentReminderEmail
