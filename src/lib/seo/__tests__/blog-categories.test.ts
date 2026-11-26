import { describe, expect, it } from "vitest";

import {
	CATEGORY_COPY,
	CATEGORY_LABELS,
	categoryDescription,
	categoryLabel,
} from "../blog-categories";

describe("CATEGORY_LABELS", () => {
	it("maps every known category slug to a human label", () => {
		expect(CATEGORY_LABELS).toEqual({
			"lease-law": "Lease Law",
			"software-vault": "Using TenantFlow",
			"tax-prep": "Tax Prep",
			"tenant-screening": "Tenant Screening",
			maintenance: "Maintenance",
		});
	});
});

describe("categoryLabel", () => {
	it("returns the mapped label for a known slug", () => {
		expect(categoryLabel("software-vault")).toBe("Using TenantFlow");
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

describe("CATEGORY_COPY (2026-11-24 SEO audit CT-5)", () => {
	const entries = Object.entries(CATEGORY_COPY);

	it("writes copy only for categories that have a label", () => {
		for (const slug of Object.keys(CATEGORY_COPY)) {
			expect(CATEGORY_LABELS[slug], `${slug} has a label`).toBeDefined();
		}
	});

	it.each(entries)(
		"%s: its description fits a search result",
		(_slug, copy) => {
			expect(copy.description.length).toBeGreaterThanOrEqual(120);
			expect(copy.description.length).toBeLessThanOrEqual(155);
		},
	);

	it.each(entries)("%s: its intro is 60 to 120 words", (_slug, copy) => {
		const words = copy.intro.split(/\s+/).length;
		expect(words).toBeGreaterThanOrEqual(60);
		expect(words).toBeLessThanOrEqual(120);
	});

	it.each(entries)("%s: its link is a site path", (_slug, copy) => {
		if (copy.link) expect(copy.link.href).toMatch(/^\/[a-z-]+(\/[a-z-]+)*$/);
	});

	it("falls back to a plain description that claims nothing", () => {
		expect(categoryDescription("tenant-screening")).not.toMatch(/expert/i);
		expect(categoryDescription("software-vault")).toBe(
			CATEGORY_COPY["software-vault"]?.description,
		);
	});
});
