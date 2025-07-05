import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Hr,
	Link,
	Preview,
	Section,
	Tailwind,
	Text
} from '@react-email/components'

interface TenantInvitationEmailProps {
	tenantName: string
	propertyName: string
	propertyAddress: string
	landlordName: string
	invitationUrl: string
	expiresAt: string
}

export default function TenantInvitationEmail({
	tenantName,
	propertyName,
	propertyAddress,
	landlordName,
	invitationUrl,
	expiresAt
}: TenantInvitationEmailProps) {
	const previewText = `${landlordName} has invited you to access your tenant portal for ${propertyName}`

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Tailwind>
				<Body className="bg-white font-sans">
					<Container className="mx-auto max-w-xl p-5">
						{/* Header */}
						<Section className="rounded-t-lg bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
							<Heading className="m-0 text-3xl font-bold text-white">
								TenantFlow
							</Heading>
							<Text className="mt-2 text-sm text-green-100">
								Property Management Made Simple
							</Text>
						</Section>

						{/* Main Content */}
						<Section className="rounded-b-lg border-x border-b border-gray-200 bg-white p-8">
							<Heading className="mb-4 text-2xl font-semibold text-gray-900">
								Welcome to Your Tenant Portal
							</Heading>

							<Text className="mb-4 text-base text-gray-700">
								Hi {tenantName},
							</Text>

							<Text className="mb-4 text-base text-gray-700">
								{landlordName} has invited you to access your
								tenant portal for{' '}
								<span className="font-semibold text-gray-900">
									{propertyName}
								</span>{' '}
								located at {propertyAddress}.
							</Text>

							<Text className="mb-4 text-base text-gray-700">
								Through your tenant portal, you'll be able to:
							</Text>

							<ul className="mb-6 ml-6 text-base text-gray-700">
								<li className="mb-2">
									✓ View your lease agreement and important
									documents
								</li>
								<li className="mb-2">
									✓ Track payment history and upcoming rent
									payments
								</li>
								<li className="mb-2">
									✓ Submit maintenance requests
								</li>
								<li className="mb-2">
									✓ Receive important notifications from your
									landlord
								</li>
								<li className="mb-2">
									✓ Update your contact information
								</li>
							</ul>

							<Section className="my-8 text-center">
								<Button
									href={invitationUrl}
									className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white"
								>
									Accept Invitation & Access Portal
								</Button>
							</Section>

							<Text className="mb-4 text-sm text-gray-600">
								This invitation will expire on{' '}
								<span className="font-semibold">
									{new Date(expiresAt).toLocaleDateString()}
								</span>
								. If you don't accept by then, please contact{' '}
								{landlordName} for a new invitation.
							</Text>

							<Hr className="my-6 border-gray-200" />

							<Text className="text-sm text-gray-500">
								If you have any questions about this invitation,
								please contact {landlordName} directly.
							</Text>

							<Text className="mt-4 text-sm text-gray-500">
								If the button above doesn't work, you can copy
								and paste this link into your browser:
							</Text>

							<Link
								href={invitationUrl}
								className="text-sm break-all text-green-600 underline"
							>
								{invitationUrl}
							</Link>
						</Section>

						{/* Footer */}
						<Section className="mt-8 text-center">
							<Text className="text-xs text-gray-400">
								This email was sent by TenantFlow on behalf of{' '}
								{landlordName}.
							</Text>
							<Text className="mt-2 text-xs text-gray-400">
								© 2025 TenantFlow. All rights reserved.
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
