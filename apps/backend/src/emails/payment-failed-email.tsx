import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
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
	urgentNotice,
	urgentText,
	buttonContainer,
	button,
	linkContainer,
	link,
	hr,
	footer,
	footerText
} from './email-styles'

interface PaymentFailedEmailProps {
	customerEmail: string
	amount: number
	currency: string
	attemptCount: number
	invoiceUrl: string | null
	isLastAttempt: boolean
}

export const PaymentFailedEmail = ({
	customerEmail: _customerEmail,
	amount,
	currency,
	attemptCount,
	invoiceUrl,
	isLastAttempt
}: PaymentFailedEmailProps) => {
	const formattedAmount = (amount / 100).toFixed(2)
	const urgencyColor = isLastAttempt ? '#dc3545' : '#fd7e14'

	return (
		<Html>
			<Head />
			<Preview>
				{isLastAttempt
					? 'URGENT: Final payment attempt failed - Action required'
					: 'Payment failed - Please update your payment method'}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div
							style={{
								...badge,
								backgroundColor: urgencyColor
							}}
						>
							{isLastAttempt
								? 'URGENT: Final Payment Attempt Failed'
								: 'Payment Failed'}
						</div>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h2}>Payment Processing Failed</Heading>

						<Text style={text}>
							We were unable to process your payment for your TenantFlow
							subscription.
						</Text>

						<Section style={paymentDetails}>
							<Text style={detailsTitle}>
								<strong>Payment Details:</strong>
							</Text>
							<Text style={details}>
								Amount:{' '}
								<strong>
									{currency.toUpperCase()} {formattedAmount}
								</strong>
								<br />
								Attempt: {attemptCount} of 3<br />
							</Text>
						</Section>

						{isLastAttempt ? (
							<Section style={urgentNotice}>
								<Text style={urgentText}>
									<strong>Important Notice:</strong>
								</Text>
								<Text style={urgentText}>
									This was your final payment attempt. Your subscription will be
									canceled if payment is not received within 24 hours. Please
									update your payment method immediately to avoid service
									interruption.
								</Text>
							</Section>
						) : (
							<Text style={text}>
								We will automatically retry the payment in 24 hours. Please
								ensure your payment method is up to date to avoid service
								interruption.
							</Text>
						)}

						<Section style={buttonContainer}>
							<Button
								style={button}
								href={`${process.env.NEXT_PUBLIC_APP_URL}/billing`}
							>
								Update Payment Method
							</Button>
						</Section>

						{invoiceUrl && (
							<Section style={linkContainer}>
								<Link href={invoiceUrl} style={link}>
									View Invoice Details →
								</Link>
							</Section>
						)}
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							If you believe this is an error or need assistance, please contact
							support at support@tenantflow.app
						</Text>
						<Text style={footerText}>Thank you for using TenantFlow.</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

export default PaymentFailedEmail
