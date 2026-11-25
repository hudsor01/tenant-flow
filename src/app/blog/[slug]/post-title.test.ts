import { describe, expect, it } from "vitest";
import { postDocumentTitle } from "./post-title";

describe("postDocumentTitle (SEO audit PT-3)", () => {
	it("uses the search title over the H1", () => {
		expect(
			postDocumentTitle({
				seo_title: "Rent Ledger for Landlords: Track Rent Charges and Payments",
				title:
					"How a Rent Ledger Keeps Your Rental Income Straight (and How TenantFlow's Works)",
			}),
		).toBe("Rent Ledger for Landlords: Track Rent Charges and Payments");
	});

	it("adds the brand only when it fits in 60 characters", () => {
		expect(postDocumentTitle({ seo_title: "Short title", title: "x" })).toBe(
			"Short title | TenantFlow",
		);
		const long = "How to Organize Rental Properties and Units in an Afternoon";
		expect(postDocumentTitle({ seo_title: long, title: "x" })).toBe(long);
	});

	it("never repeats a brand the text already has", () => {
		expect(
			postDocumentTitle({
				seo_title: "TenantFlow Pricing: Starter vs Growth vs Max",
				title: "x",
			}),
		).toBe("TenantFlow Pricing: Starter vs Growth vs Max");
	});

	it("falls back to the H1 for a post with no search title", () => {
		expect(
			postDocumentTitle({
				seo_title: null,
				title:
					"How TenantFlow Organizes Your Properties and Units in One Afternoon",
			}),
		).toBe(
			"How TenantFlow Organizes Your Properties and Units in One Afternoon",
		);
	});
});
