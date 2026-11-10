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
 * theme under test and its entrances had finished.
 *
 * The pages are `PUBLIC_REFLOW_ROUTES` and, as `reflow-320.spec.ts` reads
 * them, the pages whose paths depend on data: one blog post and one blog
 * category the blog index links, and every comparison page the compare index
 * links. The open `/apply/<token>` form needs a seeded link, so only its
 * invalid-token page is here; the rendered sweep measured the form.
 *
 * Each page is measured at rest under reduced motion. Its entrances (BlurFade)
 * are mount-time CSS animations with no in-view trigger, and
 * `motion-reduce:animate-none` renders their resting state at frame 0, so
 * nothing needs waiting out or scrolling into view. Measured on every page
 * here in both themes (66.2-39 fix round 4, Part 7): the same violations,
 * passes (2,512 light, 2,507 dark, each with its ratio) and incomplete nodes
 * as with motion on after scrolling each page through, in a tenth of the
 * time (10 s against 103 s for the light pages). That scroll-through cost
 * about 4 minutes of CI time, past the 9-minute globalTimeout e2e-smoke
 * then had.
 *
 * Text inside an `aria-hidden` subtree is left out, and on these pages all of
 * it is decoration, which 1.4.3 exempts: the separators between links and
 * dates (`-`, `·`), the how-it-works step numerals, the /features cards'
 * preview art, and the native `<select>` Radix keeps clipped to 1px for
 * forms (measured on every page here at 1280 and 390, 66.2-39 fix round 4,
 * Part 7).
 *
 * Only `violations` fail. axe's `incomplete` list holds the nodes it could not
 * measure, never a measured failure: text over a gradient, over an image or
 * another element, or beside a pseudo-element, 1 to 24 nodes on 15 of the 30
 * pages (Part 7's count), so an empty-list check would fail on those pages
 * every run. Those pairs are measured by the rendered sweep, and the tinted
 * stacks by the unit guard `state-fill-contrast.test.ts`. axe has no rule for
 * WCAG 1.4.11 (control boundaries, focus indicators); that guard holds those,
 * and the open, hover, focus and validation states stay with the rendered
 * sweep.
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

/** The page at `path` in `theme`, hydrated and at rest, has no axe color-contrast violation. */
async function expectReadableText(
	page: Page,
	path: string,
	theme: "light" | "dark",
): Promise<void> {
	await page.goto(path);
	await settle(page);
	await expect
		.poll(() =>
			page.evaluate(() => document.documentElement.classList.contains("dark")),
		)
		.toBe(theme === "dark");
	const { violations } = await new AxeBuilder({ page })
		.withRules(["color-contrast"])
		.exclude('[aria-hidden="true"]')
		.analyze();
	expect(
		violations.flatMap((rule) =>
			rule.nodes.map(
				(node) =>
					`${path}: ${node.target.join(" ")}: ${node.any[0]?.message ?? rule.help}`,
			),
		),
	).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
	test.describe(`text contrast (${theme})`, () => {
		test.use({ colorScheme: theme, reducedMotion: "reduce" });

		test.beforeEach(async ({ page }) => {
			await page.addInitScript(
				([key, value]) => {
					try {
						localStorage.setItem(key, value);
					} catch {}
				},
				[THEME_KEY, theme] as const,
			);
		});

		for (const path of PUBLIC_REFLOW_ROUTES) {
			test(`${path} has no text under 4.5:1 (${theme})`, async ({ page }) => {
				await expectReadableText(page, path, theme);
			});
		}

		test(`a blog post, a blog category and every comparison page have no text under 4.5:1 (${theme})`, async ({
			page,
		}) => {
			test.setTimeout(120_000);
			await page.goto("/blog");
			const postLinks = page.locator("main a[href^='/blog/']");
			await expect
				.poll(() => postLinks.count(), { timeout: 15_000 })
				.toBeGreaterThan(0);
			const blogLinks = await postLinks.evaluateAll((links) =>
				links.map((a) => a.getAttribute("href") ?? ""),
			);
			const post = blogLinks.find(
				(href) =>
					!href.startsWith("/blog/category/") && href.split("/").length === 3,
			);
			const category = blogLinks.find((href) =>
				href.startsWith("/blog/category/"),
			);
			await page.goto("/compare");
			const comparePages = page.locator("main a[href^='/compare/']");
			await expect
				.poll(() => comparePages.count(), { timeout: 15_000 })
				.toBeGreaterThan(0);
			const compareLinks = await comparePages.evaluateAll((links) => [
				...new Set(links.map((a) => a.getAttribute("href") ?? "")),
			]);
			expect(post, "the blog index links a post").toBeTruthy();
			expect(category, "the blog index links a category").toBeTruthy();
			for (const path of [post, category, ...compareLinks]) {
				if (path) await expectReadableText(page, path, theme);
			}
		});
	});
}
