/**
 * Phase 66 — the locked copy constants.
 *
 * These assertions are not style checks. Each APPLY-06 promise is asserted
 * individually so that dropping one fails a test named after the promise, not a
 * paragraph-count check that would still pass with the sentence removed. The
 * token-unavailable assertions are a non-enumeration control expressed at the
 * string level: a copy edit that helpfully differentiates "expired" from
 * "revoked" fails here rather than in a security review six months later.
 */

import { describe, expect, it } from "vitest";
import {
	APPLICATION_STATUS,
	APPLICATION_STATUSES,
	APPLY_DISCLAIMER,
	DISPOSITION_REASONS,
	FAIR_HOUSING_NOTE,
	TOKEN_UNAVAILABLE_COPY,
} from "#lib/applications/application-copy";

const disclaimer = APPLY_DISCLAIMER.paragraphs.join(" ").toLowerCase();

describe("APPLY_DISCLAIMER", () => {
	it("has exactly three paragraphs", () => {
		expect(APPLY_DISCLAIMER.paragraphs).toHaveLength(3);
		expect(APPLY_DISCLAIMER.heading).toBe("About this application");
	});

	it("states that TenantFlow does not screen applicants", () => {
		expect(disclaimer).toContain("does not screen");
	});

	it("disclaims credit checks", () => {
		expect(disclaimer).toContain("credit check");
	});

	it("disclaims background checks", () => {
		expect(disclaimer).toContain("background check");
	});

	it("states TenantFlow is not a consumer reporting agency", () => {
		expect(disclaimer).toContain("consumer reporting agency");
	});

	it("names the Fair Credit Reporting Act and places its duties on the owner", () => {
		expect(disclaimer).toContain("fair credit reporting act");
	});

	it("states that a Social Security number is not requested", () => {
		expect(disclaimer).toContain("social security number");
	});

	it("promises the applicant will not be emailed (D-10)", () => {
		expect(disclaimer).toContain("will not email you");
	});

	it("carries no emoji and no markup", () => {
		const joined = APPLY_DISCLAIMER.paragraphs.join(" ");
		expect(joined).not.toMatch(/\p{Extended_Pictographic}/u);
		expect(joined).not.toContain("<");
	});

	it("keeps every paragraph non-empty", () => {
		for (const paragraph of APPLY_DISCLAIMER.paragraphs) {
			expect(paragraph.trim().length).toBeGreaterThan(40);
		}
	});
});

describe("FAIR_HOUSING_NOTE", () => {
	it("names the federal protected classes", () => {
		const note = FAIR_HOUSING_NOTE.toLowerCase();
		for (const term of [
			"race",
			"color",
			"religion",
			"sex",
			"disability",
			"familial status",
			"national origin",
		]) {
			expect(note).toContain(term);
		}
	});

	it("extends to state and local protected classes", () => {
		expect(FAIR_HOUSING_NOTE.toLowerCase()).toContain(
			"protected by state or local law",
		);
	});
});

describe("TOKEN_UNAVAILABLE_COPY", () => {
	it.each(["expired", "revoked", "invalid"])(
		"never names the token state %s",
		(state) => {
			// The non-leak property, asserted at the string level. Differentiating
			// these states would let anyone holding a listing URL enumerate which
			// tokens exist and which merely lapsed.
			expect(TOKEN_UNAVAILABLE_COPY.body.toLowerCase()).not.toContain(state);
			expect(TOKEN_UNAVAILABLE_COPY.title.toLowerCase()).not.toContain(state);
		},
	);

	it("tells the applicant what to do next", () => {
		expect(TOKEN_UNAVAILABLE_COPY.body.toLowerCase()).toContain(
			"contact the person who posted the listing",
		);
	});

	it("is a single title and body, not a per-reason map", () => {
		expect(Object.keys(TOKEN_UNAVAILABLE_COPY).sort()).toEqual([
			"body",
			"title",
		]);
	});
});

describe("APPLICATION_STATUS", () => {
	it("covers exactly the four D-07 statuses, in workflow order", () => {
		expect([...APPLICATION_STATUSES]).toEqual([
			"new",
			"reviewing",
			"approved",
			"rejected",
		]);
		expect(Object.keys(APPLICATION_STATUS)).toEqual([...APPLICATION_STATUSES]);
	});

	it("labels rejected as Declined (UI-14)", () => {
		expect(APPLICATION_STATUS.rejected.label).toBe("Declined");
	});

	it("never uses the destructive badge variant (UI-13)", () => {
		for (const status of APPLICATION_STATUSES) {
			expect(APPLICATION_STATUS[status].badgeVariant).not.toBe("destructive");
		}
	});

	it("uses only the four pre-existing badge variants", () => {
		const allowed = ["info", "warning", "success", "outline"];
		for (const status of APPLICATION_STATUSES) {
			expect(allowed).toContain(APPLICATION_STATUS[status].badgeVariant);
		}
	});

	it("gives every status a non-empty label", () => {
		for (const status of APPLICATION_STATUSES) {
			expect(APPLICATION_STATUS[status].label.length).toBeGreaterThan(0);
		}
	});
});

describe("DISPOSITION_REASONS", () => {
	it("is the seven-entry closed vocabulary from D-11d", () => {
		expect(DISPOSITION_REASONS).toHaveLength(7);
	});

	it("has unique values", () => {
		const values = DISPOSITION_REASONS.map((reason) => reason.value);
		expect(new Set(values).size).toBe(values.length);
	});

	it.each(DISPOSITION_REASONS.map((reason) => reason.value))(
		"keeps %s snake_case and space-free, so it can never become free-text PII",
		(value) => {
			expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
			expect(value).not.toContain(" ");
		},
	);

	it("matches the CHECK constraint vocabulary exactly", () => {
		// Mirrors rental_applications_disposition_reason_check in
		// supabase/migrations/20260806120000_rental_applications_schema.sql. A value
		// that drifts from this list raises 23514 at write time, not at build time.
		expect(DISPOSITION_REASONS.map((reason) => reason.value)).toEqual([
			"unit_no_longer_available",
			"income_requirement",
			"rental_history_requirement",
			"incomplete_application",
			"applicant_withdrew",
			"another_applicant_selected",
			"other",
		]);
	});

	it("gives every reason a human label distinct from its value", () => {
		for (const reason of DISPOSITION_REASONS) {
			expect(reason.label.length).toBeGreaterThan(0);
			expect(reason.label).not.toBe(reason.value);
		}
	});
});
