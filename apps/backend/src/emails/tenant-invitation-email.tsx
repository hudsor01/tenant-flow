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
							{ownerName ? `${ownerName} has` : 'Your property manager has'} invited
							you to join TenantFlow as a tenant for{' '}
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

// Styles
const main = {
	fontFamily: 'Arial, sans-serif',
	lineHeight: '1.6',
	color: '#333',
	backgroundColor: '#f8f9fa'
}

const container = {
	maxWidth: '600px',
	margin: '0 auto',
	padding: '20px'
}

const header = {
	backgroundColor: '#f8f9fa',
	padding: '20px',
	borderRadius: '8px',
	marginBottom: '20px'
}

const h1 = {
	color: '#2c3e50',
	margin: '0 0 10px 0',
	fontSize: '24px'
}

const h2 = {
	color: '#2c3e50',
	marginBottom: '20px',
	fontSize: '20px'
}

const inviteBadge = {
	backgroundColor: '#007bff',
	color: '#ffffff',
	padding: '8px 12px',
	borderRadius: '4px',
	display: 'inline-block',
	fontWeight: 'bold',
	fontSize: '14px'
}

const content = {
	backgroundColor: '#fff',
	border: '1px solid #e9ecef',
	borderRadius: '8px',
	padding: '20px',
	marginBottom: '20px'
}

const text = {
	margin: '16px 0',
	fontSize: '16px'
}

const benefitsBox = {
	backgroundColor: '#e8f4fd',
	padding: '15px',
	borderRadius: '4px',
	margin: '20px 0',
	borderLeft: '4px solid #007bff'
}

const benefitsTitle = {
	margin: '0 0 10px 0',
	fontSize: '16px'
}

const benefitsList = {
	margin: '0',
	fontSize: '14px',
	lineHeight: '1.8'
}

const buttonContainer = {
	textAlign: 'center' as const,
	margin: '30px 0'
}

const button = {
	backgroundColor: '#28a745',
	color: '#ffffff',
	padding: '14px 28px',
	textDecoration: 'none',
	borderRadius: '6px',
	display: 'inline-block',
	fontWeight: 'bold',
	fontSize: '16px'
}

const expiryText = {
	margin: '16px 0',
	fontSize: '14px',
	color: '#6c757d',
	textAlign: 'center' as const
}

const securityNotice = {
	backgroundColor: '#fff3cd',
	padding: '15px',
	borderRadius: '4px',
	marginBottom: '20px',
	borderLeft: '4px solid #ffc107'
}

const securityText = {
	margin: '0',
	fontSize: '14px',
	color: '#856404'
}

const hr = {
	borderColor: '#e9ecef',
	margin: '30px 0'
}

const footer = {
	fontSize: '14px',
	color: '#6c757d'
}

const footerText = {
	margin: '8px 0'
}

const link = {
	color: '#007bff'
}
