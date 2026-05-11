/**
 * Blog Hub Page Tests (Server Component / RSC pattern)
 *
 * Tests hub page composition: server-rendered post grid, category pills,
 * comparisons zone, breadcrumb visibility, empty-state branch.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'

const mockCreateClient = vi.hoisted(() => vi.fn())

vi.mock('#lib/supabase/server', () => ({
	createClient: mockCreateClient,
}))

vi.mock('next/link', () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode
		href: string
		className?: string
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}))

vi.mock('next/image', () => ({
	default: (props: Record<string, unknown>) => (
		<img
			src={props.src as string}
			alt={props.alt as string}
			data-testid="next-image"
		/>
	),
}))

vi.mock('#components/blog/blog-card', () => ({
	BlogCard: ({
		post,
		className,
	}: {
		post: { id: string; title: string }
		className?: string
	}) => (
		<div data-testid="blog-card" data-post-id={post.id} className={className}>
			{post.title}
		</div>
	),
}))

vi.mock('#components/blog/blog-pagination', () => ({
	BlogPagination: ({
		totalPages,
		className,
	}: {
		totalPages: number
		className?: string
	}) => (
		<div
			data-testid="blog-pagination"
			data-total-pages={totalPages}
			className={className}
		>
			Pagination
		</div>
	),
}))

vi.mock('#components/blog/newsletter-signup', () => ({
	NewsletterSignup: ({ className }: { className?: string }) => (
		<div data-testid="newsletter-signup" className={className}>
			NewsletterSignup
		</div>
	),
}))

vi.mock('#components/shared/blog-empty-state', () => ({
	BlogEmptyState: ({ message }: { message?: string }) => (
		<div data-testid="blog-empty-state">{message ?? 'No posts found'}</div>
	),
}))

vi.mock('#components/layout/page-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}))

vi.mock('#components/seo/json-ld-script', () => ({
	JsonLdScript: () => <script data-testid="json-ld" />,
}))

import BlogPage from './page'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

const mockPosts: BlogListItem[] = [
	{
		id: 'blog-1',
		title: 'How to Reduce Vacancy Rates',
		slug: 'reduce-vacancy-rates',
		excerpt: 'Practical strategies.',
		published_at: '2026-02-15T00:00:00Z',
		category: 'Insights & Guides',
		reading_time: 5,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['management'],
	},
	{
		id: 'blog-2',
		title: 'Automating Rent Collection',
		slug: 'automating-rent-collection',
		excerpt: 'Step-by-step guide.',
		published_at: '2026-02-10T00:00:00Z',
		category: 'Insights & Guides',
		reading_time: 4,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['automation'],
	},
	{
		id: 'blog-3',
		title: 'Tenant Screening',
		slug: 'tenant-screening',
		excerpt: 'Best practices.',
		published_at: '2026-02-05T00:00:00Z',
		category: 'Insights & Guides',
		reading_time: 6,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['screening'],
	},
]

const mockComparisons: BlogListItem[] = [
	{
		id: 'comp-1',
		title: 'AppFolio vs TenantFlow',
		slug: 'appfolio-vs-tenantflow',
		excerpt: 'Compare features.',
		published_at: '2026-01-10T00:00:00Z',
		category: 'Software Comparisons',
		reading_time: 7,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['comparison'],
	},
]

const mockCategories = [
	{ name: 'Software Comparisons', slug: 'software-comparisons', post_count: 5 },
	{ name: 'Insights & Guides', slug: 'insights-guides', post_count: 8 },
]

interface MockBuilderOpts {
	posts?: BlogListItem[]
	postsCount?: number | null
	comparisons?: BlogListItem[]
}

function makeFromBuilder({
	posts = mockPosts,
	postsCount = 18,
	comparisons = mockComparisons,
}: MockBuilderOpts = {}) {
	const fromMock = vi.fn((_table: string) => {
		// Each .from() call returns a fresh chain; we differentiate by checking
		// whether .contains() is invoked (comparisons path) vs. .range() (posts path).
		let isComparison = false
		const chain: Record<string, unknown> = {}
		chain.select = vi.fn(() => chain)
		chain.eq = vi.fn(() => chain)
		chain.order = vi.fn(() => chain)
		chain.contains = vi.fn(() => {
			isComparison = true
			return chain
		})
		chain.limit = vi.fn(() => Promise.resolve({ data: comparisons, count: null, error: null }))
		chain.range = vi.fn(() => Promise.resolve({ data: posts, count: postsCount, error: null }))
		// Thenable fallback for chains that get awaited without .range/.limit
		;(chain as { then?: unknown }).then = (
			resolve: (v: { data: BlogListItem[]; count: number | null; error: null }) => unknown
		) =>
			resolve(
				isComparison
					? { data: comparisons, count: null, error: null }
					: { data: posts, count: postsCount, error: null }
			)
		return chain
	})

	const rpcMock = vi.fn((name: string) => {
		if (name === 'get_blog_categories') {
			return Promise.resolve({ data: mockCategories, error: null })
		}
		return Promise.resolve({ data: null, error: null })
	})

	return { from: fromMock, rpc: rpcMock }
}

async function renderPage(opts?: MockBuilderOpts): Promise<ReactElement> {
	mockCreateClient.mockResolvedValue(makeFromBuilder(opts))
	const ui = await BlogPage({ searchParams: Promise.resolve({}) })
	return ui
}

describe('BlogPage (server component)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders breadcrumb nav landmark', async () => {
		render(await renderPage())
		expect(
			screen.getByRole('navigation', { name: /breadcrumb/i })
		).toBeInTheDocument()
	})

	it('renders BlogCard for each fetched post', async () => {
		render(await renderPage())
		const cards = screen.getAllByTestId('blog-card')
		const blogCards = cards.filter(c =>
			c.getAttribute('data-post-id')?.startsWith('blog-')
		)
		expect(blogCards).toHaveLength(3)
		expect(blogCards[0]).toHaveTextContent('How to Reduce Vacancy Rates')
	})

	it('renders pagination when totalPages > 1', async () => {
		render(await renderPage({ postsCount: 27 }))
		const pagination = screen.getByTestId('blog-pagination')
		expect(pagination.getAttribute('data-total-pages')).toBe('3')
	})

	it('does NOT render pagination when totalPages = 1', async () => {
		render(await renderPage({ postsCount: 3 }))
		expect(screen.queryByTestId('blog-pagination')).not.toBeInTheDocument()
	})

	it('renders empty-state branch when zero posts', async () => {
		render(await renderPage({ posts: [], postsCount: 0 }))
		expect(screen.getByTestId('blog-empty-state')).toBeInTheDocument()
	})

	it('renders category pills linking to /blog/category/[slug]', async () => {
		render(await renderPage())
		const categoryLinks = screen
			.getAllByRole('link')
			.filter(link => link.getAttribute('href')?.startsWith('/blog/category/'))
		expect(categoryLinks).toHaveLength(2)
		const hrefs = categoryLinks.map(l => l.getAttribute('href'))
		expect(hrefs).toContain('/blog/category/software-comparisons')
		expect(hrefs).toContain('/blog/category/insights-guides')
	})

	it('renders Software Comparisons section when comparisons exist', async () => {
		render(await renderPage())
		expect(
			screen.getByRole('heading', { name: /software comparisons/i })
		).toBeInTheDocument()
		const compCards = screen
			.getAllByTestId('blog-card')
			.filter(c => c.getAttribute('data-post-id')?.startsWith('comp-'))
		expect(compCards.length).toBeGreaterThanOrEqual(1)
	})

	it('does NOT render Software Comparisons section when zero comparisons', async () => {
		render(await renderPage({ comparisons: [] }))
		expect(
			screen.queryByRole('heading', { name: /software comparisons/i })
		).not.toBeInTheDocument()
	})

	it('renders NewsletterSignup', async () => {
		render(await renderPage())
		expect(screen.getByTestId('newsletter-signup')).toBeInTheDocument()
	})
})
