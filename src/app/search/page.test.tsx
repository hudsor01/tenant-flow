/**
 * Public Blog Search Page Tests (Server Component / RSC pattern)
 *
 * Tests the MKT-04 rewrite: /search reads searchParams.q, runs a published-blog
 * ilike search via blogAnonClient (escaped .or() term), renders a BlogCard grid
 * for hits, the Empty compound for the no-query / no-matches states, uses a
 * name="q" GET form matching the homepage SearchAction, and stays noindex.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBlogAnonClient = vi.hoisted(() => vi.fn());
const orSpy = vi.hoisted(() => vi.fn());

vi.mock("#lib/blog/blog-queries", () => ({
	blogAnonClient: mockBlogAnonClient,
}));

vi.mock("#components/blog/blog-card", () => ({
	BlogCard: ({ post }: { post: { id: string; title: string } }) => (
		<div data-testid="blog-card" data-post-id={post.id}>
			{post.title}
		</div>
	),
}));

vi.mock("#components/layout/page-layout", () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}));

import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { escapeOrValue } from "#lib/sanitize-search";
import SearchPage, { metadata } from "./page";

const mockPosts: BlogListItem[] = [
	{
		id: "post-1",
		title: "How to Write a Solid Residential Lease",
		slug: "solid-residential-lease",
		excerpt: "The clauses every landlord lease needs.",
		published_at: "2026-02-15T10:00:00Z",
		category: "lease-law",
		reading_time: 8,
		featured_image: null,
		author_user_id: "user-1",
		status: "published",
		tags: ["leases"],
	},
	{
		id: "post-2",
		title: "Lease Renewal Checklist",
		slug: "lease-renewal-checklist",
		excerpt: "Renew without the headaches.",
		published_at: "2026-02-10T10:00:00Z",
		category: "lease-law",
		reading_time: 5,
		featured_image: null,
		author_user_id: "user-1",
		status: "published",
		tags: ["leases"],
	},
];

interface QueryResult {
	data: BlogListItem[] | null;
	error: { message: string } | null;
}

/**
 * Builder chain mirroring the search query:
 *   from(...).select(...).eq(...).or(...).order(...).limit(24)
 * Terminates (resolves the result) on `.limit`. `.or` records its argument via
 * the shared orSpy so tests can assert the escaped filter string.
 */
function makeClient(result: QueryResult) {
	const from = vi.fn(() => {
		const chain: Record<string, unknown> = {};
		chain.select = vi.fn(() => chain);
		chain.eq = vi.fn(() => chain);
		chain.or = vi.fn((arg: string) => {
			orSpy(arg);
			return chain;
		});
		chain.order = vi.fn(() => chain);
		chain.limit = vi.fn(() => Promise.resolve(result));
		return chain;
	});
	return { from };
}

describe("SearchPage (server component)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the Empty prompt and skips the DB call when q is absent", async () => {
		render(await SearchPage({ searchParams: Promise.resolve({}) }));

		expect(screen.getByText("Start searching")).toBeInTheDocument();
		expect(screen.queryByTestId("blog-card")).not.toBeInTheDocument();
		// No query -> no PostgREST round-trip at all.
		expect(mockBlogAnonClient).not.toHaveBeenCalled();
		expect(orSpy).not.toHaveBeenCalled();
	});

	it("renders a BlogCard per matching row with a name='q' GET form and escaped .or() term", async () => {
		mockBlogAnonClient.mockReturnValue(
			makeClient({ data: mockPosts, error: null }),
		);
		// A quote makes the escaping non-trivial: the raw value stays in the input
		// but the .or() term is backslash-escaped.
		const q = 'lease"guide';

		const { container } = render(
			await SearchPage({ searchParams: Promise.resolve({ q }) }),
		);

		const cards = screen.getAllByTestId("blog-card");
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent(
			"How to Write a Solid Residential Lease",
		);

		// Form is a GET to /search with the name="q" input the SearchAction targets.
		const form = container.querySelector("form");
		expect(form?.method).toBe("get");
		expect(form?.getAttribute("action")).toBe("/search");
		const input = screen.getByRole("searchbox");
		expect(input).toHaveAttribute("name", "q");
		expect(input).toHaveValue(q);

		// The .or() argument is the escaped, quote-wrapped filter string.
		const orArg = orSpy.mock.calls[0]?.[0] as string;
		expect(orArg).toContain("title.ilike.");
		expect(orArg).toContain(escapeOrValue(q));
		expect(orArg).toContain(`title.ilike."%${escapeOrValue(q)}%"`);
	});

	it("renders the no-results Empty state when a query matches zero rows", async () => {
		mockBlogAnonClient.mockReturnValue(makeClient({ data: [], error: null }));

		render(await SearchPage({ searchParams: Promise.resolve({ q: "zzzzz" }) }));

		expect(screen.getByText(/No results for/)).toBeInTheDocument();
		expect(screen.queryByTestId("blog-card")).not.toBeInTheDocument();
	});

	it("throws when the search query errors", async () => {
		mockBlogAnonClient.mockReturnValue(
			makeClient({ data: null, error: { message: "boom" } }),
		);

		await expect(
			SearchPage({ searchParams: Promise.resolve({ q: "lease" }) }),
		).rejects.toMatchObject({
			message: expect.stringContaining("boom"),
		});
	});

	it("stays noindex (SearchAction results page is not indexable)", () => {
		expect(metadata.robots).toBe("noindex, follow");
	});
});
