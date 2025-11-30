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
	successBadge,
	content,
	text,
	paymentDetails,
	detailsTitle,
	details,
	buttonContainer,
	button,
	secondaryButton,
	hr,
	footer,
	footerText,
	link
} from './email-styles'

interface PaymentSuccessEmailProps {
	customerEmail: string
	amount: number
	currency: string
	invoiceUrl: string | null
	invoicePdf: string | null
}

export const PaymentSuccessEmail = ({
	customerEmail: _customerEmail,
	amount,
	currency,
	invoiceUrl,
	invoicePdf
}: PaymentSuccessEmailProps) => {
	const formattedAmount = (amount / 100).toFixed(2)

	return (
		<Html>
			<Head />
			<Preview>
				Payment Receipt - {currency.toUpperCase()} {formattedAmount}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={successBadge}>Payment Successful</div>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h2}>Thank You for Your Payment</Heading>

						<Text style={text}>
							Your payment has been successfully processed.
						</Text>

						<Section style={paymentDetails}>
							<Text style={detailsTitle}>
								<strong>Payment Details:</strong>
							</Text>
							<Text style={details}>
								Amount Paid:{' '}
								<strong>
									{currency.toUpperCase()} {formattedAmount}
								</strong>
								<br />
								Date: {new Date().toLocaleDateString()}
								<br />
							</Text>
						</Section>

						<Text style={text}>
							Your subscription is active and all features are available for
							use.
						</Text>

						{(invoiceUrl || invoicePdf) && (
							<Section style={buttonContainer}>
								{invoiceUrl && (
									<Button style={button} href={invoiceUrl}>
										View Invoice
									</Button>
								)}
								{invoicePdf && (
									<Button style={secondaryButton} href={invoicePdf}>
										Download PDF
									</Button>
								)}
							</Section>
						)}
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							This receipt is for your records. No action is required.
						</Text>
						<Text style={footerText}>
							If you have any questions about your subscription, please visit
							your{' '}
							<Link
								href={`${process.env.NEXT_PUBLIC_APP_URL}/billing`}
								style={link}
							>
								billing dashboard
							</Link>{' '}
							or contact support at support@tenantflow.app
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

export default PaymentSuccessEmail
