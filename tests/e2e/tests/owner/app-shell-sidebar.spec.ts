import { expect, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../../auth-helpers";
import { polledRead } from "../../lib/measure";

/**
 * The canonical owner Sidebar in a real browser — Phase 66.2 wave 6, UI-SPEC
 * S-10 (D-34, D-36, D-39, D-40, D-41, D-46 to D-50; VD-26 to VD-37; T-COOKIE).
 *
 * WHAT JSDOM CANNOT DECIDE, AND THEREFORE WHAT THIS FILE EXISTS FOR. Plans
 * 66.2-31 to 66.2-35 moved the owner shell onto the vendored shadcn Sidebar and
 * pinned every class in unit tests. None of those tests can tell whether:
 *   - the neutralizers beat the unscoped `@layer base` list and link rules in
 *     globals.css (the Phase 65 defect class: the classes were present in the
 *     broken build too, so only a computed value answers it);
 *   - the rail, rows, sub rows and sheet have their real S-2/S-4 geometry;
 *   - Radix traps focus in the sheet and `hideOthers` hides the page;
 *   - the collapsed rail is `inert`, so Tab skips it;
 *   - the server renders the persisted `sidebar_state` without a hydration error;
 *   - the scrim closes the sheet.
 *
 * IT RUNS UNDER `owner-axe`, NOT `owner`. CI's `e2e-smoke` job invokes
 * `--project=smoke --project=public --project=owner-axe`; the `owner` /
 * `firefox` / `mobile-chrome` projects consume a storageState CI never
 * produces, so a spec matched only there gates nothing. Authentication is
 * in-test via `loginAsOwner` with no storageState, and `playwright.config.ts`
 * lists this filename in the `owner-axe` allowlist and in the other three
 * projects' testIgnore, so it executes exactly once.
 *
 * GEOMETRY GOES THROUGH `lib/measure.ts` ONLY (`boxOf`, `boxesOf`,
 * `polledRead`); computed styles through `toHaveCSS` or a `getComputedStyle`
 * evaluate. `measure-is-the-only-geometry-read.test.ts` enforces the first rule.
 *
 * HYDRATION ERRORS USE A LOCAL COLLECTOR, never `setupErrorMonitoring`: that
 * helper's ignore list filters "Hydration failed", so it cannot fail on the one
 * class of error the cookie matrix below exists to catch. A self-test proves the
 * local collector can fail.
 *
 * NO PRODUCTION WRITE. The onboarding tour's `user_tour_progress` traffic is
 * fulfilled by `page.route` in every authenticated test before `loginAsOwner`
 * runs, so no request for that table reaches Supabase. The `sidebar_state`
 * collapse preference is a browser cookie only.
 *
 * NOTHING IS UPLOADED. This file sets no `trace`, `screenshot` or `video`
 * option and logs no cookie or session value (CLAUDE.md §CI: CI authenticates
 * against production).
 */

// The 200ms sheet and collapse transitions become instant under the global
// reduced-motion rule in globals.css, which removes the transition race rather
// than waiting it out (the dashboard-smoke posture).
test.use({ contextOptions: { reducedMotion: "reduce" } });

const TRIGGER = '[data-slot="sidebar-trigger"]';

/** Mirrors `SIDEBAR_COOKIE_NAME` in `src/lib/sidebar-state.ts` (specs import nothing from `src/`). */
const SIDEBAR_COOKIE = "sidebar_state";

const HYDRATION_ERROR = /hydrat|Minified React error #(418|423|425)/i;

const VIEWPORTS = [
	{ width: 375, height: 667 },
	{ width: 900, height: 800 },
	{ width: 1024, height: 768 },
	{ width: 1280, height: 720 },
] as const;

/** The same base-URL expression `auth-helpers.ts` uses. */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050";

const TOUR_PROGRESS_ROUTE = "**/rest/v1/user_tour_progress*";

/**
 * axe measures the resting state. BlurFade's tw-animate `enter` entrance
 * (66.2-27) is finite: the KPI tiles and the portfolio table fade in for up to
 * 480 ms delay + 500 ms after mount, and axe color-contrast blends element
 * opacity, so a sweep taken mid-fade would measure a translucent foreground
 * that no user sees once the page settles. Wait until no `enter` animation is
 * still running.
 */
async function waitForEntranceAnimations(
	page: import("@playwright/test").Page,
) {
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						document
							.getAnimations()
							.filter(
								(a) =>
									a instanceof CSSAnimation &&
									a.animationName === "enter" &&
									a.playState === "running",
							).length,
				),
			{ timeout: 5000 },
		)
		.toBe(0);
}

/**
 * Shared authed-dashboard navigation used by both the axe sweep and the 375px
 * probe. `loginAsOwner` authenticates via the Supabase token API and injects the
 * session into the browser (landing on /dashboard); we then mark the onboarding
 * tour completed (so its overlay never opens to mask focusable elements from
 * axe) and wait for the dashboard heading to confirm the client-fetched content
 * has resolved past the loading skeleton.
 */
async function gotoAuthedDashboard(page: import("@playwright/test").Page) {
	// loginAsOwner already lands on an authenticated /dashboard, so we only mark
	// the onboarding tour completed and reload — no redundant re-navigation.
	await loginAsOwner(page);
	// Mark the owner onboarding tour completed so its spotlight overlay never
	// auto-opens over the axe sweep. The app reads tour state from the
	// "tenantflow:tour-progress" localStorage key as JSON keyed by tour name
	// (getTourProgress short-circuits on "completed"/"skipped" —
	// src/hooks/api/use-tour-progress.ts).
	await page.evaluate(() => {
		localStorage.setItem(
			"tenantflow:tour-progress",
			JSON.stringify({ "owner-onboarding": "completed" }),
		);
	});
	await page.reload();
	// Wait for a definitive loaded marker (past the skeleton) before sweeping.
	// Tolerate BOTH valid loaded states the rest of the suite treats as
	// non-guaranteed: the populated dashboard renders the exact <h1>Dashboard</h1>
	// (dashboard.tsx), while the zero-data path renders DashboardEmptyState's
	// "Welcome to TenantFlow" (no "Dashboard" heading). The synthetic owner's
	// property/tenant data is not a guaranteed invariant, so hard-coupling to the
	// populated path would time out and fail CI whenever the owner has no data.
	// The exact h1 match still avoids resolving on a loose sub-heading mid-render.
	// Empty-state branch is scoped to the EmptyTitle slot (a <div>, not a heading)
	// so it can't collide with the onboarding tour's "Welcome to TenantFlow"
	// TourTitle text (the tour is already suppressed above; this is belt-and-braces).
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).or(
			page.locator('[data-slot="empty-title"]', {
				hasText: "Welcome to TenantFlow",
			}),
		),
	).toBeVisible({ timeout: 10000 });
	await waitForEntranceAnimations(page);
}

/** The loaded-dashboard marker of `gotoAuthedDashboard`, for reloads after it. */
async function waitForDashboardContent(page: Page): Promise<void> {
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).or(
			page.locator('[data-slot="empty-title"]', {
				hasText: "Welcome to TenantFlow",
			}),
		),
	).toBeVisible({ timeout: 10000 });
}

/**
 * Waits until react-dom has hydrated the node `selector` matches. react-dom
 * precaches a fiber on every host node it hydrates (`__reactFiber$<random>`), so
 * an own key starting with `__react` is the hydration signal; visibility is not
 * (the apply-token.spec.ts gate).
 */
async function waitForHydration(page: Page, selector: string): Promise<void> {
	await page.waitForFunction(
		(target) => {
			const node = document.querySelector(target);
			return (
				node !== null &&
				Object.keys(node).some((key) => key.startsWith("__react"))
			);
		},
		selector,
		{ timeout: 20000 },
	);
}

/**
 * Collects every console error or warning and every uncaught page error whose
 * text matches `HYDRATION_ERROR`, into a live array. Attach it before the first
 * navigation so the first document load is covered.
 */
function collectHydrationErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("console", (message) => {
		const type = message.type();
		const text = message.text();
		if (
			(type === "error" || type === "warning") &&
			HYDRATION_ERROR.test(text)
		) {
			errors.push(`${type}: ${text}`);
		}
	});
	page.on("pageerror", (error) => {
		if (HYDRATION_ERROR.test(error.message)) {
			errors.push(`pageerror: ${error.message}`);
		}
	});
	return errors;
}

/** Plants `sidebar_state` on the browser context only (never on a server). */
async function seedSidebarCookie(
	page: Page,
	value: "true" | "false" | "garbage",
): Promise<void> {
	await page
		.context()
		.addCookies([{ name: SIDEBAR_COOKIE, value, url: BASE_URL }]);
}

interface TourProgressTraffic {
	gets: number;
	writes: number;
}

/**
 * Answers every `user_tour_progress` request locally, so none reaches
 * production. GET answers with a completed row, so the tour never opens over a
 * test that is not about it; any other method answers 201 with an empty body.
 * The counters are live.
 */
async function fulfillTourProgressAsCompleted(
	page: Page,
): Promise<TourProgressTraffic> {
	const traffic: TourProgressTraffic = { gets: 0, writes: 0 };
	await page.route(TOUR_PROGRESS_ROUTE, async (route) => {
		if (route.request().method() === "GET") {
			traffic.gets += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: JSON.stringify([
					{
						tour_key: "owner-onboarding",
						status: "completed",
						current_step: 0,
						completed_at: "2026-01-01T00:00:00.000Z",
						skipped_at: null,
						last_seen_at: "2026-01-01T00:00:00.000Z",
					},
				]),
			});
			return;
		}
		traffic.writes += 1;
		await route.fulfill({
			status: 201,
			headers: { "access-control-allow-origin": "*" },
			body: "",
		});
	});
	return traffic;
}

/**
 * Reads the server-rendered `data-state` of the desktop sidebar: the first
 * opening tag carrying `data-slot="sidebar"` with the closing quote straight
 * after `sidebar`, so `sidebar-wrapper` and the other slots never match.
 */
async function ssrSidebarState(page: Page): Promise<string> {
	const response = await page.goto("/dashboard");
	if (response === null) {
		throw new Error("ssrSidebarState: page.goto returned no response");
	}
	const html = await response.text();
	const tag = /<[^<>]*\bdata-slot="sidebar"[^<>]*>/.exec(html);
	if (tag === null) {
		throw new Error(
			'ssrSidebarState: the response HTML has no data-slot="sidebar" tag',
		);
	}
	const state = /\bdata-state="([^"]*)"/.exec(tag[0]);
	const value = state?.[1];
	if (value === undefined) {
		throw new Error(
			'ssrSidebarState: the data-slot="sidebar" tag carries no data-state',
		);
	}
	return value;
}

test.describe("S-10: no hydration error and no horizontal scroll", () => {
	test("the hydration collector catches a planted hydration error", async ({
		page,
	}) => {
		const errors = collectHydrationErrors(page);
		await page.goto("about:blank");
		await page.evaluate(() => console.error("Hydration failed probe"));
		await expect.poll(() => errors.length).toBe(1);
		expect(errors).toHaveLength(1);
	});

	for (const cookie of ["absent", "true", "false"] as const) {
		test(`sidebar_state ${cookie}: 375, 900, 1024 and 1280 hydrate cleanly with one main`, async ({
			page,
		}) => {
			test.setTimeout(90_000);
			const errors = collectHydrationErrors(page);
			const tour = await fulfillTourProgressAsCompleted(page);
			if (cookie !== "absent") {
				await seedSidebarCookie(page, cookie);
			}
			await gotoAuthedDashboard(page);

			for (const viewport of VIEWPORTS) {
				await page.setViewportSize(viewport);
				await page.reload();
				await waitForHydration(page, TRIGGER);
				await waitForDashboardContent(page);
				const probe = await polledRead(
					() =>
						page.evaluate(() => ({
							body: document.body.scrollWidth,
							html: document.documentElement.scrollWidth,
							viewport: window.innerWidth,
							mains: document.querySelectorAll("main").length,
							mainContent:
								document.querySelectorAll("main#main-content").length,
						})),
					(value) => value.viewport === viewport.width,
				);
				expect(
					probe.body,
					`body scrollWidth at ${viewport.width}px`,
				).toBeLessThanOrEqual(viewport.width + 1);
				expect(
					probe.html,
					`html scrollWidth at ${viewport.width}px`,
				).toBeLessThanOrEqual(viewport.width + 1);
				expect(probe.mains, `main count at ${viewport.width}px`).toBe(1);
				expect(
					probe.mainContent,
					`main#main-content count at ${viewport.width}px`,
				).toBe(1);
			}

			expect(errors).toEqual([]);
			if (cookie === "false") {
				expect(await ssrSidebarState(page)).toBe("collapsed");
			}
			expect(tour.writes, "user_tour_progress writes answered").toBe(0);
		});
	}
});
