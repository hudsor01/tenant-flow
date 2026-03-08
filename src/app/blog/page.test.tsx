/**
 * Blog Hub Page Tests
 *
 * Tests hub page composition: split content zones (Software Comparisons
 * horizontal scroll + Insights & Guides paginated grid), database-driven
 * category pills, and NewsletterSignup component.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockSetPage = vi.hoisted(() => vi.fn())

const mockUseBlogs = vi.hoisted(() => vi.fn())
const mockUseBlogCategories = vi.hoisted(() => vi.fn())
const mockUseComparisonPosts = vi.hoisted(() => vi.fn())

vi.mock('nuqs', () => ({
	parseAsInteger: {
		withDefault: () => ({
			parse: (v: string) => parseInt(v, 10),
		}),
	},
	useQueryState: () => [1, mockSetPage] as const,
}))

vi.mock('#hooks/api/use-blogs', () => ({
	useBlogs: mockUseBlogs,
	useBlogCategories: mockUseBlogCategories,
	useComparisonPosts: mockUseComparisonPosts,
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

vi.mock('#components/shared/blog-loading-skeleton', () => ({
	BlogLoadingSkeleton: () => (
		<div data-testid="blog-loading-skeleton">Loading...</div>
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

vi.mock('#components/layout/navbar', () => ({
	Navbar: () => <nav>Navbar</nav>,
}))

vi.mock('#components/layout/footer', () => ({
	default: () => <footer>Footer</footer>,
}))

vi.mock('#components/ui/grid-pattern', () => ({
	GridPattern: () => null,
}))

import BlogPage from './page'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

const mockComparisonPosts: BlogListItem[] = [
	{
		id: 'comp-1',
		title: 'AppFolio vs TenantFlow',
		slug: 'appfolio-vs-tenantflow',
		excerpt: 'Compare features side by side.',
		published_at: '2026-01-10T00:00:00Z',
		category: 'Software Comparisons',
		reading_time: 7,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['comparison'],
	},
	{
		id: 'comp-2',
		title: 'Buildium vs TenantFlow',
		slug: 'buildium-vs-tenantflow',
		excerpt: 'Which property management tool is right for you?',
		published_at: '2026-01-08T00:00:00Z',
		category: 'Software Comparisons',
		reading_time: 6,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['comparison'],
	},
	{
		id: 'comp-3',
		title: 'Yardi vs TenantFlow',
		slug: 'yardi-vs-tenantflow',
		excerpt: 'Enterprise vs modern property management.',
		published_at: '2026-01-05T00:00:00Z',
		category: 'Software Comparisons',
		reading_time: 8,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['comparison'],
	},
]

const mockCategories = [
	{
		name: 'Software Comparisons',
		slug: 'software-comparisons',
		post_count: 5,
	},
	{ name: 'Insights & Guides', slug: 'insights-guides', post_count: 8 },
]

const mockBlogPosts: BlogListItem[] = [
	{
		id: 'blog-1',
		title: 'How to Reduce Vacancy Rates',
		slug: 'reduce-vacancy-rates',
		excerpt: 'Practical strategies for property managers.',
		published_at: '2026-02-15T00:00:00Z',
		category: 'Insights & Guides',
		reading_time: 5,
		featured_image: 'https://example.com/images/vacancy.jpg',
		author_user_id: 'user-1',
		status: 'published',
		tags: ['management'],
	},
	{
		id: 'blog-2',
		title: 'Automating Rent Collection',
		slug: 'automating-rent-collection',
		excerpt: 'Step-by-step guide to automate payments.',
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
		title: 'Tenant Screening Best Practices',
		slug: 'tenant-screening',
		excerpt: 'Find reliable tenants every time.',
		published_at: '2026-02-05T00:00:00Z',
		category: 'Insights & Guides',
		reading_time: 6,
		featured_image: null,
		author_user_id: 'user-1',
		status: 'published',
		tags: ['screening'],
	},
]

const mockBlogData = {
	data: mockBlogPosts,
	total: 5,
	pagination: {
		page: 1,
		limit: 9,
		total: 5,
		totalPages: 2,
	},
}

function setupDefaultMocks() {
	mockUseBlogs.mockReturnValue({
		data: mockBlogData,
		isLoading: false,
	})
	mockUseBlogCategories.mockReturnValue({
		data: mockCategories,
		isLoading: false,
	})
	mockUseComparisonPosts.mockReturnValue({
		data: mockComparisonPosts,
		isLoading: false,
	})
}

describe('BlogPage (Hub)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		setupDefaultMocks()
	})

	it('renders Software Comparisons section heading', () => {
		render(<BlogPage />)
		expect(
			screen.getByRole('heading', { name: /software comparisons/i })
		).toBeInTheDocument()
	})

	it('renders BlogCard for each comparison post', () => {
		render(<BlogPage />)
		const cards = screen.getAllByTestId('blog-card')
		const comparisonCards = cards.filter(
			card =>
				card.getAttribute('data-post-id')?.startsWith('comp-')
		)
		expect(comparisonCards).toHaveLength(3)
	})

	it('comparisons zone has horizontal scroll container with scrollbar-hide class', () => {
		const { container } = render(<BlogPage />)
		const scrollContainer = container.querySelector('.scrollbar-hide')
		expect(scrollContainer).toBeInTheDocument()
	})

	it('renders category pills from useBlogCategories data with post counts', () => {
		render(<BlogPage />)
		const categoryLinks = screen
			.getAllByRole('link')
			.filter(link => link.getAttribute('href')?.startsWith('/blog/category/'))
		expect(categoryLinks).toHaveLength(2)
		expect(categoryLinks[0]).toHaveTextContent('Software Comparisons')
		expect(categoryLinks[0]).toHaveTextContent('(5)')
		expect(categoryLinks[1]).toHaveTextContent('Insights & Guides')
		expect(categoryLinks[1]).toHaveTextContent('(8)')
	})

	it('each category pill links to /blog/category/[slug]', () => {
		render(<BlogPage />)
		const links = screen.getAllByRole('link')
		const categoryLinks = links.filter(link => {
			const href = link.getAttribute('href')
			return href?.startsWith('/blog/category/')
		})
		expect(categoryLinks.length).toBeGreaterThanOrEqual(2)
		const hrefs = categoryLinks.map(l => l.getAttribute('href'))
		expect(hrefs).toContain('/blog/category/software-comparisons')
		expect(hrefs).toContain('/blog/category/insights-guides')
	})

	it('renders Insights & Guides section heading', () => {
		render(<BlogPage />)
		expect(
			screen.getByRole('heading', { name: /insights & guides/i })
		).toBeInTheDocument()
	})

	it('renders BlogCard for each blog post in grid zone', () => {
		render(<BlogPage />)
		const cards = screen.getAllByTestId('blog-card')
		const blogCards = cards.filter(
			card =>
				card.getAttribute('data-post-id')?.startsWith('blog-')
		)
		expect(blogCards).toHaveLength(3)
	})

	it('renders BlogPagination with correct totalPages', () => {
		render(<BlogPage />)
		const pagination = screen.getByTestId('blog-pagination')
		expect(pagination).toBeInTheDocument()
		expect(pagination.getAttribute('data-total-pages')).toBe('2')
	})

	it('renders NewsletterSignup component', () => {
		render(<BlogPage />)
		expect(screen.getByTestId('newsletter-signup')).toBeInTheDocument()
	})

	it('shows BlogLoadingSkeleton when comparisons or blogs are loading', () => {
		mockUseComparisonPosts.mockReturnValue({
			data: undefined,
			isLoading: true,
		})
		mockUseBlogs.mockReturnValue({
			data: undefined,
			isLoading: true,
		})
		render(<BlogPage />)
		const skeletons = screen.getAllByTestId('blog-loading-skeleton')
		expect(skeletons.length).toBeGreaterThanOrEqual(1)
	})

	it('does NOT render raw inline newsletter HTML', () => {
		render(<BlogPage />)
		const newsletterSignup = screen.getByTestId('newsletter-signup')
		expect(newsletterSignup).toBeInTheDocument()
		const emailInputs = document.querySelectorAll('input[type="email"]')
		const inputsOutsideComponent = Array.from(emailInputs).filter(
			input => !newsletterSignup.contains(input)
		)
		expect(inputsOutsideComponent).toHaveLength(0)
	})
})
