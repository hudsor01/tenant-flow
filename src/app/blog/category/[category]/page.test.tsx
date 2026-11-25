/**
 * Blog Category Page Tests (Server Component / RSC pattern)
 *
 * Tests server-rendered category page: DB-resolved name, posts grid, breadcrumb
 * (Home > Blog > Category), pagination, empty state, notFound() for invalid slugs.
 * Page 1 and `/page/[page]` both render `CategoryIndex`, tested directly
 * (2026-11-24 SEO audit CT-1).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBlogAnonClient = vi.hoisted(() => vi.fn());
const mockGetBlogCategories = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() =>
	vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
);

vi.mock("#lib/blog/blog-queries", () => ({
	blogAnonClient: mockBlogAnonClient,
	blogReadsUnavailable: () => false,
	getBlogCategories: mockGetBlogCategories,
}));

vi.mock("next/navigation", () => ({
	notFound: mockNotFound,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("#components/blog/blog-card", () => ({
	BlogCard: ({ post }: { post: { id: string; title: string } }) => (
		<div data-testid="blog-card" data-post-id={post.id}>
			{post.title}
		</div>
	),
}));

vi.mock("#components/blog/blog-pagination", () => ({
	BlogPagination: ({
		basePath,
		currentPage,
		totalPages,
	}: {
		basePath: string;
		currentPage: number;
		totalPages: number;
	}) => (
		<nav data-testid="blog-pagination" data-base-path={basePath}>
			Page {currentPage}. Pages: {totalPages}
		</nav>
	),
}));

vi.mock("#components/blog/newsletter-signup", () => ({
	NewsletterSignup: ({ className }: { className?: string }) => (
		<div data-testid="newsletter-signup" className={className}>
			Newsletter
		</div>
	),
}));

vi.mock("#components/shared/blog-empty-state", () => ({
	BlogEmptyState: ({ message }: { message?: string }) => (
		<div data-testid="blog-empty-state">{message ?? "No posts"}</div>
	),
}));

vi.mock("#components/layout/page-layout", () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}));

vi.mock("#components/seo/json-ld-script", () => ({
	JsonLdScript: () => <script data-testid="json-ld" />,
}));

import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { CategoryIndex, categoryIndexMetadata } from "./category-index";
import BlogCategoryPage, { revalidate } from "./page";

const mockCategories = [
	{ name: "Software Comparisons", slug: "software-comparisons", post_count: 5 },
	{ name: "Property Management", slug: "property-management", post_count: 12 },
	// Real production shape: the `category` column stores the kebab slug, so
	// `name === slug` for in-map categories. The page humanizes the slug for
	// display via categoryLabel().
	{ name: "lease-law", slug: "lease-law", post_count: 9 },
];

const mockPosts: BlogListItem[] = [
	{
		id: "post-1",
		title: "Best Property Management Software 2026",
		slug: "best-pm-software-2026",
		excerpt: "Compare the top property management tools.",
		published_at: "2026-02-15T10:00:00Z",
		category: "Software Comparisons",
		reading_time: 10,
		featured_image: null,
		author_user_id: "user-1",
		status: "published",
		tags: ["comparison"],
	},
	{
		id: "post-2",
		title: "Buildium vs AppFolio Review",
		slug: "buildium-vs-appfolio",
		excerpt: "Head-to-head comparison.",
		published_at: "2026-02-10T10:00:00Z",
		category: "Software Comparisons",
		reading_time: 7,
		featured_image: null,
		author_user_id: "user-1",
		status: "published",
		tags: ["comparison"],
	},
];

interface MockBuilderOpts {
	posts?: BlogListItem[];
	postsCount?: number | null;
	categories?: typeof mockCategories;
	postsError?: { code?: string; message: string } | null;
}

function makeClient({
	posts = mockPosts,
	postsCount = 14,
	categories = mockCategories,
	postsError = null,
}: MockBuilderOpts = {}) {
	const fromMock = vi.fn(() => {
		const chain: Record<string, unknown> = {};
		chain.select = vi.fn(() => chain);
		chain.eq = vi.fn(() => chain);
		chain.order = vi.fn(() => chain);
		chain.range = vi.fn(() =>
			Promise.resolve({
				data: postsError ? null : posts,
				count: postsError ? null : postsCount,
				error: postsError,
			}),
		);
		// Awaiting the builder directly (the HEAD count path used by
		// getCategoryPublishedCount) resolves to the same {count} shape.
		chain.then = (
			resolve: (v: {
				data: BlogListItem[];
				count: number | null;
				error: null;
			}) => unknown,
		) => resolve({ data: posts, count: postsCount, error: null });
		return chain;
	});

	const rpcMock = vi.fn((name: string) => {
		if (name === "get_blog_categories") {
			return Promise.resolve({ data: categories, error: null });
		}
		return Promise.resolve({ data: null, error: null });
	});

	return { from: fromMock, rpc: rpcMock };
}

async function renderPage(
	categorySlug: string,
	opts?: MockBuilderOpts,
	page = 1,
): Promise<ReactElement> {
	mockBlogAnonClient.mockReturnValue(makeClient(opts));
	mockGetBlogCategories.mockResolvedValue(opts?.categories ?? mockCategories);
	return CategoryIndex({ category: categorySlug, page });
}

describe("BlogCategoryPage (server component)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders breadcrumb nav landmark with the category as the current page", async () => {
		render(await renderPage("software-comparisons"));
		const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
		expect(nav).toBeInTheDocument();
		// Active segment should display the validated name
		expect(nav).toHaveTextContent("Software Comparisons");
	});

	it("renders h1 with the DB-resolved category name (not slug-derived)", async () => {
		render(await renderPage("software-comparisons"));
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Software Comparisons",
		);
	});

	it("humanizes the kebab category slug into a label for the h1 + breadcrumb", async () => {
		// `lease-law` is the raw column value; the page must render "Lease Law".
		render(await renderPage("lease-law"));
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Lease Law",
		);
		const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
		expect(nav).toHaveTextContent("Lease Law");
		// The raw kebab slug must NOT appear as the visible heading text.
		expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(
			"lease-law",
		);
	});

	it("generateMetadata humanizes the category slug in the title", async () => {
		mockBlogAnonClient.mockReturnValue(makeClient({ postsCount: 9 }));
		mockGetBlogCategories.mockResolvedValue(mockCategories);
		const meta = await categoryIndexMetadata("lease-law", 1);
		expect(meta.title).toBe("Lease Law Articles & Guides");
	});

	it("renders BlogCard for each post in the category", async () => {
		render(await renderPage("software-comparisons"));
		const cards = screen.getAllByTestId("blog-card");
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent(
			"Best Property Management Software 2026",
		);
	});

	it("is static: page 1 revalidates every 5 minutes", async () => {
		expect(revalidate).toBe(300);
		const element = await BlogCategoryPage({
			params: Promise.resolve({ category: "lease-law" }),
		});
		expect(element.type).toBe(CategoryIndex);
		expect(element.props).toEqual({ category: "lease-law", page: 1 });
	});

	it("renders BlogPagination when total > PAGE_LIMIT", async () => {
		render(await renderPage("software-comparisons", { postsCount: 27 }, 2));
		const pagination = screen.getByTestId("blog-pagination");
		expect(pagination).toHaveTextContent("Page 2. Pages: 3");
		expect(pagination).toHaveAttribute(
			"data-base-path",
			"/blog/category/software-comparisons",
		);
	});

	it("does NOT render BlogPagination when total ≤ PAGE_LIMIT", async () => {
		render(await renderPage("software-comparisons", { postsCount: 5 }));
		expect(screen.queryByTestId("blog-pagination")).not.toBeInTheDocument();
	});

	it("renders BlogEmptyState when zero posts in category", async () => {
		render(
			await renderPage("software-comparisons", {
				posts: [],
				postsCount: 0,
			}),
		);
		expect(screen.getByTestId("blog-empty-state")).toBeInTheDocument();
	});

	it("calls notFound() when slug not in categories", async () => {
		mockBlogAnonClient.mockReturnValue(makeClient());
		mockGetBlogCategories.mockResolvedValue(mockCategories);
		await expect(
			CategoryIndex({ category: "does-not-exist", page: 1 }),
		).rejects.toMatchObject({
			message: expect.stringContaining("NEXT_NOT_FOUND"),
		});
		expect(mockNotFound).toHaveBeenCalled();
	});

	it("renders NewsletterSignup", async () => {
		render(await renderPage("software-comparisons"));
		expect(screen.getByTestId("newsletter-signup")).toBeInTheDocument();
	});

	it("returns notFound() for an out-of-range page (PGRST103)", async () => {
		mockBlogAnonClient.mockReturnValue(
			makeClient({
				postsError: {
					code: "PGRST103",
					message: "Requested range not satisfiable",
				},
			}),
		);
		mockGetBlogCategories.mockResolvedValue(mockCategories);
		await expect(
			CategoryIndex({ category: "software-comparisons", page: 9999 }),
		).rejects.toMatchObject({
			message: expect.stringContaining("NEXT_NOT_FOUND"),
		});
		expect(mockNotFound).toHaveBeenCalled();
	});

	it("throws (surfaces to error boundary) on a generic posts-query error", async () => {
		mockBlogAnonClient.mockReturnValue(
			makeClient({ postsError: { code: "XX000", message: "boom" } }),
		);
		mockGetBlogCategories.mockResolvedValue(mockCategories);
		await expect(
			CategoryIndex({ category: "software-comparisons", page: 1 }),
		).rejects.toMatchObject({
			message: expect.stringContaining("boom"),
		});
		expect(mockNotFound).not.toHaveBeenCalled();
	});
});

describe("BlogCategoryPage metadata (CT-2 thin-category noindex)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Metadata for `software-comparisons` holding `postCount` posts. */
	async function metaFor(postCount: number, page = 1) {
		mockBlogAnonClient.mockReturnValue(makeClient());
		mockGetBlogCategories.mockResolvedValue([
			{
				name: "Software Comparisons",
				slug: "software-comparisons",
				post_count: postCount,
			},
		]);
		return categoryIndexMetadata("software-comparisons", page);
	}

	it.each([0, 1, 2])(
		"noindexes, but follows, a category with %i posts (fewer than 3)",
		async (count) => {
			expect((await metaFor(count)).robots).toBe("noindex, follow");
		},
	);

	it("indexes a category from 3 posts (page 1)", async () => {
		// createPageMetadata omits robots when indexable.
		expect((await metaFor(3)).robots).toBeUndefined();
	});

	it("noindexes later pages regardless of count, with their own canonical", async () => {
		const meta = await metaFor(30, 2);
		expect(meta.robots).toBe("noindex, follow");
		expect(meta.alternates?.canonical).toMatch(
			/\/blog\/category\/software-comparisons\/page\/2$/,
		);
	});
});
