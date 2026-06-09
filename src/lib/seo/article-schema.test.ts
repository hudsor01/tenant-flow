import { describe, expect, it } from "vitest";

import { createArticleJsonLd } from "./article-schema";

/**
 * E-E-A-T author-attribution regression lock (BLOG-06 / threat T-12-11).
 *
 * Generated blog posts carry `author_user_id = null` — they are not
 * attributable to a single human. The slug page therefore renders the
 * brand byline "TenantFlow Team" both in the visible header and in the
 * Article JSON-LD, where the entity type MUST be `Organization` (a
 * team/brand is not a schema.org `Person`). These assertions pin that
 * mapping so a future change cannot silently leak a `Person` byline onto
 * auto-generated content (Spoofing/Integrity of authorship).
 *
 * The `Person` back-compat branch is also pinned: callers that pass a real
 * human name and omit `authorType` must still default to `Person`.
 */
describe("createArticleJsonLd author attribution", () => {
	const baseConfig = {
		title: "Tenant Screening Tips for New Landlords",
		slug: "tenant-screening-tips-for-new-landlords",
		datePublished: "2026-06-01T00:00:00.000Z",
	};

	it("emits an Organization author for the brand byline (null-author posts)", () => {
		const schema = createArticleJsonLd({
			...baseConfig,
			authorName: "TenantFlow Team",
			authorType: "Organization",
		});

		// schema-dts types `author` as a union; narrow to the object shape we emit.
		const author = schema.author as { "@type": string; name: string };
		expect(author["@type"]).toBe("Organization");
		expect(author.name).toBe("TenantFlow Team");
	});

	it("defaults to a Person author when authorType is omitted (back-compat)", () => {
		const schema = createArticleJsonLd({
			...baseConfig,
			authorName: "Jane Landlord",
		});

		const author = schema.author as { "@type": string; name: string };
		expect(author["@type"]).toBe("Person");
		expect(author.name).toBe("Jane Landlord");
	});

	it("emits a Person author when authorType is explicitly 'Person'", () => {
		const schema = createArticleJsonLd({
			...baseConfig,
			authorName: "Jane Landlord",
			authorType: "Person",
		});

		const author = schema.author as { "@type": string; name: string };
		expect(author["@type"]).toBe("Person");
		expect(author.name).toBe("Jane Landlord");
	});
});
