export interface Testimonial {
	quote: string
	author: string
	title: string
	company: string
	avatar: string
}

export const testimonials: Testimonial[] = [
	{
		quote:
			'TenantFlow increased our NOI by 47% in just 6 months. The automation alone saves us 25 hours per week.',
		author: 'Sarah Chen',
		title: 'Portfolio Manager',
		company: 'West Coast Properties',
		avatar: '/tenant-flow-logo.png'
	},
	{
		quote:
			"Best property management decision we've made. ROI was clear within 60 days.",
		author: 'Marcus Rodriguez',
		title: 'Director of Operations',
		company: 'Urban Real Estate Group',
		avatar: '/tenant-flow-logo.png'
	},
	{
		quote:
			'The security and compliance features give us complete peace of mind with enterprise-grade protection.',
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
