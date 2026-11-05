import { expect, type Page } from "@playwright/test";
import { polledRead } from "./measure";

/**
 * WCAG 1.4.10 Reflow at 320 CSS px (66.2-39 fix round 1, part F): no page may
 * scroll sideways at 320px. Content inside its own `overflow-x` container (a
 * data table, a markdown table) may scroll there; the document may not.
 *
 * The route lists are every page in `src/app` a visitor (public) or owner A
 * (owner) can reach, taken from the `page.tsx` tree. A page that only
 * redirects is covered through its target (`/analytics` → `/analytics/overview`,
 * `/settings/billing` → `/settings?tab=billing`), and a tab its URL names is
 * listed as its own route (`?tab=insights`, each settings tab), since the page
 * mounts only the tab the URL asks for. Not here, and why:
 * - `/admin/*`: owner A is not an admin, so the proxy sends it to /dashboard;
 * - `/auth/signout`: an action that ends the session, not a page;
 * - the `@modal/(.)…` intercepts: client-side overlays of the full-page twins
 *   listed here, which render the same form;
 * - `/sign/<token>` with a live token: no fixture mints one, so only its
 *   invalid-token state is covered; `/apply/<token>` is covered both ways;
 * - the detail and edit pages (`/properties/<id>`, `/leases/<id>/edit`, …):
 *   `owner-reflow-320.spec.ts` measures them on owner A's newest record of
 *   each kind, and a kind owner A has no record of skips its pages.
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
