import { expect, test } from "@playwright/test";
import {
	type ApplyTokenFixtures,
	ensureApplyTokens,
	readSeedCredentials,
	signInAsOwner,
} from "../../lib/application-fixtures";
import {
	expectReflowStates,
	PUBLIC_REFLOW_ROUTES,
	REFLOW_WIDTH,
} from "../../lib/reflow";
import { blockWrites } from "../../lib/reflow-states";

/**
 * WCAG 1.4.10 Reflow, public pages (66.2-39 fix round 1, part F; fix round 4,
 * Part 8e): no public page, and no state its visible controls open (a menu,
 * a dialog, an accordion), scrolls sideways at 320 CSS px, puts a control
 * past the viewport or runs text past its box. The route list and
 * `expectReflowStates` are in `tests/e2e/lib/reflow.ts`; the owner pages are
 * in `tests/owner-reflow-320.spec.ts`. Every request that is not a read is
 * fulfilled or aborted in the browser (`blockWrites`). The pages whose paths
 * depend on data (a blog post, a blog category, each comparison page) are
 * read from the index that links them, and a live `/apply/<token>` from the
 * application fixtures, which reuse their links and mint only what is
 * missing.
 */
// Reduced motion: an overlay's entrance finishes at once (globals.css), so
// each state reads settled on its first poll.
test.use({
	viewport: { width: REFLOW_WIDTH, height: 800 },
	reducedMotion: "reduce",
});

test.beforeEach(async ({ context }) => {
	await blockWrites(context);
});

for (const path of PUBLIC_REFLOW_ROUTES) {
	test(`${path} and the states its controls open fit ${REFLOW_WIDTH}px`, async ({
		page,
	}) => {
		await expectReflowStates(page, path, { header: path === "/" });
	});
}

test(`a blog post, a blog category and every comparison page fit ${REFLOW_WIDTH}px`, async ({
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
	const category = blogLinks.find((href) => href.startsWith("/blog/category/"));
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
	expect(
		compareLinks.length,
		"the compare index links its pages",
	).toBeGreaterThan(0);
	for (const path of [post, category, ...compareLinks]) {
		if (path) await expectReflowStates(page, path);
	}
});

let fixtures: ApplyTokenFixtures = {
	active: null,
	dead: null,
	reason: "fixture resolution has not run",
};

test.describe("an open application link", () => {
	test.beforeAll(async () => {
		const credentials = readSeedCredentials();
		if (!credentials) {
			fixtures = { active: null, dead: null, reason: "seed env not set" };
			return;
		}
		const client = await signInAsOwner(credentials);
		if (!client) {
			fixtures = { active: null, dead: null, reason: "seed sign-in failed" };
			return;
		}
		fixtures = await ensureApplyTokens(client);
		// Local scope only: a global sign-out would revoke the RLS suite's
		// sessions (see apply-token.spec.ts).
		await client.auth.signOut({ scope: "local" });
	});

	test(`/apply/<token> does not scroll sideways at ${REFLOW_WIDTH}px`, async ({
		page,
	}) => {
		test.skip(!fixtures.active, fixtures.reason ?? "no active link");
		await expectReflowStates(page, `/apply/${fixtures.active?.rawToken}`);
	});
});
