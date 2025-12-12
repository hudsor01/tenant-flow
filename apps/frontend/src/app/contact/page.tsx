import { ContactForm } from '#components/contact/contact-form'
import { PageLayout } from '#components/layout/page-layout'

export default function ContactPage() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3050')

	// Breadcrumb Schema
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: baseUrl
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Contact'
			}
		]
	}

	return (
		<PageLayout>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			<ContactForm />
		</PageLayout>
	)
}
