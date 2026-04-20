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
				question: 'Do my tenants create accounts or log in?',
				answer:
					"No. TenantFlow is built for the property owner — tenants are records you keep for your own tracking, not platform users. You never have to manage tenant logins, password resets, or account support."
			},
			{
				question: 'What does TenantFlow actually help me do?',
				answer:
					'Track properties and units, keep tenant and lease records, log maintenance requests and vendor costs, e-sign leases via DocuSeal, and run financial reports on rent you record as received. Everything a property owner needs to replace the spreadsheet.'
			},
			{
				question: 'What specific results can I expect?',
				answer:
					'Property owners report spending less time on admin: centralized records replace spreadsheets and email threads, maintenance requests are tracked with vendor and cost history, and lease e-signing cuts days off renewals. Results vary by portfolio.'
			},
			{
				question: 'Is TenantFlow suitable for my portfolio size?',
				answer:
					'Yes. Starter handles up to 5 properties / 25 units, Growth manages up to 20 properties / 100 units, and MAX supports unlimited properties with white-label options and a dedicated account manager.'
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
					'TenantFlow exposes a REST API (Growth/MAX plans) and can export financial reports as CSV for accounting imports. DocuSeal is built in for e-signatures. Custom integrations are available for MAX customers with dedicated development support.'
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
