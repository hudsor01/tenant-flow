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
	// has no page.tsx, so the capitalize-fallback already renders it as
	// "Templates" and adding the entry would change nothing on screen while
	// making the map appear to bless a dead route. This is a deliberate
	// one-entry deviation from D-07's literal six, pinned by a two-sided guard
	// in breadcrumbs.test.ts so it is revisited if that route ever ships.
	// The 404 itself is handled by NON_ROUTABLE_SEGMENTS below, not by the map.
	vault: "Vault",
	"rental-application": "Rental Application",
	"property-inspection": "Property Inspection",
	"maintenance-request": "Maintenance Request",
	"tenant-notice": "Tenant Notice",

	// Help and search
	help: "Get Help",
	search: "Search",
};

// Segments that are real URL path components but have no page.tsx behind them.
//
// `app-shell-header.tsx` renders every middle crumb as `crumb.href ? <Link> :
// <span>`, so an empty href is the supported "present but not navigable"
// signal. Without this, /documents/templates/<slug> offers a one-click trip to
// a hard 404. Phase 65's Band 3 is the first surface in the app to link the
// four printable templates at all, so it is also the first phase in which that
// crumb is reachable — the dead crumb predates DOCS-01, its reachability does
// not. Delete the entry if and when templates/page.tsx ships.
const NON_ROUTABLE_SEGMENTS = new Set(["templates"]);

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
			breadcrumbs.push({
				href: NON_ROUTABLE_SEGMENTS.has(segment) ? "" : currentPath,
				label,
			});
		}
	});

	return breadcrumbs;
}
