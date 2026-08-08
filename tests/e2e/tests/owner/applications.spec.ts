import { expect, type Locator, type Page, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loginAsOwner } from "../../auth-helpers";
import {
	type ApplyTokenFixtures,
	ensureApplication,
	ensureApplyTokens,
	readSeedCredentials,
	removeSeededApplication,
	type SeededApplication,
	signInAsOwner,
} from "../../lib/application-fixtures";

/**
 * `/applications` and `/applications/[id]` in a real browser — Phase 66, plan
 * 66-17, UI-SPEC §E rows E-17 through E-21.
 *
 * E-17, E-18 AND E-20 EXIST BECAUSE PHASE 65 SHIPPED THE EXACT DEFECTS THEY
 * DETECT, and all three are computed-style or geometric assertions rather than
 * class checks for precisely that reason:
 *   - E-18 catches the unscoped base rule
 *     `a:not([role="button"]):not(.button):not([class*="button"])`
 *     (`globals.css:504`) tinting a whole-row link accent-blue and drawing a
 *     hover underline across it. Phase 65 shipped that. A test asserting
 *     `no-underline text-foreground` are PRESENT passes against the broken build
 *     too, because the classes were present there as well — the question is only
 *     ever whether they won the cascade.
 *   - E-20 catches the unscoped `ul, ol { padding-left: 1.5rem }` and
 *     `li { margin-bottom: 0.25rem }` at `globals.css:517-524`. Asserting `pl-0`
 *     and `[&>li]:mb-0` are in the class string cannot tell you whether they beat
 *     a base rule; reading the computed value can.
 *   - E-17's non-overlap check is what catches a collapsed `gap` or a flattened
 *     list rung, which a minimum-height assertion alone would not.
 *
 * IT RUNS UNDER `owner-axe`, NOT `owner`, AND THAT IS LOAD-BEARING. CI's
 * `e2e-smoke` job invokes `--project=smoke --project=public --project=owner-axe`.
 * The `owner` / `firefox` / `mobile-chrome` projects consume a storageState this
 * repo's CI never produces (`setup-owner` is not in that project list), so a spec
 * that only matched them would pass locally and gate NOTHING on a PR — the same
 * failure Phase 65's `documents-hub.spec.ts` header records. Authentication is
 * therefore in-test via `loginAsOwner`, with no storageState, and
 * `playwright.config.ts` carries this filename in the `owner-axe` allowlist and
 * in the other three projects' testIgnore so it executes exactly once.
 *
 * SEEDING WRITES TO PRODUCTION AND IS REUSE-FIRST. See
 * `lib/application-fixtures.ts`. An application row IS deletable by its owner, so
 * one submitted here is removed in `afterAll` together with the owner
 * notification the RPC raises; a row that already existed is reused and left
 * alone, because it belongs to the account rather than to this suite. Link rows
 * are never deleted because no DELETE policy exists for any role.
 *
 * Serial mode guarantees one sign-in and one seed rather than one per worker.
 */
test.describe.configure({ mode: "serial" });

/**
 * The queue's rows: `Item asChild` renders the whole row as the `<a>` (§B-3).
 *
 * Scoped through the tab panel rather than the page, because `/applications`
 * mounts a SECOND `<ul>` in the links band and an unscoped `ul` selector would
 * happily measure that one instead. `[role="tabpanel"]` is Radix's own rendered
 * role — the primitive carries no `data-slot`, so this is the structural handle.
 */
const QUEUE_ROWS = '[role="tabpanel"] ul > li > a';
const QUEUE_LIST = '[role="tabpanel"] ul';

let seedClient: SupabaseClient | null = null;
let fixtures: ApplyTokenFixtures = {
	active: null,
	dead: null,
	reason: "fixture resolution has not run",
};
let application: SeededApplication | null = null;
let applicationReason: string | null = "fixture resolution has not run";

test.beforeAll(async () => {
	const credentials = readSeedCredentials();
	if (!credentials) {
		applicationReason = "E2E_OWNER_PASSWORD / Supabase env not set";
		fixtures = { active: null, dead: null, reason: applicationReason };
		return;
	}
	seedClient = await signInAsOwner(credentials);
	if (!seedClient) {
		applicationReason =
			"could not sign the synthetic owner in over the REST API";
		fixtures = { active: null, dead: null, reason: applicationReason };
		return;
	}
	fixtures = await ensureApplyTokens(seedClient);
	if (!fixtures.active) {
		applicationReason = fixtures.reason;
		return;
	}
	const result = await ensureApplication(
		seedClient,
		credentials.url,
		fixtures.active.rawToken,
	);
	application = result.application;
	applicationReason = result.reason;
});

test.afterAll(async () => {
	if (seedClient) {
		// Removes ONLY a row this run submitted. A reused row is left in place.
		await removeSeededApplication(seedClient, application);
		await seedClient.auth.signOut();
	}
});

async function openQueue(page: Page, width: number) {
	await page.setViewportSize({ width, height: 900 });
	await loginAsOwner(page);
	await page.goto("/applications");
	await expect(
		page.getByRole("heading", { level: 1, name: "Applications" }),
	).toBeVisible({ timeout: 20000 });
}

/**
 * Resolve a CSS custom property through the SAME pipeline the element under test
 * uses, by rendering a throwaway probe and reading ITS computed colour.
 *
 * Reading `--color-foreground` off the document element returns the raw token
 * text (`oklch(0.2 0.02 245)`), which is not guaranteed to be the serialization
 * `getComputedStyle(...).color` produces for the same value. Comparing against a
 * hard-coded hex would be worse still: it would break on any theme change and
 * would prove nothing about the cascade this row is actually subject to.
 */
async function resolveToken(page: Page, token: string): Promise<string> {
	return page.evaluate((customProperty) => {
		const probe = document.createElement("span");
		probe.style.color = `var(${customProperty})`;
		document.body.appendChild(probe);
		const value = getComputedStyle(probe).color;
		probe.remove();
		return value;
	}, token);
}

function rowLink(page: Page): Locator {
	return page.locator(QUEUE_ROWS).first();
}

test.describe("/applications — the owner review queue", () => {
	test("E-17: rows are at least 64px tall and never overlap at 375px", async ({
		page,
	}) => {
		test.skip(
			application === null,
			`no application fixture: ${applicationReason ?? "unknown"}`,
		);
		await openQueue(page, 375);
		const rows = page.locator(QUEUE_ROWS);
		await expect(rows.first()).toBeVisible({ timeout: 20000 });

		const boxes = await rows.evaluateAll((nodes) =>
			nodes.map((node) => {
				const rect = node.getBoundingClientRect();
				return { y: rect.y, height: rect.height };
			}),
		);
		// Positive control: an empty list satisfies both loops below vacuously.
		expect(boxes.length).toBeGreaterThan(0);

		for (const box of boxes) {
			expect(Math.round(box.height)).toBeGreaterThanOrEqual(64);
		}
		// The non-overlap half is what catches a collapsed gap or a flattened list
		// rung; a height-only assertion passes while every row sits on top of the
		// last one.
		for (let index = 1; index < boxes.length; index += 1) {
			const previous = boxes[index - 1];
			const current = boxes[index];
			if (!previous || !current) continue;
			expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
		}
	});

	test("E-18: a queue row is undecorated and foreground-coloured at 1280px", async ({
		page,
	}) => {
		test.skip(
			application === null,
			`no application fixture: ${applicationReason ?? "unknown"}`,
		);
		await openQueue(page, 1280);
		const link = rowLink(page);
		await expect(link).toBeVisible({ timeout: 20000 });

		const computed = await link.evaluate((node) => {
			const style = getComputedStyle(node);
			return { decoration: style.textDecorationLine, color: style.color };
		});
		expect(computed.decoration).toBe("none");

		const foreground = await resolveToken(page, "--color-foreground");
		const primary = await resolveToken(page, "--color-primary");
		// Positive control on the probe itself: if the two tokens resolved to the
		// same string the colour assertion below could not distinguish the tinted
		// row from the correct one, and would pass against the Phase 65 defect.
		expect(foreground).not.toBe(primary);
		expect(computed.color).toBe(foreground);
	});

	test("E-20: the queue list defeats the unscoped ul/li base rules at 1280px", async ({
		page,
	}) => {
		test.skip(
			application === null,
			`no application fixture: ${applicationReason ?? "unknown"}`,
		);
		await openQueue(page, 1280);
		await expect(rowLink(page)).toBeVisible({ timeout: 20000 });

		const computed = await page.locator(QUEUE_LIST).evaluate((node) => {
			const list = getComputedStyle(node);
			const item = node.firstElementChild;
			return {
				paddingLeft: list.paddingLeft,
				marginTop: list.marginTop,
				itemTag: item ? item.tagName.toLowerCase() : null,
				itemMarginBottom: item ? getComputedStyle(item).marginBottom : null,
			};
		});
		// Positive control: without it a list whose first child is missing would
		// report `null` and the margin assertion would need to accept it.
		expect(computed.itemTag).toBe("li");
		expect(computed.paddingLeft).toBe("0px");
		expect(computed.marginTop).toBe("0px");
		expect(computed.itemMarginBottom).toBe("0px");
	});

	/**
	 * E-22: the status tab strip scrolls, the PAGE does not.
	 *
	 * `overflow-x-auto scrollbar-hide` shipped on `TabsList` and was inert.
	 * `TabsList`'s own base carries `w-fit` and the overflow utilities are in a
	 * different tailwind-merge group, so the box kept `width: fit-content` and
	 * could never be narrower than its five `whitespace-nowrap` triggers: at 375px
	 * it grew past its container and the DOCUMENT scrolled sideways while the
	 * strip itself never moved.
	 *
	 * A class assertion cannot decide this — the classes were present in the
	 * broken build too, which is the whole §D lesson. Only the measurement can.
	 */
	test("E-22: the status tabs scroll in place at 375px, and the page does not", async ({
		page,
	}) => {
		test.skip(
			application === null,
			`no application fixture: ${applicationReason ?? "unknown"}`,
		);
		await openQueue(page, 375);

		const strip = page.getByRole("tablist", { name: "Filter by status" });
		await expect(strip).toBeVisible({ timeout: 20000 });

		const measured = await strip.evaluate((node) => {
			const parent = node.parentElement;
			return {
				triggers: node.querySelectorAll('[role="tab"]').length,
				scrollWidth: node.scrollWidth,
				clientWidth: node.clientWidth,
				parentWidth: parent ? parent.getBoundingClientRect().width : 0,
				documentScrollWidth: document.documentElement.scrollWidth,
				viewport: window.innerWidth,
			};
		});

		// Positive controls FIRST. All five tabs must be mounted and their combined
		// width must genuinely exceed the viewport, or the two assertions below are
		// satisfied by a strip that had nothing to overflow.
		expect(measured.triggers).toBe(5);
		expect(measured.scrollWidth).toBeGreaterThan(measured.clientWidth);

		// The box is capped by its container rather than growing past it...
		expect(measured.clientWidth).toBeLessThanOrEqual(
			Math.ceil(measured.parentWidth),
		);
		// ...so the overflow is absorbed by the strip and never by the document.
		// One pixel of slack for sub-pixel rounding, and no more.
		expect(measured.documentScrollWidth).toBeLessThanOrEqual(
			measured.viewport + 1,
		);
	});

	test("E-19: the link URL survives a reload and is re-copyable (D-03a)", async ({
		page,
	}) => {
		test.skip(
			fixtures.active === null,
			`no active link fixture: ${fixtures.reason ?? "unknown"}`,
		);
		await openQueue(page, 1280);

		// The panel's readonly field is the only input in the links band carrying an
		// `Application link for …` accessible name (§C).
		const urlField = page.locator("#application-links input[readonly]").first();
		await expect(urlField).toBeVisible({ timeout: 20000 });
		const first = await urlField.inputValue();
		expect(first.length).toBeGreaterThan(0);
		expect(first).toContain("/apply/");

		// The assertion a shown-once implementation fails. `/sign` stores only the
		// token hash and reveals it once; this token is PUBLISHED to a listing and
		// has to be retrievable for the life of the link, so the value must be
		// identical on a genuinely separate page load — not merely re-rendered
		// inside the same one.
		await page.reload();
		await expect(
			page.getByRole("heading", { level: 1, name: "Applications" }),
		).toBeVisible({ timeout: 20000 });
		const reloaded = page.locator("#application-links input[readonly]").first();
		await expect(reloaded).toBeVisible({ timeout: 20000 });
		expect(await reloaded.inputValue()).toBe(first);
	});
});

test.describe("/applications/[id] — the conversion href", () => {
	test("E-21: the conversion link carries the id and no other parameter", async ({
		page,
	}) => {
		test.skip(
			application === null,
			`no application fixture: ${applicationReason ?? "unknown"}`,
		);
		const seeded = application;
		if (!seeded) return;

		await page.setViewportSize({ width: 1280, height: 900 });
		await loginAsOwner(page);
		await page.goto(`/applications/${seeded.id}`);

		const link = page.locator('a[href^="/tenants/new"]');
		// Positive control: an anchored regex over a href that does not exist would
		// otherwise be asserted against `null`.
		await expect(link).toHaveCount(1);
		const href = await link.getAttribute("href");

		// Anchored, INCLUDING the `$`. Applicant PII appended as a second query
		// parameter lands in Vercel access logs, browser history and the
		// destination's outbound `Referer` header — three durable stores the
		// anonymize sweep cannot reach (T-66-11). The trailing anchor is what makes
		// any appended parameter a failure.
		expect(href).toMatch(/^\/tenants\/new\?application=[0-9a-f-]{36}$/);
		expect(href).toBe(`/tenants/new?application=${seeded.id}`);
	});
});
