import * as React from 'react'
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Text,
	Tailwind
} from '@react-email/components'

interface EmailConfirmationProps {
	confirmationUrl: string
	email?: string
	name?: string
}

export default function EmailConfirmation({
	confirmationUrl,
	email = '',
	name = ''
}: EmailConfirmationProps) {
	const previewText = 'Confirm your TenantFlow account'

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Tailwind>
				<Body className="bg-gray-50 font-sans">
					<Container className="mx-auto max-w-xl px-4 py-8">
						{/* Header */}
						<Section className="rounded-t-lg border-b border-gray-100 bg-white px-8 py-6">
							<div className="flex items-center">
								<div className="mr-3 h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700"></div>
								<Text className="m-0 text-lg font-semibold text-gray-900">
									TenantFlow
								</Text>
							</div>
						</Section>

						{/* Main Content */}
						<Section className="bg-white px-8 py-8">
							<Heading className="mb-2 text-2xl font-semibold text-gray-900">
								Confirm your account
							</Heading>
							<Text className="text-base leading-relaxed text-gray-600">
								{name
									? `Hi ${name},`
									: 'Welcome to TenantFlow!'}{' '}
								Please confirm your email address to get started
								with your property management journey.
							</Text>

							{/* CTA Button */}
							<Section className="my-8 text-center">
								<Button
									href={confirmationUrl}
									className="inline-block rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white no-underline"
								>
									Confirm Email Address
								</Button>
							</Section>

							{/* Alternative Link */}
							<Section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
								<Text className="mb-2 text-center text-sm text-gray-600">
									If the button doesn't work, copy and paste
									this link:
								</Text>
								<Text className="rounded border border-gray-300 bg-white p-2 text-center font-mono text-xs break-all text-emerald-600">
									{confirmationUrl}
								</Text>
							</Section>

							{/* Security Notice */}
							<Section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
								<div className="flex items-start">
									<Text className="mt-0 mr-3 text-amber-600">
										⚠️
									</Text>
									<div>
										<Text className="mt-0 mb-1 text-sm font-semibold text-amber-900">
											Security Notice
										</Text>
										<Text className="m-0 text-sm leading-relaxed text-amber-700">
											This confirmation link will expire
											for your security. If you didn't
											create this account, you can safely
											ignore this email.
										</Text>
									</div>
								</div>
							</Section>

							{/* What's Next Section */}
							<Section className="mt-8">
								<Heading className="mb-3 text-lg font-semibold text-gray-900">
									What happens next?
								</Heading>
								<div className="space-y-3">
									<div className="flex items-start">
										<Text className="mt-0 mr-3 text-emerald-500">
											✓
										</Text>
										<Text className="m-0 text-sm text-gray-600">
											Start your 14-day free trial with
											full access
										</Text>
									</div>
									<div className="flex items-start">
										<Text className="mt-0 mr-3 text-emerald-500">
											✓
										</Text>
										<Text className="m-0 text-sm text-gray-600">
											Add your first property and tenants
										</Text>
									</div>
									<div className="flex items-start">
										<Text className="mt-0 mr-3 text-emerald-500">
											✓
										</Text>
										<Text className="m-0 text-sm text-gray-600">
											Explore automated rent collection
											and maintenance tracking
										</Text>
									</div>
								</div>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg border-t border-gray-100 bg-gray-50 px-8 py-6 text-center">
							<Text className="mb-1 text-sm text-gray-600">
								© 2025 TenantFlow. All rights reserved.
							</Text>
							<Text className="m-0 text-xs text-gray-500">
								Need help? Contact support at{' '}
								<Link
									href="mailto:support@tenantflow.app"
									className="text-blue-500 no-underline"
								>
									support@tenantflow.app
								</Link>
								{email && ` (for ${email})`}
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

// Email preview for development
EmailConfirmation.PreviewProps = {
	confirmationUrl: 'https://tenantflow.app/auth/confirm?token=123456789',
	email: 'john.doe@tenantflow.app',
	name: 'John'
} as EmailConfirmationProps
