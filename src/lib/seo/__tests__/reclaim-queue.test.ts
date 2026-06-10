import { describe, expect, it } from "vitest";
import { DELETED_BLOG_REDIRECTS } from "../blog-redirects";
import { RECLAIM_QUEUE } from "../reclaim-queue";

// Defined locally so the test does not import from scripts/ (scripts must never
// become a runtime dependency of src/). These mirror the generator's slug gate
// (scripts/generate-blog-draft.ts: SLUG_REGEX + length 3-120) and the five valid
// categories — drift between them and the script is caught by the generator's own
// unit tests, not here.
const SLUG_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VALID_CATEGORIES = new Set([
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
]);

// The set of current redirect source slugs (the "/blog/" prefix stripped). Every
// reclaim-queue slug MUST be a member — drift means a queue entry pointing at a URL
// that no longer 301s (a stale, un-reclaimable target). See BLOG-08b.
const REDIRECT_SOURCE_SLUGS = new Set(
	DELETED_BLOG_REDIRECTS.map((r) => r.source.replace("/blog/", "")),
);

describe("RECLAIM_QUEUE", () => {
	it("has exactly 10 entries (the top-10 by impressions)", () => {
		expect(RECLAIM_QUEUE).toHaveLength(10);
	});

	it("every slug passes the generator slug gate (regex + length 3-120)", () => {
		for (const { slug } of RECLAIM_QUEUE) {
			expect(slug).toMatch(SLUG_REGEX);
			expect(slug.length).toBeGreaterThanOrEqual(3);
			expect(slug.length).toBeLessThanOrEqual(120);
		}
	});

	it("every slug is a current DELETED_BLOG_REDIRECTS source (drift guard)", () => {
		for (const { slug } of RECLAIM_QUEUE) {
			expect(REDIRECT_SOURCE_SLUGS.has(slug)).toBe(true);
		}
	});

	it("every category is one of the five valid categories", () => {
		for (const { category } of RECLAIM_QUEUE) {
			expect(VALID_CATEGORIES.has(category)).toBe(true);
		}
	});

	it("slugs are unique within the queue", () => {
		const slugs = RECLAIM_QUEUE.map((entry) => entry.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("every entry has a non-empty humanized topic hint", () => {
		for (const { topic } of RECLAIM_QUEUE) {
			expect(topic.trim().length).toBeGreaterThan(0);
		}
	});
});
