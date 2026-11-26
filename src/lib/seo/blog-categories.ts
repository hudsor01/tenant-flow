/**
 * Blog category slug -> human display label map.
 *
 * The `blogs.category` column stores the kebab slug directly (e.g.
 * `software-vault`, `lease-law`) — NOT a human-readable name. The
 * `get_blog_categories` RPC therefore returns `name === slug` (both kebab),
 * so rendering `category.name` verbatim as an `<h1>`/`<title>` shows the raw
 * slug to users and search engines. This map is the single source of truth
 * for converting a category slug to its display label across the breadcrumb,
 * category-page heading/title/meta, and the post-page breadcrumb so the
 * visible label and the JSON-LD `BreadcrumbList` node can never drift.
 */
export const CATEGORY_LABELS: Record<string, string> = {
	"lease-law": "Lease Law",
	// "Software Vault" was internal jargon (2026-11-24 SEO audit BL7, SV1;
	// D-17). The slug stays: validate_blog_post gates the five slugs.
	"software-vault": "Using TenantFlow",
	"tax-prep": "Tax Prep",
	"tenant-screening": "Tenant Screening",
	maintenance: "Maintenance",
};

/**
 * Resolve a category slug to its display label. Falls back to a
 * title-cased rendering of the slug for any category not yet in the map so
 * a newly-seeded category never renders an empty heading — it just shows a
 * best-effort label until added above.
 */
export function categoryLabel(slug: string): string {
	const known = CATEGORY_LABELS[slug];
	if (known) return known;
	return slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * A category page is indexed, and listed in the sitemap, only once it holds
 * this many posts. A one- or two-card page with a templated description reads
 * as thin content (2026-11-24 SEO audit CT-2). Below it the page is
 * `noindex, follow`: still crawlable, so its posts are found, and it joins
 * the index by itself as posts are published.
 */
export const MIN_INDEXED_CATEGORY_POSTS = 3;

/** A category page's written copy (2026-11-24 SEO audit CT-5). */
export interface CategoryCopy {
	/** The meta description and JSON-LD description, 120 to 155 characters. */
	description: string;
	/** Shown under the H1. */
	intro: string;
	/** The free resource or guide the intro points to (LL3, TX2, MT2). */
	link?: { label: string; href: string };
}

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
	"software-vault": {
		description:
			"Step-by-step guides to setting up and running your rentals in TenantFlow: properties, rental applications, documents, and choosing a plan.",
		intro:
			"Walkthroughs of TenantFlow itself, for landlords setting it up or getting more out of it: adding properties and units, collecting rental applications through a shareable link, keeping leases, receipts and inspection photos in the document vault, and choosing between Starter, Growth and Max. Each post walks through one part of the app as it works today; for the short version of a single task, the Help Center has a step-by-step guide.",
		link: { label: "Short how-to guides in the Help Center", href: "/help" },
	},
	"lease-law": {
		description:
			"Articles for landlords on leases and the rules around them, with a free 50-state chart of security deposit limits and return deadlines.",
		intro:
			"Leases, renewals and the rules that govern them, for landlords who manage their own rentals. State law sets much of what a lease can say: how large a deposit can be, how fast it must be returned, and what the itemized statement must show. For those figures, the free security deposit reference card lists each state's deposit cap, return deadline and statute.",
		link: {
			label: "Security deposit laws by state",
			href: "/resources/security-deposit-reference-card",
		},
	},
	"tax-prep": {
		description:
			"Tax-season articles for landlords: getting rental income, expenses and receipts ready for Schedule E, with a free printable deduction tracker.",
		intro:
			"Getting a year of rental income and expenses ready for Schedule E. The posts here cover the rent ledger and year-end exports; for the deductions themselves, the free tax deduction tracker puts each one on its Schedule E line, with an example. Most of the work is keeping a clean record through the year: each payment received in the lease's ledger, each repair cost on its maintenance request, and each receipt in the document vault.",
		link: {
			label: "Landlord tax deduction tracker",
			href: "/resources/landlord-tax-deduction-tracker",
		},
	},
	maintenance: {
		description:
			"Maintenance articles for landlords: inspections, repairs and keeping a record of the work, with a free seasonal maintenance checklist to print.",
		intro:
			"Keeping rentals in repair, and keeping a record of it: move-in and move-out inspections, repair requests and what they cost. For the routine work, the free seasonal checklist covers each season's HVAC, plumbing, exterior and safety tasks. A dated record of each inspection and repair, with its photos and costs, is what settles a security deposit question later, and shows what each property costs to run.",
		link: {
			label: "Seasonal maintenance checklist",
			href: "/resources/seasonal-maintenance-checklist",
		},
	},
};

/**
 * A category page's description: its written one, or, for a category with
 * none yet, a plain line that claims nothing ("Expert insights" did).
 */
export function categoryDescription(slug: string): string {
	return (
		CATEGORY_COPY[slug]?.description ??
		`TenantFlow blog posts on ${categoryLabel(slug).toLowerCase()}, for landlords who manage their own rentals.`
	);
}
