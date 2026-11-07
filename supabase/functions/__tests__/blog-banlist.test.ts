/**
 * n8n-blog-ingest's banlist (gate 8), by execution: the function imports
 * `findBlogBanlistHit` from `_shared/blog-banlist`, and so does this file.
 *
 * WHAT WENT WRONG. The gate read the content only and banned no persona word,
 * so a post whose excerpt said "single-property owner" published to /blog,
 * where persona-consistency.spec.ts bans /property owners?\b/i on every public
 * page. The generator's copy and the trigger had the same gap
 * (scripts/generate-blog-draft.test.ts, scripts/migration-replay-blog-banlist.sql);
 * src/lib/seo/__tests__/banlist-parity.test.ts holds the three to one list.
 */
import { describe, expect, it } from "vitest";
import {
	BLOG_BANLIST,
	BLOG_BANLIST_FIELDS,
	findBlogBanlistHit,
} from "../_shared/blog-banlist";

const CLEAN = {
	title: "What landlords check in a lease",
	excerpt: "A plain guide for landlords on what to check in a lease.",
	content: "## Section 1\nA landlord reviews the lease terms here.",
};

const SPEC_PERSONA = /property owners?\b/i;

describe("findBlogBanlistHit", () => {
	it("passes a clean post", () => {
		expect(findBlogBanlistHit(CLEAN)).toBeNull();
	});

	for (const field of BLOG_BANLIST_FIELDS) {
		it(`finds every banlist phrase in the ${field}, case ignored`, () => {
			for (const phrase of BLOG_BANLIST) {
				expect(
					findBlogBanlistHit({
						...CLEAN,
						[field]: `${CLEAN[field]} ${phrase.toUpperCase()}`,
					}),
					phrase,
				).toEqual({
					// The first listed phrase the text carries: "rent collection
					// software" carries "rent collection", and "online rent payment"
					// "online rent", each listed before it.
					phrase: BLOG_BANLIST.find((p) => phrase.includes(p)),
					field,
					kind: "phrase",
				});
			}
		});

		it(`finds the persona word in the ${field} wherever the spec's regex does`, () => {
			for (const text of [
				"single-property owner",
				"multiproperty owners",
				"Property Owners",
				"the property owner's lease",
				"PROPERTY OWNER",
			]) {
				expect(SPEC_PERSONA.test(text), text).toBe(true);
				expect(
					findBlogBanlistHit({ ...CLEAN, [field]: `${CLEAN[field]} ${text}` }),
					text,
				).toEqual({ phrase: "property owner", field, kind: "persona" });
			}
		});

		it(`passes in the ${field} what the spec's regex does not match`, () => {
			for (const text of [
				"property ownership",
				"property owner_id",
				"property owners2",
				"owner of the property",
			]) {
				expect(SPEC_PERSONA.test(text), text).toBe(false);
				expect(
					findBlogBanlistHit({ ...CLEAN, [field]: `${CLEAN[field]} ${text}` }),
					text,
				).toBeNull();
			}
		});
	}

	it("checks the title, then the excerpt, then the content; phrases before persona words", () => {
		expect(
			findBlogBanlistHit({
				title: "For property owners",
				excerpt: "autopay",
				content: "tenant portal",
			}),
		).toEqual({ phrase: "property owner", field: "title", kind: "persona" });
		expect(
			findBlogBanlistHit({
				...CLEAN,
				excerpt: "property owners and autopay",
				content: "tenant portal",
			}),
		).toEqual({ phrase: "autopay", field: "excerpt", kind: "phrase" });
	});

	it("reads a missing or null field as empty", () => {
		expect(findBlogBanlistHit({ content: CLEAN.content })).toBeNull();
		expect(findBlogBanlistHit({ ...CLEAN, excerpt: null })).toBeNull();
	});
});
