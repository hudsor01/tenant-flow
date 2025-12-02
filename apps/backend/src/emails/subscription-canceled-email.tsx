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
	canceledBadge,
	content,
	text,
	cancellationDetails,
	detailsTitle,
	details,
	smallText,
	comeBackNotice,
	comeBackTitle,
	comeBackText,
	buttonContainer,
	button,
	hr,
	footer,
	footerText
} from './email-styles'

interface SubscriptionCanceledEmailProps {
	customerEmail: string
	subscriptionId: string
	cancelAtPeriodEnd: boolean
	currentPeriodEnd: Date | null
}

export const SubscriptionCanceledEmail = ({
	customerEmail: _customerEmail,
	subscriptionId,
	cancelAtPeriodEnd,
	currentPeriodEnd
}: SubscriptionCanceledEmailProps) => {
	const end_dateFormatted = currentPeriodEnd
		? currentPeriodEnd.toLocaleDateString()
		: 'immediately'

	return (
		<Html>
			<Head />
			<Preview>Your TenantFlow Subscription Has Been Canceled</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={canceledBadge}>Subscription Canceled</div>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h2}>Your Subscription Has Been Canceled</Heading>

						<Text style={text}>
							We're sorry to see you go. Your TenantFlow subscription has been
							canceled.
						</Text>

						<Section style={cancellationDetails}>
							<Text style={detailsTitle}>
								<strong>Cancellation Details:</strong>
							</Text>
							<Text style={details}>
								Subscription ID: {subscriptionId}
								<br />
								{cancelAtPeriodEnd ? (
									<>
										Access Until: <strong>{end_dateFormatted}</strong>
										<br />
										<small style={smallText}>
											You will continue to have full access until this date.
										</small>
									</>
								) : (
									<>
										Status: <strong>Immediately Canceled</strong>
										<br />
										<small style={smallText}>
											Your access has been terminated.
										</small>
									</>
								)}
							</Text>
						</Section>

						{cancelAtPeriodEnd && (
							<Text style={text}>
								You can continue using all TenantFlow features until{' '}
								{end_dateFormatted}. After this date, your account will be
								downgraded to the free plan.
							</Text>
						)}

						<Section style={comeBackNotice}>
							<Text style={comeBackTitle}>
								<strong>Want to Come Back?</strong>
							</Text>
							<Text style={comeBackText}>
								You can reactivate your subscription at any time from your
								billing dashboard. All your data has been preserved.
							</Text>
						</Section>

						<Section style={buttonContainer}>
							<Button
								style={button}
								href={`${process.env.NEXT_PUBLIC_APP_URL}/billing`}
							>
								Manage Subscription
							</Button>
						</Section>
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							We'd love to hear your feedback about why you're leaving. Please
							reply to this email or contact us at support@tenantflow.app
						</Text>
						<Text style={footerText}>
							Thank you for being a TenantFlow customer.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

export default SubscriptionCanceledEmail
