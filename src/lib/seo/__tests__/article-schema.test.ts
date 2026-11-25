import { describe, expect, it, vi } from "vitest";

vi.mock("#env", () => ({
	env: {
		NEXT_PUBLIC_APP_URL: "https://tenantflow.app",
		VERCEL_URL: undefined,
	},
}));

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
	organizationRef: () => ({ "@id": "https://tenantflow.app/#organization" }),
}));

import { createBlogPostingJsonLd } from "../article-schema";

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

const ORGANIZATION = { "@id": "https://tenantflow.app/#organization" };

describe("createBlogPostingJsonLd (2026-11-24 SEO audit PT-5, PT-6)", () => {
	const baseInput = {
		title: "Test Post",
		slug: "test-post",
		datePublished: "2026-01-15T10:00:00Z",
		dateModified: "2026-01-16T10:00:00Z",
		image: "https://example.com/image.jpg",
		wordCount: 1500,
		description: "A test post about property management.",
		timeRequired: "PT5M",
		section: "Tax Prep",
	};

	it("is a BlogPosting in US English", () => {
		const result = toPlain(createBlogPostingJsonLd(baseInput));
		expect(result["@type"]).toBe("BlogPosting");
		expect(result["inLanguage"]).toBe("en-US");
	});

	it("credits the Organization node, by @id, as author and publisher", () => {
		const result = toPlain(createBlogPostingJsonLd(baseInput));
		expect(result["author"]).toEqual(ORGANIZATION);
		expect(result["publisher"]).toEqual(ORGANIZATION);
	});

	it("carries the post's fields", () => {
		expect(toPlain(createBlogPostingJsonLd(baseInput))).toMatchObject({
			headline: "Test Post",
			description: "A test post about property management.",
			datePublished: "2026-01-15T10:00:00Z",
			dateModified: "2026-01-16T10:00:00Z",
			mainEntityOfPage: "https://tenantflow.app/blog/test-post",
			articleSection: "Tax Prep",
			image: "https://example.com/image.jpg",
			wordCount: 1500,
			timeRequired: "PT5M",
		});
	});

	it("has no keywords: the tags were boilerplate", () => {
		expect(toPlain(createBlogPostingJsonLd(baseInput))).not.toHaveProperty(
			"keywords",
		);
	});

	it("leaves out optional fields it wasn't given", () => {
		const result = toPlain(
			createBlogPostingJsonLd({
				title: "Bare",
				slug: "bare",
				datePublished: "2026-01-15T10:00:00Z",
			}),
		);
		for (const key of [
			"description",
			"dateModified",
			"articleSection",
			"image",
			"wordCount",
			"timeRequired",
		]) {
			expect(result).not.toHaveProperty(key);
		}
	});

	it("encodes the slug in mainEntityOfPage", () => {
		const result = toPlain(
			createBlogPostingJsonLd({ ...baseInput, slug: "a b" }),
		);
		expect(result["mainEntityOfPage"]).toBe(
			"https://tenantflow.app/blog/a%20b",
		);
	});
});
