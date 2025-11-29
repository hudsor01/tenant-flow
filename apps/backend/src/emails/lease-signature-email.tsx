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

// ============================================================
// LEASE SENT FOR SIGNATURE EMAIL (Tenant receives)
// ============================================================

interface LeaseSentForSignatureEmailProps {
	tenantName: string
	propertyName?: string
	unitNumber?: string
	ownerName?: string
	message?: string
	signUrl: string
}

export const LeaseSentForSignatureEmail = ({
	tenantName,
	propertyName,
	unitNumber,
	ownerName,
	message,
	signUrl
}: LeaseSentForSignatureEmailProps) => {
	const locationDisplay = propertyName
		? unitNumber
			? `${propertyName} - Unit ${unitNumber}`
			: propertyName
		: 'your rental property'

	return (
		<Html>
			<Head />
			<Preview>Your lease agreement is ready for signature</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={signatureBadge}>Lease Signature Required</div>
					</Section>

					<Section style={content}>
						<Heading style={h2}>Hello {tenantName},</Heading>

						<Text style={text}>
							{ownerName ? `${ownerName} has` : 'Your landlord has'} prepared a
							lease agreement for <strong>{locationDisplay}</strong> and is
							requesting your signature.
						</Text>

						{message && (
							<Section style={messageBox}>
								<Text style={messageTitle}>
									<strong>Message from your landlord:</strong>
								</Text>
								<Text style={messageText}>{message}</Text>
							</Section>
						)}

						<Section style={actionBox}>
							<Text style={actionText}>
								Please review the lease carefully before signing. Once both
								parties have signed, your lease will become active.
							</Text>
						</Section>

						<Section style={buttonContainer}>
							<Button style={button} href={signUrl}>
								Review & Sign Lease
							</Button>
						</Section>

						<Text style={helpText}>
							If you have any questions about the lease terms, please contact
							your landlord directly before signing.
						</Text>
					</Section>

					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							<Link href="mailto:support@tenantflow.app" style={link}>
								support@tenantflow.app
							</Link>{' '}
							|{' '}
							<Link
								href={`${process.env.FRONTEND_URL || 'https://tenantflow.app'}`}
								style={link}
							>
								TenantFlow
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

// ============================================================
// LEASE SIGNED BY OWNER EMAIL (Tenant receives)
// ============================================================

interface LeaseOwnerSignedEmailProps {
	tenantName: string
	ownerName?: string
	propertyName?: string
	signedAt: string
	signUrl: string
	tenantHasSigned: boolean
}

export const LeaseOwnerSignedEmail = ({
	tenantName,
	ownerName,
	propertyName,
	signedAt,
	signUrl,
	tenantHasSigned
}: LeaseOwnerSignedEmailProps) => {
	const signedDate = new Date(signedAt).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	})

	return (
		<Html>
			<Head />
			<Preview>
				{tenantHasSigned
					? 'Your lease is now active!'
					: 'Your landlord has signed the lease'}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={tenantHasSigned ? activeBadge : signatureBadge}>
							{tenantHasSigned ? 'Lease Activated' : 'Owner Signed'}
						</div>
					</Section>

					<Section style={content}>
						<Heading style={h2}>Hello {tenantName},</Heading>

						{tenantHasSigned ? (
							<>
								<Text style={text}>
									Great news! {ownerName || 'Your landlord'} has signed the
									lease for <strong>{propertyName || 'your property'}</strong>.
									Since you've already signed, your lease is now{' '}
									<strong>officially active</strong>!
								</Text>
								<Section style={successBox}>
									<Text style={successText}>
										Your rental payments will begin according to the lease
										terms. You can view your lease details and payment schedule
										in your tenant portal.
									</Text>
								</Section>
							</>
						) : (
							<>
								<Text style={text}>
									{ownerName || 'Your landlord'} has signed the lease for{' '}
									<strong>{propertyName || 'your property'}</strong> on{' '}
									{signedDate}.
								</Text>
								<Section style={actionBox}>
									<Text style={actionText}>
										The lease is now waiting for your signature. Once you sign,
										your lease will become active.
									</Text>
								</Section>
								<Section style={buttonContainer}>
									<Button style={button} href={signUrl}>
										Sign Your Lease
									</Button>
								</Section>
							</>
						)}
					</Section>

					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							<Link href="mailto:support@tenantflow.app" style={link}>
								support@tenantflow.app
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

// ============================================================
// LEASE SIGNED BY TENANT EMAIL (Owner receives)
// ============================================================

interface LeaseTenantSignedEmailProps {
	ownerName: string
	tenantName: string
	propertyName?: string
	signedAt: string
	dashboardUrl: string
	ownerHasSigned: boolean
}

export const LeaseTenantSignedEmail = ({
	ownerName,
	tenantName,
	propertyName,
	signedAt,
	dashboardUrl,
	ownerHasSigned
}: LeaseTenantSignedEmailProps) => {
	const signedDate = new Date(signedAt).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	})

	return (
		<Html>
			<Head />
			<Preview>
				{ownerHasSigned
					? 'Lease activated - tenant has signed!'
					: 'Your tenant has signed the lease'}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={ownerHasSigned ? activeBadge : signatureBadge}>
							{ownerHasSigned ? 'Lease Activated' : 'Tenant Signed'}
						</div>
					</Section>

					<Section style={content}>
						<Heading style={h2}>Hello {ownerName},</Heading>

						{ownerHasSigned ? (
							<>
								<Text style={text}>
									Great news! <strong>{tenantName}</strong> has signed the lease
									for <strong>{propertyName || 'your property'}</strong>. Since
									you've already signed, the lease is now{' '}
									<strong>officially active</strong>!
								</Text>
								<Section style={successBox}>
									<Text style={successText}>
										A Stripe subscription has been created automatically.
										Rental payments will be collected according to the lease
										terms.
									</Text>
								</Section>
							</>
						) : (
							<>
								<Text style={text}>
									<strong>{tenantName}</strong> has signed the lease for{' '}
									<strong>{propertyName || 'your property'}</strong> on{' '}
									{signedDate}.
								</Text>
								<Section style={actionBox}>
									<Text style={actionText}>
										The lease is waiting for your signature to become active.
									</Text>
								</Section>
								<Section style={buttonContainer}>
									<Button style={button} href={dashboardUrl}>
										Sign Lease in Dashboard
									</Button>
								</Section>
							</>
						)}
					</Section>

					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							<Link href="mailto:support@tenantflow.app" style={link}>
								support@tenantflow.app
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

// ============================================================
// LEASE ACTIVATED EMAIL (Both parties receive)
// ============================================================

interface LeaseActivatedEmailProps {
	recipientName: string
	isOwner: boolean
	propertyName?: string
	rentAmount: number
	rentCurrency: string
	startDate: string
	portalUrl: string
}

export const LeaseActivatedEmail = ({
	recipientName,
	isOwner,
	propertyName,
	rentAmount,
	rentCurrency,
	startDate,
	portalUrl
}: LeaseActivatedEmailProps) => {
	const formattedRent = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: rentCurrency
	}).format(rentAmount)

	const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})

	return (
		<Html>
			<Head />
			<Preview>
				Your lease for {propertyName || 'your property'} is now active
			</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={h1}>TenantFlow</Heading>
						<div style={activeBadge}>Lease Activated</div>
					</Section>

					<Section style={content}>
						<Heading style={h2}>Congratulations, {recipientName}!</Heading>

						<Text style={text}>
							Your lease for <strong>{propertyName || 'your property'}</strong>{' '}
							is now officially active. Both parties have signed the agreement.
						</Text>

						<Section style={detailsBox}>
							<Text style={detailsTitle}>
								<strong>Lease Details:</strong>
							</Text>
							<Text style={detailsText}>
								Property: {propertyName || 'Your rental property'}
								<br />
								Monthly Rent: {formattedRent}
								<br />
								Start Date: {formattedStartDate}
							</Text>
						</Section>

						{isOwner ? (
							<Text style={text}>
								Rental payments will be automatically collected via Stripe
								according to the lease terms. You can track all payments in your
								dashboard.
							</Text>
						) : (
							<Text style={text}>
								Your rental payments will begin according to the lease schedule.
								You can set up autopay and view your payment history in your
								tenant portal.
							</Text>
						)}

						<Section style={buttonContainer}>
							<Button style={button} href={portalUrl}>
								{isOwner ? 'View Dashboard' : 'Open Tenant Portal'}
							</Button>
						</Section>
					</Section>

					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							Thank you for using TenantFlow!
							<br />
							<Link href="mailto:support@tenantflow.app" style={link}>
								support@tenantflow.app
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

// ============================================================
// SHARED STYLES
// ============================================================

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

const signatureBadge = {
	backgroundColor: '#ffc107',
	color: '#212529',
	padding: '8px 12px',
	borderRadius: '4px',
	display: 'inline-block',
	fontWeight: 'bold',
	fontSize: '14px'
}

const activeBadge = {
	backgroundColor: '#28a745',
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

const messageBox = {
	backgroundColor: '#e8f4fd',
	padding: '15px',
	borderRadius: '4px',
	margin: '20px 0',
	borderLeft: '4px solid #007bff'
}

const messageTitle = {
	margin: '0 0 10px 0',
	fontSize: '14px'
}

const messageText = {
	margin: '0',
	fontSize: '14px',
	fontStyle: 'italic'
}

const actionBox = {
	backgroundColor: '#fff3cd',
	padding: '15px',
	borderRadius: '4px',
	margin: '20px 0',
	borderLeft: '4px solid #ffc107'
}

const actionText = {
	margin: '0',
	fontSize: '14px',
	color: '#856404'
}

const successBox = {
	backgroundColor: '#d4edda',
	padding: '15px',
	borderRadius: '4px',
	margin: '20px 0',
	borderLeft: '4px solid #28a745'
}

const successText = {
	margin: '0',
	fontSize: '14px',
	color: '#155724'
}

const detailsBox = {
	backgroundColor: '#f8f9fa',
	padding: '15px',
	borderRadius: '4px',
	margin: '20px 0',
	border: '1px solid #e9ecef'
}

const detailsTitle = {
	margin: '0 0 10px 0',
	fontSize: '14px'
}

const detailsText = {
	margin: '0',
	fontSize: '14px',
	lineHeight: '1.8'
}

const buttonContainer = {
	textAlign: 'center' as const,
	margin: '30px 0'
}

const button = {
	backgroundColor: '#007bff',
	color: '#ffffff',
	padding: '14px 28px',
	textDecoration: 'none',
	borderRadius: '6px',
	display: 'inline-block',
	fontWeight: 'bold',
	fontSize: '16px'
}

const helpText = {
	margin: '16px 0',
	fontSize: '14px',
	color: '#6c757d',
	textAlign: 'center' as const
}

const hr = {
	borderColor: '#e9ecef',
	margin: '30px 0'
}

const footer = {
	fontSize: '14px',
	color: '#6c757d',
	textAlign: 'center' as const
}

const footerText = {
	margin: '8px 0'
}

const link = {
	color: '#007bff'
}
