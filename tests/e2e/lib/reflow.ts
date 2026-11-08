import { expect, type Page } from "@playwright/test";
import { polledRead } from "./measure";

/**
 * WCAG 1.4.10 Reflow at 320 CSS px (66.2-39 fix round 1, part F): no page may
 * scroll sideways at 320px. Content inside its own `overflow-x` container (a
 * data table, a markdown table) may scroll there; the document may not.
 *
 * The route lists are the pages in `src/app` a visitor (public) or owner A
 * (owner) can reach at a fixed URL, taken from the `page.tsx` tree. A tab its
 * URL names is listed as its own route (`?tab=insights`, each settings tab),
 * since the page mounts only the tab the URL asks for. Every other page is in
 * `REFLOW_UNLISTED_PAGES` below, with the spec that measures it or the reason
 * nothing does, and `__tests__/reflow-route-accounting.test.ts` fails on a
 * `page.tsx` in neither. The `@modal/(.)…` intercepts are client-side overlays
 * of their full-page twins, which render the same form, so each is covered
 * where its twin is. `/sign/<token>` with a live token has no fixture that
 * mints one, so only its invalid-token state is covered; `/apply/<token>` is
 * covered both ways.
 */
export const REFLOW_WIDTH = 320;

export const PUBLIC_REFLOW_ROUTES = [
	"/",
	"/about",
	"/auth/confirm-email",
	"/auth/update-password",
	"/blog",
	"/compare",
	"/contact",
	"/faq",
	"/features",
	"/help",
	"/login",
	"/pricing",
	"/pricing/cancel",
	"/privacy",
	"/resources",
	"/resources/landlord-tax-deduction-tracker",
	"/resources/seasonal-maintenance-checklist",
	"/resources/security-deposit-reference-card",
	"/search",
	"/security-policy",
	"/stripe/cancel",
	"/stripe/success",
	"/terms",
	"/sign/not-a-real-token",
	"/apply/not-a-real-token",
] as const;

export const OWNER_REFLOW_ROUTES = [
	"/dashboard",
	"/analytics/financial",
	"/analytics/overview",
	"/analytics/property-performance",
	"/applications",
	"/billing/checkout/cancel",
	"/billing/checkout/success",
	"/billing/plans",
	"/documents",
	"/documents/lease-template",
	"/documents/templates/maintenance-request",
	"/documents/templates/property-inspection",
	"/documents/templates/rental-application",
	"/documents/templates/tenant-notice",
	"/documents/vault",
	"/inspections",
	"/inspections/new",
	"/leases",
	"/leases?tab=insights",
	"/leases/new",
	"/maintenance",
	"/maintenance?tab=insights",
	"/maintenance/new",
	"/maintenance/vendors",
	"/notifications",
	"/profile",
	"/properties",
	"/properties?tab=insights",
	"/properties/new",
	"/properties/units",
	"/reports",
	"/reports/balance-sheet",
	"/reports/cash-flow",
	"/reports/expenses",
	"/reports/generate",
	"/reports/income-statement",
	"/reports/tax-documents",
	"/reports/year-end",
	"/settings",
	"/settings?tab=notifications",
	"/settings?tab=security",
	"/settings?tab=billing",
	"/settings?tab=categories",
	"/settings?tab=data",
	"/tenants",
	"/tenants/new",
	"/units",
	"/units/new",
] as const;

/** How a page the route lists do not name is covered, or why it is not. */
type UnlistedPage =
	/** A data-driven spec measures it; `marker` is the text in the spec that reaches it. */
	| { measuredBy: string; marker: string }
	/** The page only redirects, to a listed route. */
	| { redirectsTo: string }
	/** No spec measures it. */
	| { notMeasured: string };

/**
 * Every `page.tsx` route the lists above do not name, keyed by its route
 * pattern (route groups dropped, `[param]` kept). Held to the tree by
 * `__tests__/reflow-route-accounting.test.ts`.
 */
export const REFLOW_UNLISTED_PAGES: Readonly<Record<string, UnlistedPage>> = {
	"/admin": {
		notMeasured: "owner A is not an admin, so the proxy sends it to /dashboard",
	},
	"/admin/analytics": {
		notMeasured: "owner A is not an admin, so the proxy sends it to /dashboard",
	},
	"/admin/blog": {
		notMeasured: "owner A is not an admin, so the proxy sends it to /dashboard",
	},
	"/auth/signout": {
		notMeasured: "an action that ends the session, not a page",
	},
	"/analytics": { redirectsTo: "/analytics/overview" },
	"/analytics/leases": { redirectsTo: "/leases?tab=insights" },
	"/analytics/maintenance": { redirectsTo: "/maintenance?tab=insights" },
	"/analytics/occupancy": { redirectsTo: "/properties?tab=insights" },
	"/settings/billing": { redirectsTo: "/settings?tab=billing" },
	// Their paths depend on data: one post and one category the blog index
	// links, and every comparison page the compare index links.
	"/blog/[slug]": {
		measuredBy: "public/reflow-320.spec.ts",
		marker: "main a[href^='/blog/']",
	},
	"/blog/category/[category]": {
		measuredBy: "public/reflow-320.spec.ts",
		marker: 'href.startsWith("/blog/category/")',
	},
	"/compare/[competitor]": {
		measuredBy: "public/reflow-320.spec.ts",
		marker: "main a[href^='/compare/']",
	},
	// The detail and edit pages, on owner A's newest record of each kind; a
	// kind owner A has no record of skips its pages, with the reason.
	"/properties/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/properties/${id}`",
	},
	"/properties/[id]/edit": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/properties/${id}/edit`",
	},
	"/tenants/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/tenants/${id}`",
	},
	"/tenants/[id]/edit": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/tenants/${id}/edit`",
	},
	"/leases/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/leases/${id}`",
	},
	"/leases/[id]/edit": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/leases/${id}/edit`",
	},
	"/maintenance/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/maintenance/${id}`",
	},
	"/maintenance/[id]/edit": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/maintenance/${id}/edit`",
	},
	"/units/[id]/edit": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/units/${id}/edit`",
	},
	"/inspections/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/inspections/${id}`",
	},
	"/applications/[id]": {
		measuredBy: "owner-reflow-320.spec.ts",
		marker: "`/applications/${id}`",
	},
};

interface PageWidth {
	scrollWidth: number;
	clientWidth: number;
	/**
	 * The page's content landmark has a laid-out box, no loading skeleton and
	 * no running entrance animation, and an app-shell header has its user menu
	 * (it mounts once the user loads, and is part of the header's width).
	 */
	settled: boolean;
}

/**
 * Asserts the page at `path` has no document-level horizontal overflow once it
 * has hydrated and its content has replaced the loading skeleton. The read is
 * polled until that layout gate holds; the overflow itself is asserted after.
 */
export async function expectNoPageOverflow(
	page: Page,
	path: string,
): Promise<void> {
	await page.goto(path);
	const main = page.locator("main").first();
	await expect
		.poll(
			() =>
				main.evaluate((node) =>
					Object.keys(node).some((key) => key.startsWith("__react")),
				),
			{ timeout: 20_000 },
		)
		.toBe(true);
	const width = await polledRead<PageWidth>(
		() =>
			page.evaluate(() => {
				const landmark = document.querySelector("main");
				const running = document
					.getAnimations()
					.some(
						(a) =>
							a instanceof CSSAnimation &&
							a.animationName === "enter" &&
							a.playState === "running",
					);
				const header = document.querySelector(
					"header:has([data-slot=sidebar-trigger])",
				);
				const headerReady =
					!header ||
					header.querySelector('[aria-label$=" user menu"]') !== null;
				return {
					scrollWidth: document.documentElement.scrollWidth,
					clientWidth: document.documentElement.clientWidth,
					settled:
						!!landmark &&
						landmark.clientHeight > 0 &&
						landmark.querySelector('[data-slot="skeleton"]') === null &&
						!running &&
						headerReady,
				};
			}),
		(value) => value.settled && value.clientWidth === REFLOW_WIDTH,
		20_000,
	);
	expect(
		width.scrollWidth,
		`${path} scrolls sideways at ${width.clientWidth}px (document ${width.scrollWidth}px wide)`,
	).toBeLessThanOrEqual(width.clientWidth);
}

/** What a lookup of owner A's newest record of one kind came back with. */
export type NewestRecord =
	| { state: "found"; id: string }
	| { state: "none"; reason: string }
	| { state: "failed"; reason: string };

/**
 * Classifies one newest-record lookup (`select("id")…limit(1)` over
 * PostgREST) for `owner-reflow-320.spec.ts`: an id; no record, which skips
 * the kind's pages with that reason; or a failed query, which fails them with
 * the error. A network error, a 5xx or a renamed column is not "owner A has
 * no <kind>", and a skip saying so would hide it.
 */
export function newestRecord(
	kind: string,
	result: { data: unknown; error: { message: string } | null },
): NewestRecord {
	if (result.error) {
		return {
			state: "failed",
			reason: `owner A's newest ${kind} could not be read: ${result.error.message}`,
		};
	}
	if (!Array.isArray(result.data)) {
		return {
			state: "failed",
			reason: `owner A's newest ${kind}: the lookup returned no rows array`,
		};
	}
	if (result.data.length === 0) {
		return { state: "none", reason: `owner A has no ${kind}` };
	}
	const row: unknown = result.data[0];
	const id =
		typeof row === "object" && row !== null && "id" in row ? row.id : undefined;
	if (typeof id !== "string") {
		return {
			state: "failed",
			reason: `owner A's newest ${kind}: the row has no string id`,
		};
	}
	return { state: "found", id };
}
