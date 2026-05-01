export interface Testimonial {
	quote: string
	author: string
	title: string
	company: string
	avatar: string
}

// Phase 67 (v2.7) deleted the placeholder testimonials that carried
// fabricated names and company affiliations. Add real, attributed
// testimonials here only when verified customers go on record.
export const testimonials: Testimonial[] = []

export function getBreadcrumbSchema(baseUrl: string) {
	return {
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
				name: 'Features',
				item: `${baseUrl}/features`
			}
		]
	}
}
