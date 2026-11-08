import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { PUBLIC_REFLOW_ROUTES } from "../../lib/reflow";

/**
 * WCAG 1.4.3 on every public page, light and dark (66.2-39 fix round 4, Part
 * 5b). CI's only axe runs were /dashboard and the shell, in light, at rest, so
 * no axe run ever saw the text the F1 rendered sweep read under 4.5:1 on the
 * public pages. Run here on the pre-fix build, axe's `color-contrast` rule
 * failed /, /features, /login and the tax worksheet in light and / in dark:
 * the /login trust strip (3.21:1), the worksheet's category totals (3.78:1)
 * and the faded CTA lines on /features (3.78:1), once the page was in the
 * theme under test and its in-view entrances had painted.
 *
 * Text inside an `aria-hidden` subtree is decoration (the how-it-works step
 * numbers, the feature cards' preview art), which 1.4.3 exempts, so it is left
 * out; axe itself measures it.
 *
 * axe has no rule for WCAG 1.4.11 (control boundaries, focus indicators); the
 * unit guard `state-fill-contrast.test.ts` holds those, and the open, hover,
 * focus and validation states stay with the rendered sweep.
 */
const THEME_KEY = "tenantflow-theme-mode";

async function settle(page: Page): Promise<void> {
	await expect
		.poll(
			() =>
				page
					.locator("main")
					.first()
					.evaluate((node) =>
						Object.keys(node).some((key) => key.startsWith("__react")),
					),
			{ timeout: 20_000 },
		)
		.toBe(true);
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						document
							.getAnimations()
							.filter(
								(a) =>
									a.playState === "running" &&
									Number.isFinite(
										Number(a.effect?.getComputedTiming().endTime),
									),
							).length,
				),
			{ timeout: 10_000 },
		)
		.toBe(0);
}

/** Scroll the page through once so each in-view entrance paints its text. */
async function revealAll(page: Page): Promise<void> {
	const height = await page.evaluate(
		() => document.documentElement.scrollHeight,
	);
	const step = Math.max(
		200,
		Math.floor((page.viewportSize()?.height ?? 720) * 0.8),
	);
	for (let y = step; y < height; y += step) {
		await page.evaluate((top) => window.scrollTo(0, top), y);
		await settle(page);
	}
	await page.evaluate(() => window.scrollTo(0, 0));
	await settle(page);
}

for (const theme of ["light", "dark"] as const) {
	test.describe(`text contrast (${theme})`, () => {
		test.use({ colorScheme: theme });

		for (const path of PUBLIC_REFLOW_ROUTES) {
			test(`${path} has no text under 4.5:1 (${theme})`, async ({ page }) => {
				await page.addInitScript(
					([key, value]) => {
						try {
							localStorage.setItem(key, value);
						} catch {}
					},
					[THEME_KEY, theme] as const,
				);
				await page.goto(path);
				await settle(page);
				await expect
					.poll(() =>
						page.evaluate(() =>
							document.documentElement.classList.contains("dark"),
						),
					)
					.toBe(theme === "dark");
				await revealAll(page);
				const { violations } = await new AxeBuilder({ page })
					.withRules(["color-contrast"])
					.exclude('[aria-hidden="true"]')
					.analyze();
				expect(
					violations.flatMap((rule) =>
						rule.nodes.map(
							(node) =>
								`${node.target.join(" ")}: ${node.any[0]?.message ?? rule.help}`,
						),
					),
				).toEqual([]);
			});
		}
	});
}
