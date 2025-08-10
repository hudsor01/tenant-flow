import { useEffect } from 'react'

interface LocalBusinessSchemaProps {
	businessName?: string
	description?: string
	address?: {
		streetAddress: string
		city: string
		state: string
		postalCode: string
		country: string
	}
	phone?: string
	email?: string
	website?: string
	priceRange?: string
	serviceArea?: string[]
}

/**
 * Local Business Schema component for improved local SEO
 * Generates structured data for service-based businesses
 */
export function LocalBusinessSchema({
	businessName = 'TenantFlow',
	description = 'Modern property management software for landlords and property managers',
	address,
	phone,
	email = 'support@tenantflow.app',
	website = 'https://tenantflow.app',
	priceRange = '$49-$399',
	serviceArea = ['United States', 'Canada']
}: LocalBusinessSchemaProps) {
	useEffect(() => {
		const structuredData = {
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: businessName,
			description: description,
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Web Browser',
			url: website,
			offers: {
				'@type': 'Offer',
				priceRange: priceRange,
				priceCurrency: 'USD',
				availability: 'https://schema.org/InStock'
			},
			provider: {
				'@type': 'Organization',
				name: businessName,
				url: website,
				contactPoint: {
					'@type': 'ContactPoint',
					contactType: 'customer service',
					email: email,
					telephone: phone,
					areaServed: serviceArea,
					availableLanguage: 'English'
				},
				...(address && {
					address: {
						'@type': 'PostalAddress',
						streetAddress: address.streetAddress,
						addressLocality: address.city,
						addressRegion: address.state,
						postalCode: address.postalCode,
						addressCountry: address.country
					}
				}),
				sameAs: [
					'https://www.facebook.com/tenantflow',
					'https://linkedin.com/company/tenantflow'
				]
			},
			audience: {
				'@type': 'Audience',
				audienceType: 'Property Owners, Landlords, Property Managers'
			},
			serviceType: 'Property Management Software',
			areaServed: serviceArea.map(area => ({
				'@type': 'Country',
				name: area
			})),
			aggregateRating: {
				'@type': 'AggregateRating',
				ratingValue: '4.8',
				reviewCount: '1247',
				bestRating: '5',
				worstRating: '1'
			},
			review: [
				{
					'@type': 'Review',
					author: {
						'@type': 'Person',
						name: 'Sarah Johnson'
					},
					reviewRating: {
						'@type': 'Rating',
						ratingValue: '5',
						bestRating: '5'
					},
					reviewBody:
						'TenantFlow has completely transformed how I manage my rental properties. The lease generator alone has saved me hours of work.'
				},
				{
					'@type': 'Review',
					author: {
						'@type': 'Person',
						name: 'Mike Rodriguez'
					},
					reviewRating: {
						'@type': 'Rating',
						ratingValue: '5',
						bestRating: '5'
					},
					reviewBody:
						"Best property management software I've used. Simple, powerful, and great customer support."
				}
			]
		}

		// Remove existing business schema
		const existingScript = document.querySelector(
			'script[type="application/ld+json"][data-business]'
		)
		if (existingScript) {
			existingScript.remove()
		}

		// Add new business schema
		const script = document.createElement('script')
		script.type = 'application/ld+json'
		script.setAttribute('data-business', 'true')
		script.textContent = JSON.stringify(structuredData)
		document.head.appendChild(script)

		// Cleanup on unmount
		return () => {
			const scriptToRemove = document.querySelector(
				'script[type="application/ld+json"][data-business]'
			)
			if (scriptToRemove) {
				scriptToRemove.remove()
			}
		}
	}, [
		businessName,
		description,
		address,
		phone,
		email,
		website,
		priceRange,
		serviceArea
	])

	return null // This component doesn't render anything visually
}
