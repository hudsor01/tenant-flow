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
					'Track properties and units, keep tenant and lease records, log maintenance requests and vendor costs, e-sign leases via DocuSeal (Growth and Max plans), and store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. Everything a property owner needs to replace the spreadsheet.'
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
					'TenantFlow runs on Supabase with TLS in transit and encryption at rest. Postgres row-level security isolates every landlord\u2019s data per request. Tenants never log in, so there are no extra access surfaces to manage. You can export your data or request account deletion at any time (a 30-day grace period applies before anonymization).'
			},
			{
				question: 'Are lease templates compliant for my state?',
				answer:
					'Lease templates available on the platform are guidance, not legal advice. State and municipal rules around fair housing, lead-paint disclosures, and security deposits change frequently \u2014 we recommend a final review by a local attorney before signing any lease.'
			}
		]
	},
	{
		category: 'Pricing & ROI',
		questions: [
			{
				question: 'What kind of results do owners report?',
				answer:
					'Owners typically tell us they replace a tangle of spreadsheets, email threads, and Dropbox folders with a single source of truth. Concrete wins: faster lease renewals via DocuSeal, faster CPA hand-offs via the document vault\u2019s bulk-zip download, and fewer "where did I put that receipt?" moments at tax time. Specific revenue impact varies by portfolio.'
			},
			{
				question: 'Are there any hidden fees?',
				answer:
					'No. Pricing on this page is what you pay. DocuSeal e-sign limits scale with the plan you choose (3 / 25 / unlimited per month). Storage scales the same way (10GB / 50GB / unlimited).'
			},
			{
				question: 'Can I try TenantFlow risk-free?',
				answer:
					"Yes \u2014 start the 14-day trial with no credit card required. Bring your own properties, leases, and documents. Cancel any time."
			}
		]
	}
]
