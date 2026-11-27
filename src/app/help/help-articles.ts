/**
 * The Help Center's how-to articles at /help/<slug> (2026-11-24 SEO audit
 * HC1, HC7). Each step was traced through the app's own code on
 * `reviewedAt`: the labels are the ones the app renders, the limits the ones
 * it enforces. When a flow's UI changes, re-trace it and move its date;
 * `help-articles.test.ts` fails once an article is a year past review.
 */

export interface HelpSection {
	heading: string;
	/** Text before the steps. */
	paragraphs?: string[];
	steps?: string[];
	/** Notes after the steps. */
	after?: string[];
}

export interface HelpArticle {
	slug: string;
	/** The H1. */
	title: string;
	/** The `<title>`, before the " | TenantFlow" suffix; at most 60 rendered. */
	metaTitle: string;
	/** The meta description, 120 to 155 characters. */
	description: string;
	/** One line for the /help list. */
	summary: string;
	intro: string;
	/** Which plans the article applies to, when not every plan. */
	plans?: string;
	sections: HelpSection[];
	related: { label: string; href: string }[];
	publishedAt: string;
	reviewedAt: string;
}

const PUBLISHED_AT = "2026-11-25";
const REVIEWED_AT = "2026-11-25";

export const HELP_ARTICLES: HelpArticle[] = [
	{
		slug: "import-properties-from-csv",
		title: "Import your properties, units and tenants from a CSV file",
		metaTitle: "Import Properties, Units and Tenants from CSV",
		description:
			"Import properties, units and tenants into TenantFlow from a CSV file: the template, the columns each import needs, the 100-row limit, and fixing errors.",
		summary:
			"Bring existing records in from a spreadsheet, up to 100 rows per file.",
		intro:
			"Each importer takes a CSV file of up to 100 rows. Download its template, fill it in, and TenantFlow checks every row before anything is added.",
		sections: [
			{
				heading: "Where each import lives",
				paragraphs: [
					"Properties: Bulk Import on the Properties page. Units: Import Units in the Units card of a property's page, for property types with several units (single-family homes, condos and townhouses have one unit, added on their page). Tenants: Import Tenants on the Tenants page, once you have at least one tenant.",
				],
			},
			{
				heading: "Run an import",
				steps: [
					"Click the import button. The dialog's first step is Upload.",
					"Under Need a template?, click Download and fill in the template in your spreadsheet app. Keep the header row.",
					"Save it as CSV (comma-separated, UTF-8) and select it, or drag it onto the upload area. The file can be up to 5 MB.",
					"Review the preview. Every row must show Valid before you can continue.",
					"Click Import. Rows are added one by one, and the result shows how many were imported.",
				],
			},
			{
				heading: "The columns each import needs",
				paragraphs: [
					"Properties: name, address_line1, city, state (two letters), postal_code (a US ZIP code) and property_type: SINGLE_FAMILY, MULTI_UNIT, APARTMENT, COMMERCIAL, CONDO, TOWNHOUSE or OTHER. address_line2 is optional.",
					"Units: unit_number and rent_amount (whole dollars). bedrooms, bathrooms, square_feet and status are optional. Units are added to the property whose page you're on.",
					"Tenants: email, first_name and last_name. phone and status are optional. Add emergency contacts afterward, from each tenant's Edit page.",
				],
			},
			{
				heading: "Fix errors",
				paragraphs: [
					"If any row has an error, the preview lists it as the column and the problem, and nothing is imported until you fix the file and upload it again. If some rows fail while importing, the others stay added: download the failed rows, correct them, and click Retry failed rows.",
					"Imports don't check for records you already have, so importing the same file twice adds everything twice.",
				],
			},
			{
				heading: "Your plan's limits",
				paragraphs: [
					"Properties and units count toward your plan: Starter covers up to 5 properties and 25 units, Growth up to 20 and 100, and Max has no limit. Rows past your plan's limit fail and are listed with the other failed rows.",
				],
			},
			{
				heading: "Leases",
				paragraphs: [
					"There is a lease importer, but its rows need each unit's and tenant's internal ID, which the app doesn't show. Create leases with New Lease instead.",
				],
			},
		],
		related: [
			{
				label: "Add a tenant and create a lease",
				href: "/help/add-a-tenant-and-create-a-lease",
			},
			{
				label: "Property management on the features page",
				href: "/features#property-management",
			},
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "add-a-tenant-and-create-a-lease",
		title: "Add a tenant and create a lease",
		metaTitle: "Add a Tenant and Create a Lease",
		description:
			"Add a tenant record in TenantFlow, then create a draft lease for them in four steps: the property and unit, the terms, the details, and a final review.",
		summary:
			"Add the tenant's record, then build their lease in the four-step lease form.",
		intro:
			"A tenant is a record you keep, not a user: they never get a login. Add the tenant, then create the lease, which starts as a draft.",
		sections: [
			{
				heading: "Add the tenant",
				steps: [
					"Click Tenants in the sidebar, then Add Tenant.",
					"Enter their first name, last name and email address. The phone number is optional.",
					"Optionally pick a property, and a unit if it has more than one.",
					"Click Add Tenant.",
				],
				after: [
					"If you picked a property, TenantFlow takes you straight to a new lease with the tenant, property and unit filled in. Add an emergency contact later from the tenant's Edit page.",
				],
			},
			{
				heading: "Create the lease",
				paragraphs: [
					"Click Leases in the sidebar, then New Lease, and work through the four steps with Next.",
				],
				steps: [
					"Selection: choose the property, an available unit and the primary tenant. Choosing the unit fills in its rent.",
					"Terms: pick a duration or set the start and end dates, then the monthly rent, security deposit, the day rent is due, the grace period and any late fee. Amounts are whole dollars.",
					"Details (all optional): maximum occupants, governing state, pet policy, which utilities are included or the tenant's responsibility, property rules, and the lead-based paint disclosure for properties built before 1978.",
					"Review: check everything, then click Create Draft Lease.",
				],
			},
			{
				heading: "After you create it",
				paragraphs: [
					"The lease opens as a draft, and the unit's status doesn't change until the lease becomes active. On Growth and Max, send it for e-signature from the lease's page: it becomes active when both of you have signed.",
					"A unit can't have two active or pending leases with overlapping dates.",
				],
			},
		],
		related: [
			{
				label: "Send a lease for e-signature",
				href: "/help/send-a-lease-for-e-signature",
			},
			{
				label: "Track rent in a lease's ledger",
				href: "/help/track-rent-in-the-ledger",
			},
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "send-a-lease-for-e-signature",
		title: "Send a lease for e-signature",
		metaTitle: "How to Send a Lease for E-Signature",
		description:
			"Send a draft lease to your tenant for e-signature in TenantFlow: what the tenant receives, how you countersign, and how to resend or cancel a request.",
		summary:
			"Email your tenant a signing link, countersign in the app, and file the executed PDF on the lease.",
		intro:
			"Send a draft lease to its tenant from the lease's page. The tenant signs from an emailed link, with no account; you sign in the app. When both have signed, the lease becomes active and the executed PDF is filed on it.",
		plans:
			"Lease e-sign is on the Growth plan (25 signature requests a month) and the Max plan (unlimited). On Starter, or during the free trial before you choose Growth or Max at checkout, sending asks you to upgrade.",
		sections: [
			{
				heading: "Before you send",
				paragraphs: [
					"The lease must be a draft with a tenant attached, and the tenant needs an email address. Open it from Leases: the Send for Signature button shows in the lease header only while the lease is a draft with a tenant.",
				],
			},
			{
				heading: "Send the request",
				steps: [
					"Open the lease from Leases.",
					"Click Send for Signature.",
					"Add a message if you like, list any immediate family members, and enter the Landlord notice address (required): the address where the tenant must send formal notices.",
					"Optionally click Preview PDF to open the unsigned lease in a new tab.",
					"Click Send for Signature. The lease's status becomes Pending Signature.",
				],
				after: [
					"While the request is open, the lease's rent, deposit, dates, unit, tenant and contract text can't be edited.",
				],
			},
			{
				heading: "What your tenant sees",
				paragraphs: [
					'Your tenant gets an email titled "Please sign your lease agreement" with a Review & Sign Lease button. The link is single-use, tied to their email, and expires in 14 days; they don\'t need an account.',
					"On the signing page they see the property, unit, rent and dates, consent to sign electronically, open and read the full lease, type their full legal name, and click Sign Lease.",
				],
			},
			{
				heading: "Countersign",
				steps: [
					"Open the lease while it is Pending Signature.",
					"Click Sign Lease, confirm that you have read the lease and agree to be bound by it, and click Sign as Owner.",
				],
				after: [
					"Either of you can sign first. The lease becomes Active when the second signature lands, and you get an in-app notification when your tenant signs.",
				],
			},
			{
				heading: "After both have signed",
				paragraphs: [
					"The executed PDF includes an electronic signature audit certificate with each party's signing time. It is filed automatically in the lease's Documents and in the document vault, under the Lease category, and can't be removed. Your tenant is emailed a copy; you can download it with Download Signed Lease on the lease.",
				],
			},
			{
				heading: "Resend or cancel a request",
				paragraphs: [
					"Resend emails your tenant a new link and stops the old one working. It doesn't count toward Growth's monthly limit.",
					"Cancel Request puts the lease back to draft, stops the tenant's link working and clears any signature already given. Sending it again counts as a new request.",
				],
			},
			{
				heading: "Your monthly limit",
				paragraphs: [
					"Settings, Billing, Usage shows how many of Growth's 25 requests you've used this month. A request beyond the limit asks you to upgrade to Max.",
				],
			},
		],
		related: [
			{
				label: "Add a tenant and create a lease",
				href: "/help/add-a-tenant-and-create-a-lease",
			},
			{
				label: "Lease management on the features page",
				href: "/features#lease-management",
			},
			{ label: "Compare plans", href: "/pricing" },
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "upload-and-organize-documents",
		title: "Upload and organize documents",
		metaTitle: "Upload and Organize Rental Documents",
		description:
			"Upload PDFs and images to a property, lease, tenant, maintenance request or inspection in TenantFlow, sort them by category, and find them in the vault.",
		summary:
			"Attach files to the record they belong to, sort them by category, and find any of them in the vault.",
		intro:
			"Every document lives on the record it belongs to: a property, lease, tenant, maintenance request or inspection. The document vault lists all of them in one place, with search and filters.",
		sections: [
			{
				heading: "Upload files to a record",
				steps: [
					"Open the property, lease, tenant, maintenance request or inspection.",
					"In its Documents card, pick a category for the files you're about to add. The default is Other; one category applies to the whole batch.",
					"Click Upload and choose one or more files.",
				],
				after: [
					"Files can be PDF, JPG, PNG or WebP, up to 10 MB each. Anything else is skipped, and the message after the upload says which files were skipped and why. A file's name becomes its title, so name files the way you'll want to search for them.",
				],
			},
			{
				heading: "Set up your categories",
				paragraphs: [
					"Seven categories come built in: Lease, Receipt, Tax return, Inspection report, Maintenance invoice, Insurance and Other. Under Settings, Categories, you can add your own, rename or reorder any of them, and delete the ones you added; deleting one moves its documents to a category you choose.",
				],
			},
			{
				heading: "Find a document in the vault",
				steps: [
					"Click Documents in the sidebar, then Open the vault.",
					"Search by words in a document's title, or filter by the kind of record it belongs to, by category, or by the date it was uploaded.",
					"Click a document to preview it, or use its download button.",
				],
				after: [
					"The vault is read-only: upload and remove documents on the record they belong to.",
				],
			},
			{
				heading: "Remove a document",
				paragraphs: [
					"On the record's Documents card, click Remove on the document and confirm. This deletes the file for good. E-signed leases are filed automatically and can't be removed.",
				],
			},
		],
		related: [
			{
				label: "Download your documents for tax season",
				href: "/help/download-documents-for-tax-season",
			},
			{
				label: "The document vault on the features page",
				href: "/features#document-vault",
			},
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "download-documents-for-tax-season",
		title: "Download your documents for tax season",
		metaTitle: "Download Rental Documents for Tax Season",
		description:
			"Download a year of receipts, invoices and tax documents from TenantFlow's document vault as one ZIP file, filtered by category, record type and date.",
		summary:
			"Filter the vault to the files your accountant needs and download them as one ZIP.",
		intro:
			"The document vault downloads exactly what its filters show, as a single ZIP. Narrow it to a year's receipts and invoices, and hand your accountant one file.",
		sections: [
			{
				heading: "Download a filtered set",
				steps: [
					"Click Documents in the sidebar, then Open the vault.",
					"Set the date range to the tax year, and pick the categories you need, such as Receipt, Maintenance invoice and Tax return.",
					"Click Download all. The button shows how many files the ZIP will hold.",
				],
			},
			{
				heading: "What's in the ZIP",
				paragraphs: [
					"Files are grouped in folders by the kind of record they belong to (property, lease, tenant and so on) and named after each document's title. If a file can't be read, a _DOWNLOAD_NOTES.txt file in the ZIP lists it.",
				],
			},
			{
				heading: "Limits",
				paragraphs: [
					"One ZIP holds up to 500 documents. If your filters match more, the button is disabled: narrow the date range or the categories and download in parts.",
					"The date filter uses the date a document was uploaded, not the date on the receipt. Upload receipts as they come in, and a year's filter will catch them.",
				],
			},
			{
				heading: "Your financial reports",
				paragraphs: [
					"The vault holds your files; your reports come from Reports. Every plan exports the income statement, cash flow statement, balance sheet and year-end report as CSV, and Growth and Max add PDF year-end and tax-document exports.",
				],
			},
		],
		related: [
			{
				label: "Upload and organize documents",
				href: "/help/upload-and-organize-documents",
			},
			{
				label: "Free landlord tax deduction tracker",
				href: "/resources/landlord-tax-deduction-tracker",
			},
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "track-rent-in-the-ledger",
		title: "Track rent in a lease's ledger",
		metaTitle: "Track Rent and Payments in the Ledger",
		description:
			"Start a rent ledger for a lease in TenantFlow, record the payments you receive, add late fees or credits, and correct an entry with a reversal.",
		summary:
			"Start a lease's ledger, record payments you receive, and see its running balance.",
		intro:
			"Each lease has its own ledger of charges, payments and a running balance. TenantFlow doesn't move money: you record the payments you've already received, however your tenant paid.",
		sections: [
			{
				heading: "Start tracking a lease",
				steps: [
					"Open the lease from Leases and choose the Ledger tab.",
					"Click Start tracking rent.",
					"Pick the date to start from, and enter the balance owed on that date (0 if the tenant was current).",
					"Click Start tracking rent.",
				],
				after: [
					"History before the start date isn't rebuilt: the ledger begins with an opening balance line on that date.",
				],
			},
			{
				heading: "How rent charges are added",
				paragraphs: [
					"Once a lease is tracked, a Rent charge for its monthly rent posts on the 1st of each month, from the month you started tracking. Charges post in a nightly run, so the first one appears the day after you start. Rent isn't prorated, and late fees are never added automatically.",
				],
			},
			{
				heading: "Record a payment",
				steps: [
					"On the Ledger tab, click Record receipt.",
					"Choose the charge the payment applies to.",
					"Enter the amount received and the date you received it.",
					"Add a method, such as cash, check or Zelle. It's a label for your records only.",
					"Click Record receipt.",
				],
				after: [
					"A partial payment is fine: record one receipt per payment. An overpayment becomes a credit.",
				],
			},
			{
				heading: "Add a late fee, another charge or a credit",
				paragraphs: [
					"Click Add line, choose Late fee, Other charge or Credit, and enter the amount, date and a description. A charge raises the balance; a credit lowers it.",
				],
			},
			{
				heading: "Correct a mistake",
				paragraphs: [
					"Entries are never edited or deleted. Use the Reverse entry button on the row instead: it posts an offsetting entry, and the original stays on the ledger marked Reversed. Reversing a charge also reverses the payments recorded against it.",
				],
			},
			{
				heading: "Read the balance",
				paragraphs: [
					"The Ledger tab shows the balance, the total charged and the total received. Each row shows a running balance and a status: Paid, Partial, Unpaid or Late. A charge counts as late 5 days after it was due.",
				],
			},
		],
		related: [
			{
				label: "Rent ledger and financial reports on the features page",
				href: "/features#financial-reporting",
			},
			{
				label: "Add a tenant and create a lease",
				href: "/help/add-a-tenant-and-create-a-lease",
			},
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "change-plan-or-cancel",
		title: "Change your plan or cancel",
		metaTitle: "Change Your TenantFlow Plan or Cancel",
		description:
			"Choose a plan when your trial ends, upgrade or downgrade, or cancel your TenantFlow subscription, and what happens to your records afterward.",
		summary:
			"Pick a plan, switch plans, or cancel, and what happens to your data when a plan ends.",
		intro:
			"Billing lives under Settings, Billing. Your properties, tenants and leases are kept whatever you choose.",
		sections: [
			{
				heading: "Choose a plan",
				steps: [
					"Open Settings and choose the Billing tab.",
					"Click Choose a Plan, or View All Plans.",
					"Pick Starter, Growth or Max and confirm. Checkout opens in Stripe.",
				],
				after: [
					"Plans in the app are billed monthly. For annual billing, choose your plan from the pricing page.",
				],
			},
			{
				heading: "Upgrade or downgrade",
				paragraphs: [
					"With a subscription in place, the Billing tab's Manage Plan button, and Upgrade or Downgrade on the plans page, take you to Stripe's billing portal, where the change is made. You can also update your payment method and see invoices there.",
				],
			},
			{
				heading: "Cancel",
				steps: [
					"On the Billing tab, click Cancel Plan.",
					"Click Yes, cancel plan.",
				],
				after: [
					"Your plan stays active until the end of the period you've paid for, and you can click Reactivate Plan until then.",
				],
			},
			{
				heading: "When a plan or trial ends",
				paragraphs: [
					"Your properties, tenants and leases are kept, and nothing is deleted unless you ask. Until you choose a plan again, only Settings and the plans page open: from Settings you can download your data, request account deletion, or resubscribe.",
					"The free trial lasts 14 days and needs no card. You get an email about three days before it ends.",
				],
			},
		],
		related: [
			{
				label: "Download your data or delete your account",
				href: "/help/download-your-data-or-delete-your-account",
			},
			{ label: "Plans and pricing", href: "/pricing" },
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
	{
		slug: "download-your-data-or-delete-your-account",
		title: "Download your data or delete your account",
		metaTitle: "Download Your Data or Delete Your Account",
		description:
			"Download a JSON copy of your TenantFlow records, or request account deletion: what the export holds, what deletion removes, and how to cancel a request.",
		summary:
			"Export your records as a JSON file, or schedule your account for deletion.",
		intro:
			"Both live under Settings, My Data, and both stay open after a plan or trial ends.",
		sections: [
			{
				heading: "Download your data",
				steps: [
					"Open Settings and choose the My Data tab.",
					"Under Data Portability, click Download My Data.",
				],
				after: [
					"You get a JSON file with your profile, properties, units, tenants, leases, maintenance requests, expenses and the list of your documents. The document files themselves aren't in it: download those from the vault. The rent ledger, inspections, vendors and rental applications aren't included either.",
				],
			},
			{
				heading: "Request account deletion",
				steps: [
					"On the My Data tab, under Danger Zone, click Delete My Account.",
					"Type DELETE to confirm, then click Request Account Deletion.",
				],
				after: [
					"Deletion runs 30 days after your request. If a lease is still active then, it waits until none is.",
				],
			},
			{
				heading: "What deletion removes and keeps",
				paragraphs: [
					"Your name, email, phone and photo are removed from your profile, your properties are marked inactive, and your notifications and rental applications are deleted. Your leases, tenants, expenses and rent records are kept, and so are your sign-in and emergency contact.",
				],
			},
			{
				heading: "Cancel a deletion request",
				paragraphs: [
					"Until deletion runs, the My Data tab shows when it's scheduled and a Cancel Deletion button.",
				],
			},
		],
		related: [
			{
				label: "Change your plan or cancel",
				href: "/help/change-plan-or-cancel",
			},
			{ label: "Privacy policy", href: "/privacy" },
			{ label: "Security policy", href: "/security-policy" },
		],
		publishedAt: PUBLISHED_AT,
		reviewedAt: REVIEWED_AT,
	},
];

export function helpArticle(slug: string): HelpArticle | undefined {
	return HELP_ARTICLES.find((article) => article.slug === slug);
}
