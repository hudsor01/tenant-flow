import * as React from 'react'
import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text,
	Tailwind
} from '@react-email/components'

interface BaseEmailTemplateProps {
	children: React.ReactNode
	previewText: string
	footerMessage?: string
	footerSignature?: string
	unsubscribeText?: string
	unsubscribeHref?: string
}

/**
 * Base Email Template - ULTRA-NATIVE CONSOLIDATION
 * Eliminates 200+ lines of duplicate structure across all email templates
 * Provides consistent header, container, and footer patterns
 */
export default function BaseEmailTemplate({
	children,
	previewText,
	footerMessage = 'Thank you for using TenantFlow',
	footerSignature = 'The TenantFlow Team',
	unsubscribeText = "Don't want to receive these emails?",
	unsubscribeHref = 'https://tenantflow.app/unsubscribe'
}: BaseEmailTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
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
							{children}
						</Section>

						{/* Footer */}
						<Section className="rounded-b-lg bg-gray-100 px-8 py-6 text-center">
							<Text className="mb-2 text-sm text-gray-500">
								{footerMessage}
								<br />
								{footerSignature}
							</Text>
							<Hr className="my-4 border-gray-300" />
							<Text className="text-xs text-gray-400">
								{unsubscribeText}{' '}
								<Link
									href={unsubscribeHref}
									className="text-blue-500 hover:underline"
								>
									Unsubscribe
								</Link>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}