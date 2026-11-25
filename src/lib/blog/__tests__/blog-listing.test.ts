/**
 * Related posts are read on the server and fall back to the newest posts when
 * a category has too few (2026-11-24 SEO audit PT-1, PT-2).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, readsUnavailable } = vi.hoisted(() => ({
	mockClient: vi.fn(),
	readsUnavailable: { value: false },
}));

vi.mock("#lib/blog/blog-queries", () => ({
	blogAnonClient: mockClient,
	blogReadsUnavailable: () => readsUnavailable.value,
}));

import { loadBlogListing, loadRelatedPosts } from "#lib/blog/blog-listing";

const post = (slug: string, category: string) => ({ slug, category });

/** A client whose same-category query and newest-posts query return these. */
function clientReturning(
	sameCategory: ReturnType<typeof post>[],
	newest: ReturnType<typeof post>[],
) {
	mockClient.mockReturnValue({
		from: () => {
			let byCategory = false;
			const chain = {
				select: () => chain,
				eq: (column: string) => {
					if (column === "category") byCategory = true;
					return chain;
				},
				neq: () => chain,
				order: () => chain,
				limit: async (n: number) => ({
					data: (byCategory ? sameCategory : newest).slice(0, n),
					error: null,
				}),
			};
			return chain;
		},
	});
}

describe("loadRelatedPosts", () => {
	beforeEach(() => {
		readsUnavailable.value = false;
	});

	it("uses the category's posts when it has enough", async () => {
		clientReturning(
			[post("a", "tax-prep"), post("b", "tax-prep"), post("c", "tax-prep")],
			[post("z", "lease-law")],
		);
		const related = await loadRelatedPosts("self", "tax-prep");
		expect(related.map((p) => p.slug)).toEqual(["a", "b", "c"]);
	});

	it("tops up a thin category with the newest posts, without repeats", async () => {
		clientReturning(
			[post("a", "maintenance")],
			[post("a", "maintenance"), post("x", "lease-law"), post("y", "tax-prep")],
		);
		const related = await loadRelatedPosts("self", "maintenance");
		expect(related.map((p) => p.slug)).toEqual(["a", "x", "y"]);
	});

	it("links a post with no category to the newest posts", async () => {
		clientReturning([], [post("x", "a"), post("y", "b"), post("z", "c")]);
		expect((await loadRelatedPosts("self", null)).map((p) => p.slug)).toEqual([
			"x",
			"y",
			"z",
		]);
	});

	it("reads nothing during the CI build's placeholder database", async () => {
		readsUnavailable.value = true;
		expect(await loadRelatedPosts("self", "tax-prep")).toEqual([]);
		expect(mockClient).not.toHaveBeenCalled();
	});
});

describe("loadBlogListing", () => {
	/** A client whose listing query answers 200 with `total` rows counted. */
	function listingClient(total: number) {
		mockClient.mockReturnValue({
			from: () => {
				const chain = {
					select: () => chain,
					eq: () => chain,
					order: () => chain,
					range: async () => ({ data: [], error: null, count: total }),
				};
				return chain;
			},
		});
	}

	beforeEach(() => {
		readsUnavailable.value = false;
	});

	it("404s a page past the last one even when PostgREST answers 200", async () => {
		// 9 posts fill page 1; PostgREST returns an empty 200 for offset 9.
		listingClient(9);
		expect(await loadBlogListing({ page: 2 })).toBeNull();
	});

	it("keeps page 1 of an empty listing, for its empty state", async () => {
		listingClient(0);
		expect(await loadBlogListing({ page: 1 })).toEqual({
			posts: [],
			total: 0,
			totalPages: 1,
		});
	});
});
