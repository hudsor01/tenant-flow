import { expect, type Locator, type Page, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	type ApplyTokenFixtures,
	ensureApplyTokens,
	readSeedCredentials,
	signInAsOwner,
} from "../../lib/application-fixtures";

/**
 * `/apply/[token]` in a real browser — Phase 66, plan 66-17, UI-SPEC §E rows
 * E-1 through E-16.
 *
 * SIX OF THESE ARE REQUIREMENT-LEVEL AND NON-OPTIONAL: E-1 (APPLY-06), E-6 and
 * E-7 (APPLY-02), E-8 (APPLY-02), E-9 and E-10 (APPLY-01). The rest are contract
 * assertions from the UI design contract.
 *
 * WHY A BROWSER AND NOT A UNIT TEST. jsdom computes NO layout, so a test over
 * source can only prove that a class string is present, never that it took
 * effect. That is exactly how Phase 65 shipped an inert `truncate` and a
 * flattened spacing rung — twice. Every assertion below is a measured
 * `getBoundingClientRect()`, a DOM-order comparison, a tab-order observation or a
 * rendered-head read. None is a class check, and a class check could not decide
 * any of them: §D-1 records that `globals.css:1536` opens an UNLAYERED
 * `@media (max-width: 768px)` block at brace depth 0 which outranks every layered
 * utility at any specificity, so `inputSize="lg"` being PRESENT says nothing
 * about whether the control is 48px tall. E-2 and E-3 are that measurement.
 *
 * THE HONEYPOT ASSERTION IS NOT `toBeHidden()`, AND THAT IS DELIBERATE.
 * `66-RESEARCH.md` prescribes `toBeHidden()` "from the a11y tree" and it is
 * WRONG; UI-SPEC §A-6 records the correction. Playwright's visibility model is
 * GEOMETRIC: an element with a non-empty bounding box and `visibility: visible`
 * reads as VISIBLE even at `left: -9999px`. E-6 therefore uses
 * `not.toBeInViewport()` plus a `getBoundingClientRect().right < 0` check, and
 * E-7 pins the tab order, which is the property that actually matters.
 *
 * THE SUBMIT PATH CANNOT BE EXERCISED END TO END FROM LOCALHOST, AND THIS FILE
 * DOES NOT PRETEND OTHERWISE.
 *   - CONTEXT is fetched SERVER-SIDE by the RSC (`fetchApplyContext`), so no CORS
 *     is involved and the form below renders against a genuinely valid token. It
 *     is never stubbed.
 *   - SUBMIT is stubbed, for E-15 and E-16 ONLY. The deployed Edge Function's
 *     CORS check is an exact string comparison against `NEXT_PUBLIC_APP_URL`
 *     (`https://tenantflow.app`) and the E2E browser origin is
 *     `http://localhost:3050`, so a real browser POST is refused before it
 *     reaches the function. Both stubbed assertions are about CLIENT STATE AFTER
 *     A RESPONSE, which is precisely what a stub can establish honestly.
 *   - The SERVER behaviours — the honeypot writing zero rows, the fail-closed
 *     caps, idempotency — are proven in plan 66-10 by calling the deployed
 *     function from Node, where CORS does not apply. Do NOT "upgrade" the stub
 *     here into a claim about the server; that substitution is itself the
 *     security failure T-66-55 names.
 *
 * SEEDING WRITES TO PRODUCTION AND IS BOUNDED FOR ALL TIME. See
 * `lib/application-fixtures.ts`: `rental_application_links` has no DELETE policy
 * for any role, so link rows are REUSED rather than minted per run, and this
 * file's `afterAll` deliberately does NOT revoke the active link. Revoking it
 * would force the next run to mint a replacement that also could never be
 * deleted, turning a two-row fixture into unbounded growth.
 *
 * Serial mode is not a style choice: it guarantees ONE `beforeAll`, therefore one
 * sign-in and one fixture resolution, therefore no two workers racing
 * `create_application_link` on the same unit.
 */
test.describe.configure({ mode: "serial" });

/**
 * A well-formed token that does not exist, rather than obvious junk. A malformed
 * segment could be rejected on shape before any lookup happened, which would test
 * a different code path than the enumeration probe E-10 is about.
 */
const ABSENT_TOKEN = "0".repeat(64);

/** UI-SPEC §A-7. Mirrored from `TOKEN_UNAVAILABLE_COPY`; 66-02 owns the snapshot. */
const UNAVAILABLE_TITLE = "This application link isn't available";

/** UI-SPEC §A-3. Mirrored from `FAIR_HOUSING_NOTE`; 66-02 owns the snapshot. */
const FAIR_HOUSING_NOTE =
	"This owner does not discriminate on the basis of race, color, religion, sex, disability, familial status, or national origin, or on any other basis protected by state or local law.";

const SEED_EMAIL = "e2e-apply-fixture@example.com";

/**
 * The forbidden-field selector, verbatim from §E row E-8. Run against the FULLY
 * RENDERED page so a field introduced by any component in the tree is caught
 * regardless of which file added it (T-66-11).
 */
const FORBIDDEN_FIELDS = [
	'input[name*="ssn" i]',
	'input[name*="social" i]',
	'input[type="file"]',
	'input[name*="dob" i]',
	'input[name*="birth" i]',
	'input[name*="bank" i]',
	'input[name*="account" i]',
	'input[name*="routing" i]',
	'input[name*="card" i]',
	'input[name*="license" i]',
	'input[name*="passport" i]',
	'input[name*="govid" i]',
	'input[name*="government" i]',
].join(", ");

/**
 * Every real applicant input. The two exclusions are structural, not cosmetic:
 * the honeypot is a 1px off-screen trap (§A-6) and Radix's checkbox renders a
 * hidden bubble `<input>` sized to the control, so including either would make
 * E-2's "every input is 48px" assertion fail for reasons that have nothing to do
 * with the cascade it exists to measure.
 */
const REAL_INPUTS =
	'form input:not([type="checkbox"]):not([type="hidden"]):not([aria-hidden="true"]):not(#apply-company-website)';

/**
 * The single card slot, located structurally rather than by class. The shell's
 * `max-w-2xl` column has exactly three element children — `<header>`, the Card
 * `<div>`, and the footer `<p>` — so this resolves the Card on every one of the
 * page's three branches without asserting the class we then measure, which would
 * be circular.
 */
const CARD = "main#main-content > div > div";

let seedClient: SupabaseClient | null = null;
let fixtures: ApplyTokenFixtures = {
	active: null,
	dead: null,
	reason: "fixture resolution has not run",
};

test.beforeAll(async () => {
	const credentials = readSeedCredentials();
	if (!credentials) {
		fixtures = {
			active: null,
			dead: null,
			reason: "E2E_OWNER_PASSWORD / Supabase env not set",
		};
		return;
	}
	seedClient = await signInAsOwner(credentials);
	if (!seedClient) {
		fixtures = {
			active: null,
			dead: null,
			reason: "could not sign the synthetic owner in over the REST API",
		};
		return;
	}
	fixtures = await ensureApplyTokens(seedClient);
});

test.afterAll(async () => {
	// Sign out only. The link rows are reusable fixtures and are deliberately left
	// in place — see the file header.
	await seedClient?.auth.signOut();
});

/**
 * Read an element's box, GATED ON AN AUTO-RETRYING VISIBILITY ASSERTION.
 *
 * The gate is not tidiness, it is the fix for a real CI failure. `boundingBox()`
 * answers `null` the instant an element is not visible — that is its documented
 * contract, not an error path — and alone among the reads in this file it does
 * NOT retry. Every `expect()` here polls; this one call took a single snapshot.
 *
 * E-1 failed in CI with "element has no bounding box (not rendered)" against a
 * disclaimer that is emphatically rendered: measured against the compiled
 * bundle it is 309x434 at 375px and its bottom sits 88px above the submit
 * button's top. Playwright classed that same test FLAKY in that same run,
 * because a later attempt read the very same element successfully. So the
 * element was never missing and the selector was never wrong — a one-shot read
 * taken while the page was still settling after `setViewportSize()` is the
 * whole defect.
 *
 * `toBeVisible()` polls until the element genuinely has a non-empty box, which
 * is precisely the precondition `boundingBox()` requires, so the window closes.
 * This weakens nothing: it ADDS an assertion, and a element that never becomes
 * visible now fails as a visibility assertion naming the locator rather than as
 * a bare "no bounding box" from a helper three frames up the stack.
 */
async function boxOf(locator: Locator): Promise<{
	x: number;
	y: number;
	width: number;
	height: number;
}> {
	await expect(locator).toBeVisible();
	const box = await locator.boundingBox();
	if (!box) throw new Error("element has no bounding box (not rendered)");
	return box;
}

/** Loads a token and waits for the branch that token produces to be on screen. */
async function openApply(page: Page, token: string) {
	const response = await page.goto(`/apply/${token}`, {
		waitUntil: "domcontentloaded",
	});
	await expect(page.locator(CARD)).toBeVisible({ timeout: 20000 });
	return response;
}

/** Waits for the client island to hydrate before anything is measured. */
async function openForm(page: Page, token: string) {
	await openApply(page, token);
	await expect(page.locator("#first_name")).toBeVisible({ timeout: 20000 });
}

/** The 14 required answers, so the submit button is genuinely enabled. */
async function fillRequired(page: Page) {
	await page.fill("#first_name", "E2E");
	await page.fill("#last_name", "Fixture");
	await page.fill("#email", SEED_EMAIL);
	// >= 10 characters: `phoneSchema` enforces a minimum length, and an 8-digit
	// value leaves the form permanently unsubmittable with a real error.
	await page.fill("#phone", "555-010-0100");
	await page.fill("#desired_move_in_date", "2027-01-01");
	await page.fill("#current_street", "1 Test St");
	await page.fill("#current_city", "Testville");
	await page.fill("#current_state", "TX");
	await page.fill("#current_postal_code", "75001");
	await page.fill("#gross_monthly_income", "5000");
	await page.fill("#occupant_count", "2");
	await page.fill("#reference_1_name", "Reference One");
	await page.fill("#reference_1_phone", "555-010-0101");
	await page.locator("#apply-certify").click();
}

function submitButton(page: Page): Locator {
	return page.getByRole("button", { name: "Submit application" });
}

// ─────────────────────────────────────────────────────────────────────────────
// E-9 and the garbage-token render. Neither needs a fixture, so these run even
// on an account with no units at all.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/apply — the rendered head and the unavailable card", () => {
	test("E-9: the rendered head carries noindex, nofollow (APPLY-01)", async ({
		page,
	}) => {
		// Read from the DOM, never from the route module. D-14 puts `/apply`
		// deliberately OUTSIDE robots.txt's disallow list so a crawler reaches the
		// page and reads this instruction; the deployed head is what it sees.
		await openApply(page, ABSENT_TOKEN);
		const robots = page.locator('meta[name="robots"]');
		await expect(robots).toHaveCount(1);
		await expect(robots).toHaveAttribute("content", "noindex, nofollow");

		if (fixtures.active) {
			// The valid branch renders a different component tree, so the tag has to
			// be asserted there too — a per-branch metadata regression is exactly the
			// kind that ships silently.
			await openForm(page, fixtures.active.rawToken);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
				"content",
				"noindex, nofollow",
			);
		}
	});

	test("a token that does not exist answers HTTP 200, never 404", async ({
		page,
	}) => {
		// A 404 would let anyone walking published listing URLs separate "token
		// exists" from "token does not" on the status line alone (T-66-02).
		const response = await openApply(page, ABSENT_TOKEN);
		expect(response?.status()).toBe(200);
		await expect(page.locator(CARD)).toContainText(UNAVAILABLE_TITLE);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// E-10. Needs a REAL link row in a dead state; a comparison between two absent
// tokens would be satisfied by any implementation at all.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/apply — token-state non-enumeration (E-10, APPLY-01)", () => {
	test("a dead token and an absent token render byte-identical text", async ({
		page,
	}) => {
		test.skip(
			fixtures.dead === null,
			`no dead link fixture: ${fixtures.reason ?? "unknown"}`,
		);
		const dead = fixtures.dead;
		if (!dead) return;

		const deadResponse = await openApply(page, dead.rawToken);
		expect(deadResponse?.status()).toBe(200);
		const deadText = await page.locator(CARD).textContent();

		// POSITIVE CONTROL, and the test is worthless without it. Strict equality
		// between two renders is satisfied trivially when BOTH are the transport
		// -error card (`CONTEXT_ERROR_COPY`), which is what a Supabase outage during
		// the run would produce. Asserting the unavailable title first makes that
		// outcome a failure instead of a pass.
		expect(deadText).toContain(UNAVAILABLE_TITLE);

		const absentResponse = await openApply(page, ABSENT_TOKEN);
		expect(absentResponse?.status()).toBe(200);
		const absentText = await page.locator(CARD).textContent();

		// Strict equality over the rendered text, NOT `toContain("isn't
		// available")`. A phrase check passes while the two states differ elsewhere
		// in the card, and that difference is the leak.
		expect(absentText).toBe(deadText);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// E-1 to E-8 and E-11 to E-16. All require the form, therefore a valid token.
// ─────────────────────────────────────────────────────────────────────────────

test.describe("/apply — the rendered applicant form", () => {
	test.beforeEach(async ({ page }) => {
		test.skip(
			fixtures.active === null,
			`no active link fixture: ${fixtures.reason ?? "unknown"}`,
		);
		const active = fixtures.active;
		if (!active) return;
		await openForm(page, active.rawToken);
	});

	test("E-1: the APPLY-06 disclaimer sits above submit at 375px and 1280px", async ({
		page,
	}) => {
		// BOTH viewports are required. A sticky or reordered submit control can
		// satisfy one and fail the other, and a mobile action bar is the exact
		// implementation that would let an applicant submit without the disclaimer
		// ever entering the viewport (T-66-42).
		for (const width of [375, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			// `#apply-disclaimer` labels the APPLY-06 block specifically. The header
			// orientation line is different copy and is NOT this block.
			const disclaimer = page.locator(
				'section[aria-labelledby="apply-disclaimer"]',
			);
			await expect(disclaimer).toHaveCount(1);
			const d = await boxOf(disclaimer);
			const s = await boxOf(submitButton(page));
			expect(
				d.y + d.height,
				`disclaimer must end above the submit button at ${width}px`,
			).toBeLessThanOrEqual(s.y);
		}
	});

	test("E-2: every applicant input renders exactly 48px tall at 375px", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		const inputs = page.locator(REAL_INPUTS);
		// Positive control: a zero count would satisfy an "all of them" assertion
		// against a page that failed to render at all.
		expect(await inputs.count()).toBeGreaterThanOrEqual(20);

		const offenders = await inputs.evaluateAll((nodes) =>
			nodes
				.map((node) => ({
					id: node.id,
					height: Math.round(node.getBoundingClientRect().height),
				}))
				.filter((entry) => entry.height !== 48),
		);
		// 48, measured. `inputSize="lg"` being present in the class string cannot
		// decide this: the unlayered mobile block outranks every layered utility.
		expect(offenders).toEqual([]);
	});

	test("E-3: every textarea renders at least 96px tall at 375px", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		const areas = page.locator("form textarea");
		expect(await areas.count()).toBeGreaterThanOrEqual(3);

		const offenders = await areas.evaluateAll((nodes) =>
			nodes
				.map((node) => ({
					id: node.id,
					height: Math.round(node.getBoundingClientRect().height),
				}))
				.filter((entry) => entry.height < 96),
		);
		// The layered `min-h-24!` beating the unlayered `min-height: 2.75rem`. An
		// important author declaration outranks a normal one regardless of layer, so
		// 96 is the number that proves the override actually landed.
		expect(offenders).toEqual([]);
	});

	test("E-4: every field container is exactly 309px wide at 375px", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		const widths = await page
			.locator('form [data-slot="field"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => Math.round(node.getBoundingClientRect().width)),
			);
		expect(widths.length).toBeGreaterThanOrEqual(20);

		// 309, AND THE DERIVATION IS THE ASSERTION:
		//    375   the viewport
		//   − 32   `main`'s px-4 gutter, 16 + 16      → 343, the Card's BORDER box
		//   −  2   the Card's own 1px border, both sides (`cardVariants` ships a
		//          bare `border`, and the box is `border-box`) → 341, its content box
		//   − 32   `CardContent`'s px-4 below `sm`, 16 + 16    → 309
		//
		// THIS CONSTANT WAS 311 AND 311 WAS ARITHMETICALLY WRONG. UI-SPEC
		// §"Measurable geometry" derived it as 343 − 16 − 16 and never subtracted
		// the Card's own border, so the number named a width the box model cannot
		// produce and the assertion could not pass against any correct build. That
		// row is corrected alongside this line, for all three of its viewports. The
		// layout is NOT changed to reach 311: the border and both paddings are
		// deliberate (§"Spacing exception 3" buys the mobile px-4 precisely to
		// widen this rail), so moving them to satisfy a miscalculation would damage
		// a correct design.
		//
		// Equality rather than the old floor, and that is a STRENGTHENING. A floor
		// cannot distinguish a correct single-column rail from one that lost the
		// page gutter and now runs edge to edge — both clear it. One exact number
		// pins every term in the chain above, so any change to the gutter, the
		// border or the card padding fails here and names itself.
		expect([...new Set(widths)]).toEqual([309]);
	});

	test("E-13: every field container shares one x at 375px (single column)", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		const xs = await page
			.locator('form [data-slot="field"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => Math.round(node.getBoundingClientRect().x)),
			);
		expect(xs.length).toBeGreaterThanOrEqual(20);
		expect(new Set(xs).size).toBe(1);
	});

	test("E-5 and E-14: the card caps at 672px and pairs the name fields at 1280px", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		const card = await boxOf(page.locator(CARD));
		expect(Math.round(card.width)).toBe(672);

		const first = await boxOf(page.locator("#first_name"));
		const last = await boxOf(page.locator("#last_name"));
		expect(first.x).toBeLessThan(last.x);
		expect(Math.round(first.y)).toBe(Math.round(last.y));
	});

	test("E-6: the honeypot is outside the viewport, measured (APPLY-02)", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		const honeypot = page.locator("#apply-company-website");
		await expect(honeypot).toBeAttached();

		// Deliberately NOT `toBeHidden()`. Playwright's visibility model is
		// geometric, so this control — a rendered input inside a 1px box at
		// left:-9999px with `visibility: visible` — reads as VISIBLE, and
		// `toBeHidden()` would fail against a correct implementation while passing
		// against a `display:none` one that a bot can trivially detect.
		await expect(honeypot).not.toBeInViewport();
		const right = await honeypot.evaluate(
			(node) => node.getBoundingClientRect().right,
		);
		expect(right).toBeLessThan(0);

		// Positive control: `not.toBeInViewport()` also passes on a page where
		// nothing rendered. A real field must be in the viewport at the same moment.
		await expect(page.locator("#first_name")).toBeInViewport();
	});

	test("E-7: Tab from the attestation lands on submit, never the trap (APPLY-02)", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		// Fill first: the submit control is disabled while the form is invalid, and
		// a disabled button is skipped by Tab. Asserting tab order at the moment an
		// applicant would actually submit is also the moment that matters.
		await fillRequired(page);
		await expect(submitButton(page)).toBeEnabled();

		await page.locator("#apply-certify").focus();
		await page.keyboard.press("Tab");

		const focused = await page.evaluate(() => {
			const element = document.activeElement;
			if (!element) return null;
			return {
				id: element.id,
				type: element.getAttribute("type"),
				text: (element.textContent ?? "").trim(),
			};
		});

		// Both halves. Asserting only that the trap is not focused would pass even
		// if Tab landed somewhere else entirely.
		expect(focused?.id).not.toBe("apply-company-website");
		expect(focused?.type).toBe("submit");
		expect(focused?.text).toBe("Submit application");
	});

	test("E-8: no forbidden field exists anywhere in the rendered DOM (APPLY-02)", async ({
		page,
	}) => {
		// Positive control FIRST: a count of zero is what this asserts, and a page
		// that rendered nothing would satisfy it vacuously.
		expect(await page.locator(REAL_INPUTS).count()).toBeGreaterThanOrEqual(20);
		await expect(page.locator(FORBIDDEN_FIELDS)).toHaveCount(0);
	});

	test("E-11: the income total precedes every employer field, under one heading", async ({
		page,
	}) => {
		const section = page.locator('section[aria-labelledby="apply-s3"]');
		await expect(section).toHaveCount(1);

		// Exactly ONE `(optional)` group heading. A second heading, or a bordered
		// container around any subset of the optional fields, is the separated
		// -Employment layout the F-3(a) contract forbids.
		const headings = section.locator("h3");
		await expect(headings).toHaveCount(1);
		await expect(headings).toContainText("(optional)");

		const ordered = await page.evaluate(() => {
			const total = document.querySelector('label[for="gross_monthly_income"]');
			const employers = [
				"employer_name",
				"employer_role",
				"employer_months",
			].map((name) => document.querySelector(`label[for="${name}"]`));
			if (!total || employers.some((node) => node === null)) return null;
			return employers.every(
				(node) =>
					node !== null &&
					(total.compareDocumentPosition(node) &
						Node.DOCUMENT_POSITION_FOLLOWING) !==
						0,
			);
		});
		// `null` means a label was missing, which must fail rather than read as
		// "nothing was out of order".
		expect(ordered).toBe(true);
	});

	test("E-12: the fair-housing note renders inside section 3", async ({
		page,
	}) => {
		// Containment, not presence: the descendant combinator is the containment
		// assertion, and the page-wide count pins that the scoped match is the only
		// note on the page rather than one of several.
		await expect(page.locator('[role="note"]')).toHaveCount(1);
		const note = page.locator(
			'section[aria-labelledby="apply-s3"] [role="note"]',
		);
		await expect(note).toHaveCount(1);
		await expect(note).toHaveText(FAIR_HOUSING_NOTE);
	});

	test("E-15: a successful submit leaves the applicant's email nowhere on the page", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		// Stubbed, and the stub proves CLIENT state only — see the file header.
		await page.route("**/functions/v1/apply-token", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			}),
		);

		await fillRequired(page);
		await expect(page.locator("#email")).toHaveValue(SEED_EMAIL);
		await submitButton(page).click();

		// Positive control: without it every assertion below passes on a page where
		// the click never landed.
		await expect(page.getByText("Application received")).toBeVisible({
			timeout: 15000,
		});

		// Nothing the applicant typed survives — not in an input, and not in the
		// rendered text either. A confirmation that echoed the email back would
		// satisfy an inputs-only check while still leaving PII on a shared device.
		const held = await page.evaluate(
			(email) =>
				Array.from(document.querySelectorAll("input")).filter(
					(node) => node.value === email,
				).length,
			SEED_EMAIL,
		);
		expect(held).toBe(0);
		await expect(page.locator("main#main-content")).not.toContainText(
			SEED_EMAIL,
		);
	});

	test("E-16: a 429 keeps the typed answers and keeps submit enabled", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 900 });
		await page.route("**/functions/v1/apply-token", (route) =>
			route.fulfill({
				status: 429,
				contentType: "application/json",
				body: "{}",
			}),
		);

		await fillRequired(page);
		await submitButton(page).click();

		// Positive control again: the rate-limited notice is what proves the
		// response was actually consumed.
		await expect(page.getByText("This listing is busy right now")).toBeVisible({
			timeout: 15000,
		});

		// BOTH halves. A page-replacing implementation fails the first; one that
		// disables the control after a cap fails the second, stranding the applicant
		// with 26 fields they cannot resubmit.
		await expect(page.locator("#email")).toHaveValue(SEED_EMAIL);
		await expect(submitButton(page)).toBeEnabled();
	});
});
