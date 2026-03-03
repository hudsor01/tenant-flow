/**
 * Static FAQ Data
 * Comprehensive frequently asked questions organized by category
 */

export interface FAQQuestion {
	question: string
	answer: string
}

export interface FAQCategory {
	category: string
	questions: FAQQuestion[]
}

export const faqData: FAQCategory[] = [
	{
		category: 'Getting Started',
		questions: [
			{
				question: 'How do I get started with TenantFlow?',
				answer:
					"Sign up for our 14-day free trial - no credit card required. You'll get instant access to the platform, and our onboarding team will guide you through importing your properties, setting up your workflows, and customizing the dashboard to match your needs. Most property managers are fully operational within 24 hours."
			},
			{
				question: 'Can I import my existing property data?',
				answer:
					'Yes! Our migration specialists handle all data imports at no extra cost. We support imports from all major property management software, spreadsheets, and paper records. The process typically takes 2-4 hours, and we validate everything to ensure accuracy before going live.'
			},
			{
				question: 'How much money will I save with TenantFlow?',
				answer:
					'The average property manager saves $2,400+ per property per year with TenantFlow. This comes from reduced vacancy time (65% faster), lower maintenance costs (32% reduction), streamlined operations, and eliminated manual tasks. Most clients see full ROI within 2.3 months.'
			}
		]
	},
	{
		category: 'Features & Benefits',
		questions: [
			{
				question: 'How does TenantFlow automate 80% of daily tasks?',
				answer:
					'Our smart workflows handle maintenance tracking, lease renewals, maintenance requests, tenant communications, and financial reporting automatically. AI-powered tenant screening, automated notifications, and smart vendor dispatch save you 20+ hours per week.'
			},
			{
				question: 'What specific results can I expect?',
				answer:
					'Based on 10,000+ properties managed: 40% average NOI increase, 65% faster vacancy filling, 32% maintenance cost reduction, 80% task automation, and 90% reduction in bad tenants through advanced screening. All results are tracked and guaranteed.'
			},
			{
				question: 'Is TenantFlow suitable for my portfolio size?',
				answer:
					'Yes! TenantFlow scales from 1 property to unlimited portfolios. Starter plan handles 1-5 properties, Growth plan manages up to 100 units, and TenantFlow Max supports unlimited properties with white-label options and dedicated account management.'
			}
		]
	},
	{
		category: 'Implementation & Support',
		questions: [
			{
				question: 'How long does setup take?',
				answer:
					'Most property managers are fully operational within 24-48 hours. Our onboarding specialists handle data migration, system configuration, and team training. You can start seeing results immediately with our automated workflows going live on day one.'
			},
			{
				question: 'What kind of support do you provide?',
				answer:
					'All plans include priority email support with 4-hour response times. Growth and Max plans get phone support and dedicated account managers. Our team includes property management experts who understand your challenges and provide strategic guidance.'
			},
			{
				question: 'Do you integrate with my existing systems?',
				answer:
					'TenantFlow integrates with all major accounting software, payment processors, and maintenance platforms. Our API connects with 500+ business tools. Custom integrations are available for TenantFlow Max customers with dedicated development support.'
			}
		]
	},
	{
		category: 'Security & Compliance',
		questions: [
			{
				question: 'How secure is my data?',
				answer:
					'TenantFlow uses bank-level security with 256-bit SSL encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up across multiple secure data centers with 99.9% uptime SLA and enterprise-grade protection.'
			},
			{
				question: 'Do you comply with rental regulations?',
				answer:
					'Yes, TenantFlow automatically handles compliance for all 50 states including fair housing laws, rent control regulations, eviction procedures, and tenant rights. Our legal team updates the system continuously as regulations change.'
			}
		]
	},
	{
		category: 'Pricing & ROI',
		questions: [
			{
				question: "What if TenantFlow doesn't deliver the promised results?",
				answer:
					"We guarantee 40% NOI increase within 90 days or your money back. If you don't see measurable improvements in operational efficiency, cost reduction, and revenue optimization, we'll refund your subscription completely."
			},
			{
				question: 'Are there any hidden fees?',
				answer:
					'No hidden fees ever. Our transparent pricing includes all features, unlimited support, regular updates, and data migration. The only additional cost is if you choose premium add-ons like custom integrations or dedicated training sessions.'
			},
			{
				question: 'Can I try TenantFlow risk-free?',
				answer:
					"Yes! Start with our 14-day transformation trial - no credit card required. Experience the full platform, see real results, and if you're not completely satisfied, there's no obligation to continue."
			}
		]
	}
]
