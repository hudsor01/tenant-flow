/**
 * Static FAQ Data
 * Comprehensive frequently asked questions organized by category
 */

export interface FAQQuestion {
	question: string;
	answer: string;
}

export interface FAQCategory {
	category: string;
	questions: FAQQuestion[];
}

export const faqData: FAQCategory[] = [
	{
		category: "Getting Started",
		questions: [
			{
				question: "How do I get started with TenantFlow?",
				answer:
					"Sign up for the 14-day free trial — no credit card required. Bring your properties via CSV import, add tenant records and leases, and upload your existing documents to the vault. There's no long onboarding process; you can start the same day.",
			},
			{
				question: "Can I import my existing property data?",
				answer:
					"Yes. CSV import covers properties, units, tenants, and leases. Existing documents (PDFs, images) upload directly into the document vault under the right entity (property, lease, tenant, maintenance, or inspection). Reach out to support if your portfolio is non-trivial and you want help validating the import.",
			},
			{
				question: "What does TenantFlow help me do that a spreadsheet doesn't?",
				answer:
					"A spreadsheet can't store and search your lease PDFs, send leases for e-signature (Growth and Max), export financial statements and year-end reports, or maintain row-level data isolation across multiple landlords. TenantFlow ships all of that in one place. Specific time savings vary by portfolio.",
			},
		],
	},
	{
		category: "Features & Benefits",
		questions: [
			{
				question: "Do my tenants create accounts or log in?",
				answer:
					"No. TenantFlow is built for the landlord — tenants are records you keep for your own tracking, not platform users. You never have to manage tenant logins, password resets, or account support.",
			},
			{
				question: "What does TenantFlow actually help me do?",
				answer:
					"Track properties and units, keep tenant and lease records, log maintenance requests and vendor costs, e-sign leases (Growth and Max plans), and store every lease, receipt, and inspection report in a per-entity document vault with global search and bulk-download. The core tools a landlord needs to replace the spreadsheet.",
			},
			{
				question: "What specific results can I expect?",
				answer:
					"Centralized records replace spreadsheets and email threads, maintenance requests keep their vendor and cost history, and on Growth and Max, leases go out for e-signature instead of print-and-scan. Results vary by portfolio.",
			},
			{
				question: "Is TenantFlow suitable for my portfolio size?",
				answer:
					"Yes. Starter handles up to 5 properties / 25 units, Growth manages up to 20 properties / 100 units, and Max supports unlimited properties with a dedicated account manager.",
			},
		],
	},
	{
		category: "Implementation & Support",
		questions: [
			{
				question: "How long does setup take?",
				answer:
					"Most landlords have their portfolio imported and their first leases tracked within a day. CSV imports cover the heavy lifting; the document vault accepts existing PDFs and images directly.",
			},
			{
				question: "What kind of support do you provide?",
				answer:
					"Email support is included on every plan. Growth and Max plans add phone support. We are not a 24/7 operation — expect responses during US business hours.",
			},
			{
				question: "Do you integrate with my existing systems?",
				answer:
					"Every plan exports the income statement, cash flow, balance sheet and year-end report as CSV for accounting imports; Growth and Max add the year-end and tax-document PDFs. Lease e-signatures are included on Growth (25/month) and Max (unlimited); Starter does not include e-sign.",
			},
		],
	},
	{
		category: "Security & Compliance",
		questions: [
			{
				question: "How secure is my data?",
				answer:
					"TenantFlow runs on Supabase with TLS in transit and encryption at rest. Postgres row-level security isolates every landlord's data per request. Tenants never log in, so there are no extra access surfaces to manage. In Settings you can download your data or request account deletion at any time, including after your plan or trial ends. Deletion runs 30 days after the request, waits while a lease is active, and can be cancelled until then.",
			},
			{
				question: "Are lease templates compliant for my state?",
				answer:
					"Lease templates available on the platform are guidance, not legal advice. State and municipal rules around fair housing, lead-paint disclosures, and security deposits change frequently — we recommend a final review by a local attorney before signing any lease.",
			},
		],
	},
	{
		category: "Pricing & ROI",
		questions: [
			{
				question: "What changes once I switch?",
				answer:
					"You replace a tangle of spreadsheets, email threads, and file folders with one record per property, lease, and tenant. Lease PDFs, receipts, and inspection reports sit in the document vault, and its date-filtered zip download gives your CPA one folder at tax time.",
			},
			{
				question: "Are there any hidden fees?",
				answer:
					"No. Pricing on this page is what you pay. Lease e-sign volume scales with the plan you choose (Growth: 25/month, Max: unlimited; Starter does not include e-sign). Storage scales the same way (10GB / 50GB / unlimited).",
			},
			{
				question: "Can I try TenantFlow risk-free?",
				answer:
					"Yes — start the 14-day trial with no credit card required. Bring your own properties, leases, and documents. Cancel any time.",
			},
		],
	},
];
