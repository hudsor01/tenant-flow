import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsOwner } from "../../auth-helpers";
import { answerReadsLong, blockWrites } from "../../lib/reflow-states";

/**
 * The /properties table view, WCAG 2.1 A/AA by axe (66.2-39 fix round 4,
 * Part 8h).
 *
 * CI's WCAG axe runs saw /dashboard and the shell only (dashboard-a11y and
 * app-shell-sidebar), and the properties table is a client state no URL
 * names: its select-all and every row's checkbox had no name (a bare
 * "checkbox"; axe button-name, 15 nodes at 320 and 1280), and no check ever
 * rendered it. Here owner A opens /properties, switches to the table view and
 * axe runs over the whole page with owner-axe's tags. Writes are blocked as in
 * the states guard (`blockWrites`) and reads are lengthened
 * (`answerReadsLong`), so the rows carry long names.
 *
 * The full pass, axe over every state the states sweep opens at 320 and 1280,
 * stays in the rendered sweep (Part 8h's `closure-axe-states.tsv`): run in the
 * CI set it would add minutes to a set already near its 11-minute
 * globalTimeout.
 */
const WCAG_2_1_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// The page's entrances (BlurFade) fade the rows in; axe would read their text
// mid-fade. Under reduced motion they rest at frame 0 (as the contrast specs
// measure the public pages), and any that remain are waited out below.
test.use({ reducedMotion: "reduce" });

for (const width of [320, 1280]) {
	test(`the properties table view has zero WCAG 2.1 A/AA violations at ${width}`, async ({
		page,
		context,
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await blockWrites(context);
		await answerReadsLong(context);
		await loginAsOwner(page);
		await page.goto("/properties");
		await page.getByRole("tab", { name: "Switch to table view" }).click();
		// The rows are in: the table's body holds its checkboxes.
		await expect(
			page.locator("main tbody [role=checkbox]").first(),
		).toBeVisible();
		await page.evaluate(() =>
			Promise.all(
				document
					.getAnimations()
					.filter(
						(animation) =>
							animation.effect?.getComputedTiming().iterations !==
							Number.POSITIVE_INFINITY,
					)
					.map((animation) => animation.finished),
			),
		);

		const results = await new AxeBuilder({ page })
			.withTags(WCAG_2_1_AA_TAGS)
			.analyze();
		expect(
			results.violations.map((violation) => ({
				id: violation.id,
				nodes: violation.nodes.map((node) => node.target.join(" ")),
			})),
		).toEqual([]);
		await expect(
			page.getByRole("checkbox", { name: "Select all properties" }),
		).toBeVisible();
		await expect(
			page
				.locator("main tbody")
				.getByRole("checkbox", { name: /^Select / })
				.first(),
		).toBeVisible();
	});
}
