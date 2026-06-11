/**
 * Blog Article Page Tests
 *
 * Tests cover two layers:
 *   1) `blog-post-page.tsx` (client component) — image blur-fade, prose
 *      wrapper, related posts, meta bar. Tests pass the post via props.
 *   2) `page.tsx` (server entry) — generateMetadata wires `alternates.canonical`
 *      from `post.canonical_url` (Blocker-#1 fix) and `openGraph.images` to
 *      `/api/og/blog/{slug}`.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mocks ---

// `useBlogBySlug` was removed when the page was refactored to receive
// `post` directly from the server (so the article body lands in initial
// HTML for SEO). Tests now pass the post via props instead of mocking
// the fetcher. `useBlogCategories` was also dropped — the slug is now
// derived locally from `post.category` rather than fetched.
const mockUseRelatedPosts = vi.hoisted(() => vi.fn());

vi.mock("#hooks/api/use-blogs", () => ({
	useRelatedPosts: mockUseRelatedPosts,
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

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => (
		<img
			src={props.src as string}
			alt={props.alt as string}
			data-testid="featured-image"
		/>
	),
}));

// MarkdownContent is now a direct (server-renderable) import — the
// previous `dynamic(import, { ssr: false })` wrapper was dropped so
// the article body lands in initial HTML for SEO/AI-crawler visibility.
// Tests mock the module directly instead of through `next/dynamic`.
vi.mock("./markdown-content", () => ({
	default: (props: { content: string }) => (
		<div data-testid="markdown-content">{props.content}</div>
	),
}));

vi.mock("#components/blog/blog-card", () => ({
	BlogCard: ({ post }: { post: { id: string; title: string } }) => (
		<div data-testid="blog-card">{post.title}</div>
	),
}));

vi.mock("#components/blog/newsletter-signup", () => ({
	NewsletterSignup: () => <div data-testid="newsletter-signup">Newsletter</div>,
}));

vi.mock("#components/blog/lead-magnet-cta", () => ({
	LeadMagnetCta: () => <div data-testid="lead-magnet-cta">Lead Magnet</div>,
}));

vi.mock("#components/layout/page-layout", () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}));

vi.mock("#components/ui/button", () => ({
	Button: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		size?: string;
		className?: string;
	}) => <button {...props}>{children}</button>,
}));

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		ArrowLeft: () => <span data-testid="arrow-left" />,
		ArrowRight: () => <span data-testid="arrow-right" />,
		Clock: () => <span data-testid="clock-icon" />,
		User: () => <span data-testid="user-icon" />,
	};
});

import BlogArticlePage from "./blog-post-page";

// --- Mock data ---

const mockPost = {
	id: "post-1",
	title: "Managing Rental Properties in 2026",
	slug: "test-post",
	excerpt: "A comprehensive guide to property management.",
	content: "## Introduction\n\nThis is the article content.",
	published_at: "2026-02-15T10:00:00Z",
	category: "Property Management",
	reading_time: 8,
	featured_image: "https://example.com/images/featured.jpg",
	author_user_id: "user-123",
	status: "published" as const,
	meta_description: "Guide to property management",
	tags: ["management", "tips"],
	created_at: "2026-02-10T10:00:00Z",
	updated_at: "2026-02-15T10:00:00Z",
};

const mockPostNoImage = {
	...mockPost,
	featured_image: null,
};

const mockRelatedPosts = [
	{
		id: "rp-1",
		title: "Tenant Screening Best Practices",
		slug: "tenant-screening",
		excerpt: "How to screen tenants effectively.",
		published_at: "2026-02-10T10:00:00Z",
		category: "Property Management",
		reading_time: 5,
		featured_image: null,
		author_user_id: "user-123",
		status: "published" as const,
		tags: ["screening"],
	},
	{
		id: "rp-2",
		title: "Lease Renewal Strategies",
		slug: "lease-renewal",
		excerpt: "Keep good tenants longer.",
		published_at: "2026-02-08T10:00:00Z",
		category: "Property Management",
		reading_time: 6,
		featured_image: "https://example.com/images/lease.jpg",
		author_user_id: "user-123",
		status: "published" as const,
		tags: ["leases"],
	},
	{
		id: "rp-3",
		title: "Maintenance Request Workflow",
		slug: "maintenance-workflow",
		excerpt: "Streamline your maintenance process.",
		published_at: "2026-02-05T10:00:00Z",
		category: "Property Management",
		reading_time: 4,
		featured_image: null,
		author_user_id: "user-123",
		status: "published" as const,
		tags: ["maintenance"],
	},
];

describe("BlogArticlePage", () => {
	beforeEach(() => {
		mockUseRelatedPosts.mockReturnValue({
			data: mockRelatedPosts,
			isLoading: false,
		});
	});

	it("renders featured image with next/image when post.featured_image exists", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		const image = screen.getByTestId("featured-image");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute(
			"src",
			"https://example.com/images/featured.jpg",
		);
	});

	it("falls back to the generated per-post cover when featured_image is null", () => {
		render(<BlogArticlePage post={mockPostNoImage} slug="test-post" />);
		// Unique on-brand cover from /api/og/blog/[slug] — every post gets hero
		// art, never a bare header.
		const image = screen.getByTestId("featured-image");
		expect(image).toHaveAttribute("src", "/api/og/blog/test-post");
	});

	it("renders category name in meta bar linked to /blog/category/[slug]", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		const categoryLink = screen.getByRole("link", {
			name: "Property Management",
		});
		expect(categoryLink).toHaveAttribute(
			"href",
			"/blog/category/property-management",
		);
	});

	it("renders author name and reading time in meta bar", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		expect(screen.getByText("TenantFlow Team")).toBeInTheDocument();
		expect(screen.getByText("8 min read")).toBeInTheDocument();
	});

	it("renders prose wrapper with simplified classes (no [&>selector] overrides)", () => {
		const { container } = render(
			<BlogArticlePage post={mockPost} slug="test-post" />,
		);
		const proseDiv = container.querySelector(".prose");
		expect(proseDiv).toBeInTheDocument();
		expect(proseDiv).toHaveClass("prose-lg");
		// Should NOT contain arbitrary selector overrides
		const classStr = proseDiv?.className ?? "";
		expect(classStr).not.toContain("[&>");
	});

	it("renders MarkdownContent with post content", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		const markdown = screen.getByTestId("markdown-content");
		expect(markdown).toBeInTheDocument();
		expect(markdown).toHaveTextContent("## Introduction");
	});

	it("renders Related Articles section heading", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		expect(
			screen.getByRole("heading", { name: "Related Articles" }),
		).toBeInTheDocument();
	});

	it("renders BlogCard for each related post (up to 3)", () => {
		render(<BlogArticlePage post={mockPost} slug="test-post" />);
		const cards = screen.getAllByTestId("blog-card");
		expect(cards).toHaveLength(3);
		expect(cards[0]).toHaveTextContent("Tenant Screening Best Practices");
		expect(cards[1]).toHaveTextContent("Lease Renewal Strategies");
		expect(cards[2]).toHaveTextContent("Maintenance Request Workflow");
	});

	it("does NOT render raw inline newsletter section (no bare input[type=email])", () => {
		const { container } = render(
			<BlogArticlePage post={mockPost} slug="test-post" />,
		);
		const emailInputs = container.querySelectorAll('input[type="email"]');
		expect(emailInputs).toHaveLength(0);
	});

	// Loading + not-found tests removed: the server `page.tsx` now
	// resolves `post` before this client component renders, calling
	// `notFound()` for missing slugs and never reaching this component
	// with null post. The page-level loading skeleton branch (which
	// fired while `useBlogBySlug` was loading) was removed when that
	// hook was dropped. MarkdownContent is now a server-renderable
	// direct import, no `dynamic({ ssr: false })` skeleton remains.
});

// ---------------------------------------------------------------------------
// Server-entry tests: generateMetadata canonical/OG wiring (Plan 06-02, Task 2)
//
// `generateMetadata` is the surface that fixes audit-Blocker-#1: the per-post
// canonical URL lives in <head> via Next.js Metadata API, NOT in the markdown
// body. These tests pin two branches:
//   - `post.canonical_url` non-null → that URL becomes `alternates.canonical`
//   - `post.canonical_url` null     → fall back to `/blog/{slug}`
//
// Plus they pin the `openGraph.images[0].url` → `/api/og/blog/{slug}` wiring
// added in Plan 06-02 Task 2.
// ---------------------------------------------------------------------------

// getBlogPost uses the cookie-less anon client (`@supabase/supabase-js`
// createClient) — NOT `#lib/supabase/server` — so that `/blog/[slug]`
// stays a `●` SSG route and `dynamicParams = false` enforces real 404s.
// The mock therefore targets `@supabase/supabase-js`; `importOriginal`
// keeps the module's other exports intact.
const mockSupabaseCreateClient = vi.hoisted(() => vi.fn());
const mockServerNotFound = vi.hoisted(() =>
	vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
);

vi.mock("@supabase/supabase-js", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return { ...actual, createClient: mockSupabaseCreateClient };
});

vi.mock("next/navigation", () => ({
	notFound: mockServerNotFound,
}));

vi.mock("#lib/frontend-logger", () => ({
	createLogger: () => ({
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	}),
}));

interface BlogRow {
	title: string;
	slug: string;
	published_at: string | null;
	updated_at: string | null;
	featured_image: string | null;
	content: string;
	reading_time: number | null;
	category: string | null;
	meta_description: string | null;
	excerpt: string | null;
	tags: string[] | null;
	canonical_url: string | null;
}

function makeSupabaseClient(row: BlogRow | null) {
	const builder = {
		select: vi.fn(() => builder),
		eq: vi.fn(() => builder),
		single: vi.fn(() =>
			Promise.resolve({
				data: row,
				error: row === null ? { code: "PGRST116" } : null,
			}),
		),
	};
	return {
		from: vi.fn(() => builder),
	};
}

describe("generateMetadata (server entry)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sets alternates.canonical to post.canonical_url when non-null (Blocker-#1 fix)", async () => {
		const row: BlogRow = {
			title: "TenantFlow vs Buildium",
			slug: "tenantflow-vs-buildium",
			published_at: "2026-05-01T00:00:00Z",
			updated_at: null,
			featured_image: null,
			content: "## Intro\n\nbody",
			reading_time: 6,
			category: "Software & Vault",
			meta_description: "An honest comparison.",
			excerpt: "An honest comparison.",
			tags: ["comparison"],
			canonical_url: "/compare/buildium",
		};
		mockSupabaseCreateClient.mockReturnValue(makeSupabaseClient(row));

		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ slug: "tenantflow-vs-buildium" }),
		});

		expect(metadata.alternates?.canonical).toBe("/compare/buildium");
		// og:url mirrors the canonical so the OG + <link rel=canonical>
		// signals agree (seo-smoke.spec.ts "/blog/[slug] has Article schema").
		expect(metadata.openGraph?.url).toBe("/compare/buildium");
	});

	it("falls back to /blog/{slug} canonical when post.canonical_url is null", async () => {
		const row: BlogRow = {
			title: "A Generic Post",
			slug: "a-generic-post",
			published_at: "2026-05-01T00:00:00Z",
			updated_at: null,
			featured_image: null,
			content: "## Intro\n\nbody",
			reading_time: 4,
			category: "Lease Law",
			meta_description: "A generic description.",
			excerpt: "A generic description.",
			tags: ["guide"],
			canonical_url: null,
		};
		mockSupabaseCreateClient.mockReturnValue(makeSupabaseClient(row));

		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ slug: "a-generic-post" }),
		});

		expect(metadata.alternates?.canonical).toBe("/blog/a-generic-post");
		// og:url falls back to the post's own URL alongside the canonical.
		expect(metadata.openGraph?.url).toBe("/blog/a-generic-post");
	});

	it("wires openGraph.images[0].url to /api/og/blog/{slug}", async () => {
		const row: BlogRow = {
			title: "Some Post",
			slug: "some-post",
			published_at: "2026-05-01T00:00:00Z",
			updated_at: null,
			featured_image: null,
			content: "## Intro\n\nbody",
			reading_time: 4,
			category: "Maintenance",
			meta_description: "Maintenance guide.",
			excerpt: "Maintenance guide.",
			tags: ["maintenance"],
			canonical_url: null,
		};
		mockSupabaseCreateClient.mockReturnValue(makeSupabaseClient(row));

		const { generateMetadata } = await import("./page");
		const metadata = await generateMetadata({
			params: Promise.resolve({ slug: "some-post" }),
		});

		const ogImages = metadata.openGraph?.images as
			| Array<{ url: string; width?: number; height?: number; alt?: string }>
			| undefined;
		expect(ogImages).toBeDefined();
		expect(ogImages?.[0]?.url).toBe("/api/og/blog/some-post");
		expect(ogImages?.[0]?.width).toBe(1200);
		expect(ogImages?.[0]?.height).toBe(630);

		const twitterImages = metadata.twitter?.images as string[] | undefined;
		expect(twitterImages?.[0]).toBe("/api/og/blog/some-post");
	});

	it("calls notFound() when getBlogPost returns null", async () => {
		mockSupabaseCreateClient.mockReturnValue(makeSupabaseClient(null));

		const { generateMetadata } = await import("./page");
		await expect(
			generateMetadata({
				params: Promise.resolve({ slug: "unknown" }),
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("NEXT_NOT_FOUND"),
		});
		expect(mockServerNotFound).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// generateStaticParams — retry + fail-the-build behavior.
//
// The placeholder-env skip branch is exercised on every PR by the CI
// `checks` job (it runs `next build` with
// NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co). These tests
// cover the two branches that job cannot reach: transient-failure recovery,
// and throw-after-persistent-failure (which fails the build instead of
// shipping [] — a catalogue-wide 404 under dynamicParams=false).
// ---------------------------------------------------------------------------

/**
 * Mock Supabase client whose successive `.from().select().eq()` chains each
 * resolve to the next entry in `resultSequence` (the last entry repeats, so
 * a one-element sequence models a persistent failure).
 */
function makeEnumClient(
	resultSequence: Array<{
		data: Array<{ slug: string }> | null;
		error: { message: string; code: string } | null;
	}>,
) {
	let attempt = 0;
	return {
		from: () => {
			const result =
				resultSequence[Math.min(attempt, resultSequence.length - 1)];
			attempt += 1;
			const builder = {
				select: () => builder,
				eq: () => Promise.resolve(result),
			};
			return builder;
		},
	};
}

describe("generateStaticParams (retry + fail-safe)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("recovers when an early attempt fails and a later one succeeds", async () => {
		mockSupabaseCreateClient.mockReturnValue(
			makeEnumClient([
				{ data: null, error: { message: "transient blip", code: "" } },
				{ data: [{ slug: "recovered-post" }], error: null },
			]),
		);

		const { generateStaticParams } = await import("./page");
		const params = await generateStaticParams();

		expect(params).toEqual([{ slug: "recovered-post" }]);
	});

	it("throws after the query fails every attempt — fails the build, not []", async () => {
		mockSupabaseCreateClient.mockReturnValue(
			makeEnumClient([
				{
					data: null,
					error: { message: "supabase down", code: "PGRST500" },
				},
			]),
		);

		const { generateStaticParams } = await import("./page");
		await expect(generateStaticParams()).rejects.toMatchObject({
			message: expect.stringContaining("failed after 3 attempts"),
		});
	}, 10000);
});
