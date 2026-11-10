import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoAuthedDashboard } from "../../lib/authed-dashboard";
import { boxOf } from "../../lib/measure";

/**
 * Dashboard Accessibility + Responsiveness E2E (Phase 6, POLISH-05 / POLISH-06)
 *
 * Runs under the dedicated `owner-axe` Playwright project (NO storageState),
 * which CI invokes via `--project=owner-axe`. Authentication is performed
 * in-test by `loginAsOwner`, which injects the `@supabase/ssr` session as
 * cookies onto the fresh per-test context before the first navigation. The
 * legacy `setup-owner` + storageState project path is intentionally NOT used
 * here. The file is excluded from the storageState-based `owner` / `firefox` /
 * `mobile-chrome` projects via their `testIgnore`.
 *
 * 1. axe-core WCAG 2.1 A/AA assertion (D-02): zero violations across the
 *    ENTIRE /dashboard subtree (D-03 — full-page sweep incl. app-shell chrome,
 *    not just the v2.0-added regions). Served by a local production build; auth
 *    and data still hit the prod Supabase project (no screenshot diffing).
 *    axe's `incomplete` list is not asserted: it holds the pairs axe could not
 *    measure, here the chart axes' tick text inside each Recharts SVG and the
 *    command palette's shortcut glyph (16 nodes, how many ticks depending on
 *    owner A's data; 66.2-39 fix round 4, Part 7), never a measured failure.
 * 2. Chart focus indicator (WCAG 2.4.7): a Recharts surface reached by Tab
 *    draws a 2px solid outline in the ring color, inset by its own width so an
 *    overflow-hidden card cannot clip it. axe has no rule for a missing focus
 *    indicator, so the computed outline is read.
 * 3. 375px page-level zero-horizontal-scroll probe (POLISH-06): body and html
 *    scrollWidth <= viewport + 1. The locked FORCE_GRID_QUERY (max-width:1023px)
 *    in portfolio-data-table.tsx forces the portfolio table into grid mode below
 *    1024px, which satisfies this.
 *
 * Auth/beforeEach: `gotoAuthedDashboard` (`lib/authed-dashboard.ts`) lands on
 * an authenticated /dashboard, marks the onboarding tour completed so its
 * overlay never masks focusable elements from axe, reloads, waits for the
 * loaded marker, and waits out the BlurFade entrances so axe measures the
 * resting state (this file runs with motion enabled).
 */

const WCAG_2_1_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Dashboard accessibility (axe-core)", () => {
	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("has zero WCAG 2.1 A/AA violations", async ({ page }) => {
		// D-03: full-page sweep over the entire /dashboard subtree (v2.0 regions +
		// older surfaces + app-shell chrome). Every violation inside the dashboard
		// subtree must be fixed inline in its owning file — none are excluded here.
		const results = await new AxeBuilder({ page })
			.withTags(WCAG_2_1_AA_TAGS)
			.analyze();

		expect(results.violations).toEqual([]);
	});
});

test.describe("Dashboard chart focus indicator (WCAG 2.4.7)", () => {
	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("a chart surface focused by Tab draws a visible ring-colored outline", async ({
		page,
	}) => {
		// Recharts' accessibility layer makes every surface a tab stop. axe has no
		// rule for a missing focus indicator, so this reads the computed outline.
		const surface = page
			.locator('[data-slot="chart"] .recharts-surface[tabindex="0"]')
			.first();
		await expect(surface).toBeAttached({ timeout: 20000 });
		await surface.evaluate((node) => {
			const tabbable = Array.from(
				document.querySelectorAll<HTMLElement | SVGElement>(
					'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
				),
			).filter(
				(element) =>
					element.tabIndex >= 0 &&
					element.getClientRects().length > 0 &&
					element.closest("[inert]") === null,
			);
			const previous = tabbable[tabbable.indexOf(node as SVGElement) - 1];
			if (previous === undefined) {
				throw new Error("no tabbable element precedes the chart surface");
			}
			previous.focus({ preventScroll: true });
		});
		await page.keyboard.press("Tab");
		await expect(surface).toBeFocused();

		const ring = await page.evaluate(() => {
			const probe = document.createElement("span");
			probe.style.color = "var(--color-ring)";
			document.body.appendChild(probe);
			const value = getComputedStyle(probe).color;
			probe.remove();
			return value;
		});
		// Positive control: the surface has a laid-out box to draw around.
		expect((await boxOf(surface)).height).toBeGreaterThan(0);
		const outline = await surface.evaluate((node) => {
			const style = getComputedStyle(node);
			return {
				focusVisible: node.matches(":focus-visible"),
				style: style.outlineStyle,
				width: style.outlineWidth,
				color: style.outlineColor,
				offset: style.outlineOffset,
			};
		});
		expect(outline.focusVisible).toBe(true);
		expect(outline.style).toBe("solid");
		expect(outline.width).toBe("2px");
		expect(outline.color).toBe(ring);
		// Inset by its own width, so an overflow-hidden card cannot clip it.
		expect(outline.offset).toBe("-2px");
	});
});

test.describe("Dashboard responsiveness (375px)", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test.beforeEach(async ({ page }) => {
		await gotoAuthedDashboard(page);
	});

	test("has zero page-level horizontal scroll at 375px", async ({ page }) => {
		// POLISH-06: page-level zero horizontal scroll. The portfolio table is
		// forced to grid mode below 1024px (locked FORCE_GRID_QUERY), and the
		// virtualized table — if present — lives inside overflow-auto, so any
		// internal scroll does not leak to the page. Allow +1px for sub-pixel
		// rounding (same tolerance as the public mobile-nav-375px probe).
		const overflow = await page.evaluate(() => ({
			bodyScrollWidth: document.body.scrollWidth,
			htmlScrollWidth: document.documentElement.scrollWidth,
			viewport: window.innerWidth,
		}));

		expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
		expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
	});
});
