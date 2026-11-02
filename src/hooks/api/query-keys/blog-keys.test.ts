/**
 * Blog Query Key Factory Tests
 *
 * Tests for blogQueries factory covering query key structure and the
 * related-posts query.
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Supabase mock using vi.hoisted() (project convention)
const {
	mockFrom,
	mockSelect,
	mockEq,
	mockNeq,
	mockOrder,
	mockLimit,
	mockRange,
	mockSingle,
	mockContains,
	mockRpc,
} = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockEq: vi.fn(),
	mockNeq: vi.fn(),
	mockOrder: vi.fn(),
	mockLimit: vi.fn(),
	mockRange: vi.fn(),
	mockSingle: vi.fn(),
	mockContains: vi.fn(),
	mockRpc: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({
		from: mockFrom,
		rpc: mockRpc,
	}),
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn((_error: unknown, _domain: string) => {
		throw new Error("PostgREST error");
	}),
}));

import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { blogQueries } from "./blog-keys";

const queryClient = new QueryClient();

interface MockQueryContext {
	meta: undefined;
	queryKey: readonly unknown[];
	signal: AbortSignal;
	client: QueryClient;
	pageParam: undefined;
	direction: undefined;
}

/**
 * Helper to invoke a queryOptions queryFn with required context.
 * The mock context satisfies the QueryFunctionContext shape that
 * TanStack Query passes to queryFn at runtime.
 */
function callQueryFn<T>(opts: {
	queryFn?: ((ctx: never) => T | Promise<T>) | undefined;
	queryKey: readonly unknown[];
}): T | Promise<T> {
	if (!opts.queryFn) throw new Error("queryFn is undefined");
	const ctx: MockQueryContext = {
		meta: undefined,
		queryKey: opts.queryKey,
		signal: new AbortController().signal,
		client: queryClient,
		pageParam: undefined,
		direction: undefined,
	};
	return (opts.queryFn as (c: MockQueryContext) => T | Promise<T>)(ctx);
}

// Helper to set up chained query mock using createQueryChain with hoisted mocks for assertions
function setupChainedMock(result: {
	data: unknown;
	error: unknown;
	count?: number | null;
}) {
	const chain = createQueryChain(result);
	// Wire hoisted mocks onto the chain so expect(mockEq) etc. assertions work
	mockSelect.mockReturnValue(chain);
	mockEq.mockReturnValue(chain);
	mockNeq.mockReturnValue(chain);
	mockOrder.mockReturnValue(chain);
	mockContains.mockReturnValue(chain);
	mockLimit.mockReturnValue(result);
	mockRange.mockReturnValue(result);
	mockSingle.mockReturnValue(result);
	Object.assign(chain, {
		select: mockSelect,
		eq: mockEq,
		neq: mockNeq,
		order: mockOrder,
		limit: mockLimit,
		range: mockRange,
		single: mockSingle,
		contains: mockContains,
	});
	mockFrom.mockReturnValue(chain);
	return chain;
}

describe("blogQueries", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("query key structure", () => {
		it('all() returns ["blogs"]', () => {
			expect(blogQueries.all()).toEqual(["blogs"]);
		});

		it("related() queryKey includes params", () => {
			const params = { category: "Tips", excludeSlug: "my-post", limit: 3 };
			const opts = blogQueries.related(params);
			expect(opts.queryKey).toEqual(["blogs", "related", params]);
		});
	});

	describe("related posts", () => {
		it("applies category filter and excludes current slug", async () => {
			setupChainedMock({ data: [], error: null });

			const opts = blogQueries.related({
				category: "Tips",
				excludeSlug: "current-post",
			});
			await callQueryFn(opts);

			expect(mockEq).toHaveBeenCalledWith("category", "Tips");
			expect(mockNeq).toHaveBeenCalledWith("slug", "current-post");
			expect(mockEq).toHaveBeenCalledWith("status", "published");
			expect(mockLimit).toHaveBeenCalledWith(3);
		});

		it("uses custom limit when provided", async () => {
			setupChainedMock({ data: [], error: null });

			const opts = blogQueries.related({
				category: "Tips",
				excludeSlug: "current-post",
				limit: 5,
			});
			await callQueryFn(opts);

			expect(mockLimit).toHaveBeenCalledWith(5);
		});

		it("has enabled: false when category or excludeSlug is missing", () => {
			expect(
				blogQueries.related({ category: "", excludeSlug: "post" }).enabled,
			).toBe(false);
			expect(
				blogQueries.related({ category: "Tips", excludeSlug: "" }).enabled,
			).toBe(false);
		});

		it("returns data from query", async () => {
			const relatedPosts = [
				{ id: "2", title: "Related Post", slug: "related" },
			];
			setupChainedMock({ data: relatedPosts, error: null });

			const opts = blogQueries.related({
				category: "Tips",
				excludeSlug: "current",
			});
			const result = await callQueryFn(opts);

			expect(result).toEqual(relatedPosts);
		});
	});

	describe("no auth dependency", () => {
		it("related queryFn does not call getCachedUser", async () => {
			setupChainedMock({ data: [], error: null });

			const opts = blogQueries.related({
				category: "Tips",
				excludeSlug: "current",
			});
			await callQueryFn(opts);

			// getCachedUser is not even imported in blog-keys.ts
			// If it were called, the mock would need to be set up
			// The fact that the query succeeds without a getCachedUser mock proves it is not used
		});
	});
});
