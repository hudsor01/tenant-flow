import type { BreadcrumbItem } from "#components/ui/breadcrumb";

// Map of route segments to readable labels
const LABEL_MAP: Record<string, string> = {
	// Owner dashboard routes
	dashboard: "Dashboard",
	properties: "Properties",
	tenants: "Tenants",
	units: "Units",
	leases: "Leases",
	maintenance: "Maintenance",
	analytics: "Analytics",
	financial: "Financial",
	reports: "Reports",
	settings: "Settings",
	new: "Create New",
	edit: "Edit",

	// Analytics sub-routes
	overview: "Overview",
	"property-performance": "Property Performance",
	occupancy: "Occupancy",

	// Reports hub sub-routes (D-29: the statements + exports live under /reports;
	// `analytics` and `financial` above stay because /analytics/financial is a
	// live destination, not a legacy URL)
	"income-statement": "Income Statement",
	"cash-flow": "Cash Flow",
	"balance-sheet": "Balance Sheet",
	expenses: "Expenses",
	"tax-documents": "Tax Documents",
	"year-end": "Year-End",

	// Documents routes
	documents: "Documents",
	"lease-template": "Lease Template",
	generate: "Generate",

	// Documents sub-routes (Phase 65, DOCS-01)
	//
	// `vault` is a fallback no-op — the capitalize-default already yields "Vault"
	// — but /documents/vault is a REAL route, so the entry is honest. Do not
	// "clean up" what looks like a redundant line.
	//
	// `templates` is deliberately ABSENT. src/app/(owner)/documents/templates/
	// has no page.tsx, so that middle crumb is a live 404 today, and every crumb
	// this function emits renders as a real <Link>. The capitalize-fallback
	// already renders it as "Templates", so adding the entry would change nothing
	// on screen and would only make the map appear to bless a dead route. The
	// dead crumb is pre-existing and out of DOCS-01's scope; this is a deliberate
	// one-entry deviation from D-07's literal six, pinned by a two-sided guard in
	// breadcrumbs.test.ts so it is revisited if that route ever ships.
	vault: "Vault",
	"rental-application": "Rental Application",
	"property-inspection": "Property Inspection",
	"maintenance-request": "Maintenance Request",
	"tenant-notice": "Tenant Notice",

	// Help and search
	help: "Get Help",
	search: "Search",
};

/**
 * Generates breadcrumb items from a URL pathname
 *
 * @param pathname - The URL pathname (e.g., '/properties/123/edit')
 * @returns Array of breadcrumb items with href and label
 *
 * @example
 * generateBreadcrumbs('/properties/123/edit')
 * // [{ href: '/properties', label: 'Properties' },
 * //  { href: '/properties/123', label: 'Properties Details' },
 * //  { href: '/properties/123/edit', label: 'Edit' }]
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
	const segments = pathname.split("/").filter(Boolean);
	let currentPath = "";
	const breadcrumbs: BreadcrumbItem[] = [];

	segments.forEach((segment, index) => {
		currentPath += `/${segment}`;

		// Use mapped label or capitalize segment
		const label =
			LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

		// Skip UUIDs (typical format: 8-4-4-4-12 characters)
		const isUUID =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				segment,
			);
		if (isUUID) {
			// For UUIDs, use the previous segment's label + "Details" or just "Details"
			const previousLabel = breadcrumbs[index - 1]?.label || "Details";
			breadcrumbs.push({
				href: currentPath,
				label: `${previousLabel} Details`,
			});
		} else {
			breadcrumbs.push({ href: currentPath, label });
		}
	});

	return breadcrumbs;
}
