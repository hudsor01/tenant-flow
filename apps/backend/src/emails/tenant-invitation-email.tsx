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
	inviteBadge,
	content,
	text,
	benefitsBox,
	benefitsTitle,
	benefitsList,
	buttonContainer,
	button,
	expiryText,
	securityNotice,
	securityText,
	hr,
	footer,
	footerText,
	link
} from './email-styles'

interface TenantInvitationEmailProps {
	tenantEmail: string
	invitationUrl: string
	propertyName?: string
	unitNumber?: string
	ownerName?: string
	expiresAt: string
}

export const TenantInvitationEmail = ({
	tenantEmail: _tenantEmail,
	invitationUrl,
	propertyName,
	unitNumber,
	ownerName,
	expiresAt
}: TenantInvitationEmailProps) => {
	const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})

	const locationDisplay = propertyName
		? unitNumber
			? `${propertyName} - Unit ${unitNumber}`
			: propertyName
		: 'your new rental'

	return (
		<Html>
			<Head />
			<Preview>
				You've been invited to join TenantFlow - Accept your invitation
			</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Header */}
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={inviteBadge}>Tenant Invitation</div>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Heading style={h2}>Welcome to TenantFlow!</Heading>

						<Text style={text}>
							{ownerName ? `${ownerName} has` : 'Your property manager has'}{' '}
							invited you to join TenantFlow as a tenant for{' '}
							<strong>{locationDisplay}</strong>.
						</Text>

						<Section style={benefitsBox}>
							<Text style={benefitsTitle}>
								<strong>With TenantFlow, you can:</strong>
							</Text>
							<Text style={benefitsList}>
								- Pay rent online securely
								<br />
								- View your lease details
								<br />
								- Submit maintenance requests
								<br />
								- Track your payment history
								<br />- Access important documents
							</Text>
						</Section>

						<Text style={text}>
							Click the button below to create your account and get started.
						</Text>

						<Section style={buttonContainer}>
							<Button style={button} href={invitationUrl}>
								Accept Invitation
							</Button>
						</Section>

						<Text style={expiryText}>
							This invitation expires on <strong>{expiryDate}</strong>.
						</Text>
					</Section>

					{/* Security Notice */}
					<Section style={securityNotice}>
						<Text style={securityText}>
							If you didn't expect this invitation, you can safely ignore this
							email. Only click the link if you're expecting to rent at{' '}
							{locationDisplay}.
						</Text>
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							If you have any questions, please contact your property manager
							directly or reach out to us at{' '}
							<Link href="mailto:support@tenantflow.app" style={link}>
								support@tenantflow.app
							</Link>
						</Text>
						<Text style={footerText}>
							<Link
								href={`${process.env.FRONTEND_URL || 'https://tenantflow.app'}`}
								style={link}
							>
								TenantFlow
							</Link>{' '}
							- Modern Property Management
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

export default TenantInvitationEmail
