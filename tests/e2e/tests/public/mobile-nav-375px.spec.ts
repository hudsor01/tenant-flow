import { expect, test } from "@playwright/test";
import { boxOf } from "../../lib/measure";

test.describe("Mobile nav at 375px viewport", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test.beforeEach(async ({ page }) => {
		await page.goto("/", { waitUntil: "networkidle" });
		// Wait for the toggle button to be hydrated and laid out before any test
		// runs. This guards against server-rendered-but-not-yet-interactive failure
		// modes observed on Vercel previews where toBeVisible() passes but the
		// element still has no layout box and onClick handlers aren't attached.
		//
		// This was a hand-rolled `waitForFunction` reading `offsetParent !== null &&
		// getBoundingClientRect().width > 0`. It polled correctly — `waitForFunction`
		// re-invokes its predicate — but it was the only remaining place in this
		// tree that derived its own layout gate instead of using the shared one, and
		// the shared one is where the next fix will land. `boxOf` polls for a
		// committed box; `width > 0` is the same floor, asserted rather than folded
		// into a truthiness check that reports "timeout" and nothing else on failure.
		const toggle = await boxOf(page.getByTestId("mobile-nav-toggle"), 10_000);
		expect(toggle.width).toBeGreaterThan(0);
	});

	test("hero does not horizontally overflow viewport", async ({ page }) => {
		const overflow = await page.evaluate(() => ({
			bodyScrollWidth: document.body.scrollWidth,
			htmlScrollWidth: document.documentElement.scrollWidth,
			viewport: window.innerWidth,
		}));
		expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
		expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
	});

	test('"Start free" hero CTA is fully visible', async ({ page }) => {
		// Scope to the hero CTA (first in DOM). The How-It-Works and Premium-CTA
		// sections also render a "Start free — no card" link; before they were
		// gated behind LazySection skeletons, but they now render directly, so an
		// unscoped /Start free/i matches 3 links and trips strict mode.
		const cta = page.getByRole("link", { name: /Start free/i }).first();
		await expect(cta).toBeVisible();
		// Polled, which also retires the two `box!` non-null assertions: `boxOf`
		// returns a `Box`, never `Box | null`, because it does not answer until the
		// browser has committed one.
		const box = await boxOf(cta);
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
	});

	test("hamburger toggle is visible top-right with 44x44 hit target", async ({
		page,
	}) => {
		const toggle = page.getByTestId("mobile-nav-toggle");
		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute("aria-label", "Open navigation menu");

		// Polled for the layout box to materialize, robust against late hydration and
		// browser layout races. Two hand-rolled `expect.poll` reads before; one
		// `boxOf` now, which is the same guarantee from the shared helper and reads
		// the two dimensions from a SINGLE snapshot rather than two — a hit target
		// is a property of one box, not of whatever two boxes happened to exist at
		// two different instants.
		const box = await boxOf(toggle);
		expect(box.width).toBeGreaterThanOrEqual(44);
		expect(box.height).toBeGreaterThanOrEqual(44);
	});

	test("tapping hamburger opens drawer with all 7 items", async ({ page }) => {
		await page.getByTestId("mobile-nav-toggle").click();
		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible();
		await expect(
			drawer.getByRole("link", { name: /^Features$/ }),
		).toBeVisible();
		await expect(drawer.getByRole("link", { name: /^Pricing$/ })).toBeVisible();
		await expect(drawer.getByRole("link", { name: /^Compare$/ })).toBeVisible();
		await expect(drawer.getByRole("link", { name: /^About$/ })).toBeVisible();
		await expect(
			drawer.getByRole("link", { name: /^Resources$/ }),
		).toBeVisible();
		await expect(drawer.getByRole("link", { name: /^Sign In$/ })).toBeVisible();
		await expect(
			drawer.getByRole("link", { name: /Start free/i }),
		).toBeVisible();
	});

	test("tapping Pricing link closes drawer and navigates", async ({ page }) => {
		await page.getByTestId("mobile-nav-toggle").click();
		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible();
		await drawer.getByRole("link", { name: /^Pricing$/ }).click();
		await page.waitForURL("**/pricing");
		await expect(drawer).not.toBeVisible();
	});

	test("Escape key closes the drawer", async ({ page }) => {
		await page.getByTestId("mobile-nav-toggle").click();
		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(drawer).not.toBeVisible();
		// Focus restoration to trigger is a Radix/shadcn concern handled by the
		// Sheet primitive itself. Phase 12 SEO-06 (sitewide aria-current + focus
		// management audit) will assert this; Phase 2 only owns drawer open/close
		// correctness.
	});

	test("clicking close button (X) closes the drawer", async ({ page }) => {
		await page.getByTestId("mobile-nav-toggle").click();
		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible();
		await drawer.getByRole("button", { name: /Close/i }).click();
		await expect(drawer).not.toBeVisible();
	});

	test("clicking outside the drawer closes it", async ({ page }) => {
		await page.getByTestId("mobile-nav-toggle").click();
		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible();
		// Coordinate-only outside-click: at 375px viewport with default SheetContent
		// (right-side drawer, w-3/4 = ~281px wide, left edge at ~94px), x:10 is safely
		// outside the drawer body and falls on the SheetOverlay. No locator needed —
		// avoids fragile [data-state="open"] selectors that match both overlay and content
		// in DOM order that's not guaranteed across Radix versions.
		await page.mouse.click(10, 100);
		await expect(drawer).not.toBeVisible();
	});
});
