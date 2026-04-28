export interface Testimonial {
	quote: string
	author: string
	title: string
	company: string
	avatar: string
}

// Placeholder testimonials kept until v2.7+ collects real owner feedback.
// Phase 67 stripped the unsubstantiated metric claims (NOI 47%, 25 hours
// per week, 60-day ROI). Replace each quote with a verified one when
// real owners go on record.
export const testimonials: Testimonial[] = [
	{
		quote:
			'TenantFlow gave us one source of truth for every lease, document, and maintenance request. The vault search alone has paid for itself.',
		author: 'Sarah Chen',
		title: 'Portfolio Manager',
		company: 'West Coast Properties',
		avatar: '/tenant-flow-logo.png'
	},
	{
		quote:
			"E-signing through DocuSeal cut our renewal turnaround from days to minutes. The whole document chain stays attached to the unit.",
		author: 'Marcus Rodriguez',
		title: 'Director of Operations',
		company: 'Urban Real Estate Group',
		avatar: '/tenant-flow-logo.png'
	},
	{
		quote:
			'Tenants never log in. That alone removes the support overhead we used to spend on password resets and account questions.',
		author: 'Jennifer Walsh',
		title: 'Chief Technology Officer',
		company: 'Metropolitan Holdings',
		avatar: '/tenant-flow-logo.png'
	}
]

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
