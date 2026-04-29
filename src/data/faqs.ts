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
					"Sign up for the 14-day free trial \u2014 no credit card required. Bring your properties via CSV import, add tenant records and leases, and upload your existing documents to the vault. There's no long onboarding process; you can start the same day."
			},
			{
				question: 'Can I import my existing property data?',
				answer:
					'Yes. CSV import covers properties, units, tenants, and leases. Existing documents (PDFs, images) upload directly into the document vault under the right entity (property, lease, tenant, maintenance, or inspection). Reach out to support if your portfolio is non-trivial and you want help validating the import.'
			},
			{
				question: 'What does TenantFlow help me do that a spreadsheet doesn\u2019t?',
				answer:
					'A spreadsheet can\u2019t store and search your lease PDFs, run lease e-signature workflows, generate tax-ready financial reports, or maintain row-level data isolation across multiple landlords. TenantFlow ships all of that in one place. Specific time savings vary by portfolio.'
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
					'Most landlords have their portfolio imported and their first leases tracked within a day. CSV imports cover the heavy lifting; the document vault accepts existing PDFs and images directly.'
			},
			{
				question: 'What kind of support do you provide?',
				answer:
					'Email support is included on every plan. Growth and Max plans add phone support. We are not a 24/7 operation \u2014 expect responses during US business hours.'
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
