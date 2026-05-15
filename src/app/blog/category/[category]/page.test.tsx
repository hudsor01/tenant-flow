/**
 * Blog Category Page Tests (Server Component / RSC pattern)
 *
 * Tests server-rendered category page: DB-resolved name, posts grid, breadcrumb
 * (Home > Blog > Category), pagination, empty state, notFound() for invalid slugs.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockNotFound = vi.hoisted(() =>
	vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
);

vi.mock("#lib/supabase/server", () => ({
	createClient: mockCreateClient,
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
	BlogPagination: ({ totalPages }: { totalPages: number }) => (
		<nav data-testid="blog-pagination">Pages: {totalPages}</nav>
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
import BlogCategoryPage from "./page";

const mockCategories = [
	{ name: "Software Comparisons", slug: "software-comparisons", post_count: 5 },
	{ name: "Property Management", slug: "property-management", post_count: 12 },
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
}

function makeClient({
	posts = mockPosts,
	postsCount = 14,
	categories = mockCategories,
}: MockBuilderOpts = {}) {
	const fromMock = vi.fn(() => {
		const chain: Record<string, unknown> = {};
		chain.select = vi.fn(() => chain);
		chain.eq = vi.fn(() => chain);
		chain.order = vi.fn(() => chain);
		chain.range = vi.fn(() =>
			Promise.resolve({ data: posts, count: postsCount, error: null }),
		);
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
): Promise<ReactElement> {
	mockCreateClient.mockResolvedValue(makeClient(opts));
	const ui = await BlogCategoryPage({
		params: Promise.resolve({ category: categorySlug }),
		searchParams: Promise.resolve({}),
	});
	return ui;
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

	it("renders BlogCard for each post in the category", async () => {
		render(await renderPage("software-comparisons"));
		const cards = screen.getAllByTestId("blog-card");
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent(
			"Best Property Management Software 2026",
		);
	});

	it("renders BlogPagination when total > PAGE_LIMIT", async () => {
		render(await renderPage("software-comparisons", { postsCount: 27 }));
		const pagination = screen.getByTestId("blog-pagination");
		expect(pagination).toHaveTextContent("Pages: 3");
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
		mockCreateClient.mockResolvedValue(makeClient());
		await expect(
			BlogCategoryPage({
				params: Promise.resolve({ category: "does-not-exist" }),
				searchParams: Promise.resolve({}),
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("NEXT_NOT_FOUND"),
		});
		expect(mockNotFound).toHaveBeenCalled();
	});

	it("renders NewsletterSignup", async () => {
		render(await renderPage("software-comparisons"));
		expect(screen.getByTestId("newsletter-signup")).toBeInTheDocument();
	});
});
