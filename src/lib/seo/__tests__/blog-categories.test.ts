import { describe, expect, it } from "vitest";

import { CATEGORY_LABELS, categoryLabel } from "../blog-categories";

describe("CATEGORY_LABELS", () => {
	it("maps every known category slug to a human label", () => {
		expect(CATEGORY_LABELS).toEqual({
			"lease-law": "Lease Law",
			"software-vault": "Software Vault",
			"tax-prep": "Tax Prep",
			"tenant-screening": "Tenant Screening",
			maintenance: "Maintenance",
		});
	});
});

describe("categoryLabel", () => {
	it("returns the mapped label for a known slug", () => {
		expect(categoryLabel("software-vault")).toBe("Software Vault");
		expect(categoryLabel("tenant-screening")).toBe("Tenant Screening");
	});

	it("title-cases an unknown slug as a fallback", () => {
		expect(categoryLabel("brand-new-topic")).toBe("Brand New Topic");
	});

	it("handles a single-word slug", () => {
		expect(categoryLabel("maintenance")).toBe("Maintenance");
	});

	it("returns an empty string for an empty slug", () => {
		expect(categoryLabel("")).toBe("");
	});
});
