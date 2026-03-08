/**
 * Blog Category Page Tests
 *
 * Tests for the blog category page: DB-resolved names, pagination,
 * empty state, newsletter signup, redirect for unknown slugs.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// --- Hoisted mocks ---

const mockUseBlogCategories = vi.hoisted(() => vi.fn())
const mockUseBlogsByCategory = vi.hoisted(() => vi.fn())
const mockReplace = vi.hoisted(() => vi.fn())
const mockSetPage = vi.hoisted(() => vi.fn())
const mockPage = vi.hoisted(() => ({ value: 1 }))

vi.mock('#hooks/api/use-blogs', () => ({
	useBlogCategories: mockUseBlogCategories,
	useBlogsByCategory: mockUseBlogsByCategory,
}))

vi.mock('next/navigation', () => ({
	useParams: () => ({ category: 'software-comparisons' }),
	useRouter: () => ({ replace: mockReplace }),
}))

vi.mock('nuqs', () => ({
	parseAsInteger: {
		withDefault: () => ({
			parse: (v: string) => parseInt(v, 10),
		}),
	},
	useQueryState: () => [mockPage.value, mockSetPage] as const,
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

vi.mock('#components/blog/blog-card', () => ({
	BlogCard: ({ post }: { post: { id: string; title: string } }) => (
		<div data-testid="blog-card">{post.title}</div>
	),
}))

vi.mock('#components/blog/blog-pagination', () => ({
	BlogPagination: ({ totalPages }: { totalPages: number }) => (
		<nav data-testid="blog-pagination">Pages: {totalPages}</nav>
	),
}))

vi.mock('#components/blog/newsletter-signup', () => ({
	NewsletterSignup: ({ className }: { className?: string }) => (
		<div data-testid="newsletter-signup" className={className}>
			Newsletter
		</div>
	),
}))

vi.mock('#components/shared/blog-empty-state', () => ({
	BlogEmptyState: () => <div data-testid="blog-empty-state">No posts</div>,
}))

vi.mock('#components/shared/blog-loading-skeleton', () => ({
	BlogLoadingSkeleton: () => (
		<div data-testid="blog-loading-skeleton">Loading...</div>
	),
}))

vi.mock('#components/layout/page-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}))

vi.mock('lucide-react', () => ({
	ArrowLeft: () => <span data-testid="arrow-left" />,
}))

import BlogCategoryPage from './page'

// --- Mock data ---

const mockCategories = [
	{ name: 'Software Comparisons', slug: 'software-comparisons', post_count: 5 },
	{ name: 'Property Management', slug: 'property-management', post_count: 12 },
]

const mockBlogData = {
	data: [
		{
			id: 'post-1',
			title: 'Best Property Management Software 2026',
			slug: 'best-pm-software-2026',
			excerpt: 'Compare the top property management tools.',
			published_at: '2026-02-15T10:00:00Z',
			category: 'Software Comparisons',
			reading_time: 10,
			featured_image: 'https://example.com/images/software.jpg',
			author_user_id: 'user-1',
			status: 'published',
			tags: ['comparison'],
		},
		{
			id: 'post-2',
			title: 'Buildium vs AppFolio Review',
			slug: 'buildium-vs-appfolio',
			excerpt: 'Head-to-head comparison.',
			published_at: '2026-02-10T10:00:00Z',
			category: 'Software Comparisons',
			reading_time: 7,
			featured_image: null,
			author_user_id: 'user-1',
			status: 'published',
			tags: ['comparison'],
		},
		{
			id: 'post-3',
			title: 'TenantFlow vs Competitors',
			slug: 'tenantflow-vs-competitors',
			excerpt: 'Why TenantFlow wins.',
			published_at: '2026-02-05T10:00:00Z',
			category: 'Software Comparisons',
			reading_time: 8,
			featured_image: 'https://example.com/images/compare.jpg',
			author_user_id: 'user-1',
			status: 'published',
			tags: ['comparison'],
		},
	],
	total: 5,
	pagination: {
		page: 1,
		limit: 9,
		total: 5,
		totalPages: 2,
	},
}

describe('BlogCategoryPage', () => {
	beforeEach(() => {
		mockReplace.mockClear()
		mockPage.value = 1

		mockUseBlogCategories.mockReturnValue({
			data: mockCategories,
			isLoading: false,
		})
		mockUseBlogsByCategory.mockReturnValue({
			data: mockBlogData,
			isLoading: false,
		})
	})

	it('renders category name from database (not deslugified from URL)', () => {
		render(<BlogCategoryPage />)
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
			'Software Comparisons'
		)
	})

	it('renders article count from PaginatedResponse.total', () => {
		render(<BlogCategoryPage />)
		expect(screen.getByText(/5 articles/)).toBeInTheDocument()
	})

	it('renders BlogCard for each post in category', () => {
		render(<BlogCategoryPage />)
		const cards = screen.getAllByTestId('blog-card')
		expect(cards).toHaveLength(3)
		expect(cards[0]).toHaveTextContent('Best Property Management Software 2026')
	})

	it('renders BlogPagination with correct totalPages', () => {
		render(<BlogCategoryPage />)
		const pagination = screen.getByTestId('blog-pagination')
		expect(pagination).toHaveTextContent('Pages: 2')
	})

	it('renders NewsletterSignup component', () => {
		render(<BlogCategoryPage />)
		expect(screen.getByTestId('newsletter-signup')).toBeInTheDocument()
	})

	it('renders BlogEmptyState when known category has zero posts (PAGE-05)', () => {
		mockUseBlogsByCategory.mockReturnValue({
			data: {
				data: [],
				total: 0,
				pagination: { page: 1, limit: 9, total: 0, totalPages: 0 },
			},
			isLoading: false,
		})
		render(<BlogCategoryPage />)
		expect(screen.getByTestId('blog-empty-state')).toBeInTheDocument()
	})

	it('redirects to /blog when slug not found in categories (after loading completes)', () => {
		mockUseBlogCategories.mockReturnValue({
			data: [{ name: 'Other Category', slug: 'other-category', post_count: 3 }],
			isLoading: false,
		})
		render(<BlogCategoryPage />)
		expect(mockReplace).toHaveBeenCalledWith('/blog')
	})

	it('does NOT redirect while categories are still loading', () => {
		mockUseBlogCategories.mockReturnValue({
			data: undefined,
			isLoading: true,
		})
		render(<BlogCategoryPage />)
		expect(mockReplace).not.toHaveBeenCalled()
	})

	it('does NOT render raw inline newsletter HTML', () => {
		const { container } = render(<BlogCategoryPage />)
		const emailInputs = container.querySelectorAll('input[type="email"]')
		expect(emailInputs).toHaveLength(0)
	})

	it('shows loading skeleton while data is loading', () => {
		mockUseBlogCategories.mockReturnValue({
			data: mockCategories,
			isLoading: false,
		})
		mockUseBlogsByCategory.mockReturnValue({
			data: undefined,
			isLoading: true,
		})
		render(<BlogCategoryPage />)
		expect(screen.getByTestId('blog-loading-skeleton')).toBeInTheDocument()
	})
})
