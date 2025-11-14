'use client'

import { ContactForm } from '#app/contact/contact-form'
import Footer from '#components/layout/footer'
import Navbar from '#components/layout/navbar'
import { GridPattern } from '#components/ui/grid-pattern'

export default function ContactPage() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'

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
		<div className="relative min-h-screen flex flex-col">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<Navbar />

			<main className="flex-1">
				<ContactForm />
			</main>

			<Footer />
		</div>
	)
}
