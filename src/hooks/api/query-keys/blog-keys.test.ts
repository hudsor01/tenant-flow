/**
 * Blog Query Key Factory Tests
 *
 * The factory holds only the admin review queue: public blog reads happen on
 * the server (`#lib/blog/blog-listing`), related posts included since the
 * 2026-11-24 SEO audit PT-1.
 */

import { describe, expect, it } from "vitest";
import { blogQueries } from "./blog-keys";

describe("blogQueries", () => {
	it('all() returns ["blogs"]', () => {
		expect(blogQueries.all()).toEqual(["blogs"]);
	});

	it("reviewQueue() sits under all()", () => {
		expect(blogQueries.reviewQueue().queryKey).toEqual([
			"blogs",
			"review-queue",
		]);
	});

	it("has no client related-posts query", () => {
		expect(Object.keys(blogQueries).sort()).toEqual(["all", "reviewQueue"]);
	});
});
