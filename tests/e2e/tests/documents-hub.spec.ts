import { expect, type Locator, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../auth-helpers";
import { widthOf } from "../lib/measure";
import { ROUTES } from "./constants/routes";

/**
 * Documents landing E2E smoke (Phase 65 — DOCS-01, SC-1/2/3).
 *
 * WHY THIS FILE EXISTS. Phase 65 shipped `/documents` as a real landing page and
 * every check on it was either a unit test over source, or a one-off harness that
 * was deliberately not committed (`65-HUMAN-UAT.md` test 2 records that: "the
 * harness was throwaway and is NOT committed, so this measurement is not
 * re-runnable"). Nothing asserted the RENDERED page, and nothing ever would
 * again. `/documents` also sits behind the proxy auth + subscription gate, so an
 * unauthenticated probe only ever observes `307 -> /login` and can say nothing
 * about the page itself.
 *
 * Runs under the `owner-axe` project (explicit filename allowlist in
 * playwright.config.ts), which CI invokes via `--project=owner-axe` in the
 * `e2e-smoke` job. Authentication is in-test via `loginAsOwner` with NO
 * storageState — same pattern as notifications.spec.ts and reports-hub.spec.ts.
 * A spec that only matched the storageState `chromium` project would pass
 * locally and never gate the PR, because CI does not run that project.
 *
 * This deliberately targets the LOCAL built app, not https://tenantflow.app.
 * Vercel builds `main` only, so on a PR the production URL serves the PREVIOUS
 * commit — a prod-targeted assertion would gate nothing by construction, and
 * would fail for reasons outside the diff into a suite with `maxFailures: 1`.
 *
 * WHAT IS ASSERTED, and why it is not already covered by unit tests: measured
 * geometry. The medallion ladder and the Band 3 column collapse are computed
 * layout, which jsdom cannot produce at all — the unit suite can only pin class
 * strings. These assertions read `getBoundingClientRect()` from a real engine.
 */

/**
 * SIX hub entries but FIVE tiles. Band 1's vault entry is NOT a tile — it renders
 * as an `<h2>` plus the page's only filled primary Button (`page.tsx:82-120`),
 * with its own `size-12` medallion `<div>`. Asserting six tiles fails.
 */
const BUILD_TILE = "Lease Template Builder";
const PRINTABLE_TILES = [
	"Rental Application",
	"Property Inspection",
	"Maintenance Request",
	"Tenant Notice",
];

/** Section landmark ids — `documents-hub-entries.ts:56,62,68`. */
const VAULT = "documents-vault";
const BUILD = "documents-build";
const PRINTABLES = "documents-printables";

/**
 * Scope every query to the shell's main landmark (`app-shell.tsx:308-309`). The
 * sidebar contains its own "Documents" nav entry, so an unscoped getByRole would
 * happily satisfy itself against navigation chrome.
 */
function main(page: Page): Locator {
	return page.locator("main#main-content");
}

function band(page: Page, headingId: string): Locator {
	return main(page).locator(`section[aria-labelledby="${headingId}"]`);
}

/**
 * A band's medallion, located structurally rather than by class.
 *
 * Every medallion is the parent of that band's FIRST `aria-hidden` glyph — for
 * Band 1 the `size-12` div at `page.tsx:87`, for a tile the `size-10`/`size-8`
 * div at `document-hub-tile.tsx:57-62`. `.first()` matters on tiles: they also
 * render a trailing `ArrowRight`, which appears later in DOM order.
 *
 * Deliberately NOT `.size-12` etc. — asserting the rendered WIDTH of a
 * class-agnostic selector is what makes this a layout test. Selecting by the
 * same class we then assert would be circular.
 */
function medallion(root: Locator): Locator {
	return root.locator('svg[aria-hidden="true"]').first().locator("xpath=..");
}

/**
 * Measurement is delegated to `tests/e2e/lib/measure.ts`, which polls until the
 * browser has committed a layout box.
 *
 * The local version of this helper took a single, non-retrying `boundingBox()`
 * and threw "element has no bounding box (not rendered)" on `null`. That is what
 * failed on `main` from 2026-08-05 onward — 3/3 attempts, not a flake — because
 * the medallion test is the only test in this file that measures straight out of
 * `beforeEach` with no `toBeVisible()` wait, while every other test here waits up
 * to 15s first. The element was never missing; the read was simply too early.
 */

test.describe("Documents landing (Phase 65, DOCS-01)", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page);
		await page.goto(ROUTES.DOCUMENTS);
	});

	test("renders the landing for an authenticated owner, not a redirect", async ({
		page,
	}) => {
		// SC-1: the permanentRedirect is gone. Pre-65 this URL 308'd to the vault.
		expect(page.url()).not.toContain("/login");
		expect(page.url()).not.toContain("/documents/vault");
		await expect(
			main(page).getByRole("heading", { level: 1, name: "Documents" }),
		).toBeVisible({ timeout: 15000 });

		for (const id of [VAULT, BUILD, PRINTABLES]) {
			await expect(band(page, id)).toBeVisible();
		}
	});

	test("offers the vault CTA and every tile entry point", async ({ page }) => {
		// SC-2: /documents/vault stays canonical and the landing links to it.
		const cta = band(page, VAULT).getByRole("link", { name: "Open the vault" });
		await expect(cta).toBeVisible();
		await expect(cta).toHaveAttribute("href", "/documents/vault");

		await expect(
			band(page, BUILD).getByRole("link", { name: new RegExp(BUILD_TILE) }),
		).toBeVisible();

		for (const title of PRINTABLE_TILES) {
			await expect(
				band(page, PRINTABLES).getByRole("link", { name: new RegExp(title) }),
			).toBeVisible();
		}

		// Deliberately NOT a total link count: the recent-documents panel renders a
		// second /documents/vault link ("View all documents") only when the owner
		// has documents, so a count assertion would be data-dependent.
	});

	test("medallion ladder descends 48 -> 40 -> 32 as measured", async ({
		page,
	}) => {
		// 65-UI-SPEC §I-1: size-12 -> size-10 -> size-8. This is the assertion the
		// unit suite structurally cannot make — jsdom computes no layout, so it can
		// only check that the class string is present, not that it takes effect.
		const vault = await widthOf(medallion(band(page, VAULT)));
		const build = await widthOf(medallion(band(page, BUILD)));
		const printable = await widthOf(medallion(band(page, PRINTABLES)));

		expect(vault).toBeCloseTo(48, 0);
		expect(build).toBeCloseTo(40, 0);
		expect(printable).toBeCloseTo(32, 0);

		// The ladder is the point, not the absolute numbers: weight must descend.
		expect(vault).toBeGreaterThan(build);
		expect(build).toBeGreaterThan(printable);
	});

	test("band 3 lays out four tiles in one row at desktop", async ({ page }) => {
		// lg:grid-cols-4 (>=1024px). Row occupancy is derived from distinct y
		// positions rather than reading gridTemplateColumns, so it measures what the
		// user sees even if the implementation stops using CSS grid.
		await page.setViewportSize({ width: 1280, height: 900 });
		expect(await distinctRowCount(page)).toBe(1);
	});

	test("band 3 collapses to two rows at the sm breakpoint", async ({
		page,
	}) => {
		// sm:grid-cols-2 applies from 640px; lg (1024px) does not at 900px.
		await page.setViewportSize({ width: 900, height: 900 });
		expect(await distinctRowCount(page)).toBe(2);
	});
});

/** Distinct y-positions of the four printable tiles == number of rendered rows. */
async function distinctRowCount(page: Page): Promise<number> {
	const tiles = band(page, PRINTABLES).getByRole("link");
	await expect(tiles.first()).toBeVisible();
	const boxes = await tiles.evaluateAll((nodes) =>
		nodes.map((n) => Math.round(n.getBoundingClientRect().y)),
	);
	// Tolerate sub-pixel drift: bucket to the nearest 2px before de-duplicating.
	return new Set(boxes.map((y) => Math.round(y / 2))).size;
}

test.describe("Documents landing at 375px", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page);
		await page.goto(ROUTES.DOCUMENTS);
		await expect(
			main(page).getByRole("heading", { level: 1, name: "Documents" }),
		).toBeVisible({ timeout: 15000 });
	});

	test("stacks band 3 to a single column", async ({ page }) => {
		expect(await distinctRowCount(page)).toBe(4);
	});

	test("does not scroll horizontally", async ({ page }) => {
		// The failure this guards is real: an inert `truncate` on the row title let
		// a ~100-char storage path (rendered whenever `documents.title` is null)
		// overflow the card and scroll the whole page sideways. Caught pre-merge by
		// the perfect-PR gate; this keeps it caught.
		const overflow = await page.evaluate(() => ({
			bodyScrollWidth: document.body.scrollWidth,
			htmlScrollWidth: document.documentElement.scrollWidth,
			viewport: window.innerWidth,
		}));
		expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
		expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1);
	});
});

test.describe("Recent-documents panel (D-03, D-04)", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page);
		await page.goto(ROUTES.DOCUMENTS);
	});

	test("never blocks the vault CTA and settles into a known state", async ({
		page,
	}) => {
		// The CTA is server-rendered and must be usable before the client island
		// resolves — that is why the panel is an island rather than blocking the page.
		await expect(
			band(page, VAULT).getByRole("link", { name: "Open the vault" }),
		).toBeVisible({ timeout: 15000 });
		await expect(band(page, VAULT).getByText("Recently added")).toBeVisible();

		// Data-independent: a fresh owner sees the empty state, a seeded one sees
		// rows. Either is correct; a hang or an error state is not.
		const rows = band(page, VAULT).locator("ul li");
		const empty = band(page, VAULT).locator('[data-slot="empty-title"]');
		await expect(rows.first().or(empty)).toBeVisible({ timeout: 20000 });
	});

	test("renders recent rows as non-interactive previews (D-03)", async ({
		page,
	}) => {
		const rows = band(page, VAULT).locator("ul li");
		const empty = band(page, VAULT).locator('[data-slot="empty-title"]');
		await expect(rows.first().or(empty)).toBeVisible({ timeout: 20000 });

		if ((await rows.count()) === 0) {
			test.skip(true, "owner has no documents — nothing to assert about rows");
		}

		// D-03: the shared cache entry carries live signed URLs for up to 50
		// documents. Rows deliberately render no link, button or href so the landing
		// adds no second file-access path competing with the vault's.
		await expect(band(page, VAULT).locator("ul li a")).toHaveCount(0);
		await expect(band(page, VAULT).locator("ul li button")).toHaveCount(0);
		await expect(band(page, VAULT).locator("ul li [href]")).toHaveCount(0);
	});
});
