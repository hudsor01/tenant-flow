import Link from "next/link";
import { getPricingPlan, type PlanId } from "#config/pricing";
import { DiagnosticError } from "#lib/diagnostic-error";
import { formatCount } from "#lib/formatters/count";

/**
 * What each feature does, in a few sentences of what a landlord actually does
 * with it (2026-11-24 SEO audit F8: the page was ~610 words, mostly mock
 * data). Every statement matches `src/lib/seo/llms-full-facts.ts`, the
 * product-fact list kept true of the shipped product; plan limits come from
 * `src/config/pricing.ts`. Each heading has an id, so other pages can link to
 * a feature.
 */

function planLimits(id: PlanId): string {
	const plan = getPricingPlan(id);
	if (!plan) throw new DiagnosticError(`feature details: no "${id}" plan`);
	return `${formatCount(plan.limits.properties, "property", "properties")} and ${formatCount(plan.limits.units, "unit")}`;
}

interface FeatureDetail {
	id: string;
	title: string;
	paragraphs: string[];
	/** The Help Center article for it (SEO audit HC7). */
	guide?: { label: string; slug: string };
}

const FEATURES: FeatureDetail[] = [
	{
		id: "property-management",
		title: "Property management",
		paragraphs: [
			"Add each building and its units, with the rent amount and occupancy for every unit. A unit's status follows its leases, and the dashboard shows occupancy across the whole portfolio.",
			`Starter covers up to ${planLimits("starter")}, Growth up to ${planLimits("growth")}, and Max has no limit. An account at its plan's cap sees an upgrade prompt when it adds one more.`,
		],
		guide: {
			label:
				"Import your properties, units, tenants and leases from a CSV file",
			slug: "import-properties-from-csv",
		},
	},
	{
		id: "document-vault",
		title: "Document vault",
		paragraphs: [
			"Upload PDFs and images, up to 10 MB each, to the Documents section of a property, lease, tenant, maintenance request or inspection. Every file, each e-signed lease included, appears in one vault list.",
			"Search it by file name, and filter by the kind of record a file belongs to, by category and by upload date. Define your own categories, then download up to 500 files as one ZIP, such as a year of receipts for your accountant.",
		],
		guide: {
			label: "Upload and organize documents",
			slug: "upload-and-organize-documents",
		},
	},
	{
		id: "tenant-records",
		title: "Tenant records and applications",
		paragraphs: [
			"Keep each tenant's contact details, an emergency contact, their linked leases and uploaded documents, and a move-out date and reason. Tenants are records you own, not users: they never get a login.",
			"Applicants apply through a shareable link for a unit, without an account. Set each application's status, keep private notes on it, and convert an approved applicant into a tenant record. TenantFlow runs no credit, background or eviction checks.",
		],
		guide: {
			label: "Add a tenant and create a lease",
			slug: "add-a-tenant-and-create-a-lease",
		},
	},
	{
		id: "maintenance-tracking",
		title: "Maintenance and inspections",
		paragraphs: [
			"Log each repair request, set its priority and a scheduled date, assign a vendor, and attach photos and documents. Record what the repair cost, download a work-order PDF for the vendor, and mark the request complete. Repair costs appear in your financial reports, by vendor and by property.",
			"Move-in and move-out inspections record the property room by room, with photos, so a deposit decision rests on a dated record.",
		],
	},
	{
		id: "lease-management",
		title: "Lease management and e-signing",
		paragraphs: [
			"Create a lease in a guided form with the property, unit, tenant, rent, deposit, dates and payment terms, then renew, end or terminate it. Reminders before a lease ends show in the app on every plan, and by email on Growth and Max.",
			"On Growth and Max, send a lease for signature: the tenant signs from an emailed link with no account, you sign in the app, and the executed PDF with its signature audit certificate is filed on the lease and emailed to the tenant. Growth includes 25 signature requests a month; Max has no limit. A separate template builder assembles built-in clauses into a downloadable lease PDF.",
		],
		guide: {
			label: "Send a lease for e-signature",
			slug: "send-a-lease-for-e-signature",
		},
	},
	{
		id: "financial-reporting",
		title: "Rent ledger and financial reports",
		paragraphs: [
			"Each lease has its own ledger. Once you start tracking a lease, a rent charge posts every month; you add other charges and log each payment you receive. Entries are corrected by reversal, never edited, so the history stays intact.",
			"TenantFlow builds an income statement, cash flow statement, balance sheet and year-end report from the ledger and the repair costs on your maintenance requests. Every plan exports them as CSV; Growth and Max add PDF year-end and tax-document exports.",
		],
		guide: {
			label: "Track rent in a lease's ledger",
			slug: "track-rent-in-the-ledger",
		},
	},
];

export function FeatureDetailsSection() {
	return (
		<section className="section-spacing">
			<div className="mx-auto max-w-4xl px-6 lg:px-8">
				<h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
					What each feature does
				</h2>
				<p className="mx-auto mb-12 max-w-2xl text-center text-lg text-muted-foreground">
					The work each part of TenantFlow takes off your plate, and what it
					doesn&apos;t do.
				</p>
				<div className="space-y-10">
					{FEATURES.map((feature) => (
						<div key={feature.id} id={feature.id} className="scroll-mt-24">
							<h3 className="mb-3 text-xl font-semibold text-foreground">
								{feature.title}
							</h3>
							<div className="space-y-3">
								{feature.paragraphs.map((paragraph) => (
									<p
										key={paragraph}
										className="mb-0 leading-relaxed text-muted-foreground"
									>
										{paragraph}
									</p>
								))}
								{feature.guide && (
									<p className="mb-0 text-sm">
										<span className="text-muted-foreground">How to: </span>
										<Link
											href={`/help/${feature.guide.slug}`}
											className="text-primary-text underline underline-offset-4 hover:no-underline"
										>
											{feature.guide.label}
										</Link>
									</p>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
