/**
 * Each free resource prints "Last reviewed <date>" under its H1 and gives the
 * same date as its JSON-LD `dateModified` (2026-11-24 SEO audit M3, X9, D4).
 * A review date is a promise, so this file fails once one is older than its
 * page's review cycle: the deposit card every six months (most landlord-tenant
 * amendments take effect in January or July), the tax tracker and the
 * maintenance checklist every year.
 */
import { describe, expect, it } from "vitest";
import {
	TAX_DATA_CHECKED_AT,
	TAX_TRACKER_PUBLISHED_AT,
	TAX_YEAR,
} from "#app/resources/landlord-tax-deduction-tracker/tax-deduction-data";
import {
	CHECKLIST_PUBLISHED_AT,
	CHECKLIST_REVIEWED_AT,
} from "#app/resources/seasonal-maintenance-checklist/checklist-review";
import {
	DEPOSIT_CARD_PUBLISHED_AT,
	DEPOSIT_RULES_CHECKED_AT,
	stateAnchor,
	stateData,
} from "#app/resources/security-deposit-reference-card/deposit-data";
import { parseLocalYmd } from "#lib/formatters/date";

const DAY_MS = 24 * 60 * 60 * 1000;

const REVIEWS = [
	{
		page: "security deposit card",
		reviewed: DEPOSIT_RULES_CHECKED_AT,
		published: DEPOSIT_CARD_PUBLISHED_AT,
		maxAgeDays: 184,
		how: "re-check every row against its statute in deposit-data.ts, then move DEPOSIT_RULES_CHECKED_AT",
	},
	{
		page: "tax deduction tracker",
		reviewed: TAX_DATA_CHECKED_AT,
		published: TAX_TRACKER_PUBLISHED_AT,
		maxAgeDays: 366,
		how: "re-check the rows against the current Schedule E, its instructions and Pub. 527, then move TAX_DATA_CHECKED_AT and TAX_YEAR",
	},
	{
		page: "maintenance checklist",
		reviewed: CHECKLIST_REVIEWED_AT,
		published: CHECKLIST_PUBLISHED_AT,
		maxAgeDays: 366,
		how: "re-read the tasks, then move CHECKLIST_REVIEWED_AT",
	},
] as const;

describe("free resources carry a current review date", () => {
	it.each(REVIEWS)(
		"the $page was reviewed within its cycle",
		({ page, reviewed, maxAgeDays, how }) => {
			const date = parseLocalYmd(reviewed);
			expect(date, `${page}: the review date must be YYYY-MM-DD`).toBeDefined();
			const ageDays = (Date.now() - (date?.getTime() ?? 0)) / DAY_MS;
			expect(
				ageDays,
				`${page}: the review date is in the future`,
			).toBeGreaterThan(-1);
			expect(
				ageDays,
				`${page}: last reviewed ${Math.floor(ageDays)} days ago; ${how}.`,
			).toBeLessThanOrEqual(maxAgeDays);
		},
	);

	it.each(REVIEWS)(
		"the $page was published before it was last reviewed",
		({ published, reviewed }) => {
			expect(parseLocalYmd(published)).toBeDefined();
			expect(published <= reviewed).toBe(true);
		},
	);

	it("dates the tax rows in the tax year they describe, or the one after", () => {
		const reviewedYear = Number(TAX_DATA_CHECKED_AT.slice(0, 4));
		expect(TAX_YEAR).toBeGreaterThanOrEqual(reviewedYear - 1);
		expect(TAX_YEAR).toBeLessThanOrEqual(reviewedYear);
	});
});

describe("each state row has its own link target", () => {
	it("gives every state a distinct, URL-safe anchor", () => {
		const anchors = stateData.map((s) => stateAnchor(s.state));
		expect(new Set(anchors).size).toBe(stateData.length);
		for (const anchor of anchors) expect(anchor).toMatch(/^[a-z]+(-[a-z]+)*$/);
	});

	it("names multi-word states the way a link would", () => {
		expect(stateAnchor("New York")).toBe("new-york");
		expect(stateAnchor("District of Columbia")).toBe("district-of-columbia");
	});
});
