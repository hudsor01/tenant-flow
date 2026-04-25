/**
 * Blog Detail Page Tests
 *
 * Tests for the blog article detail page: featured image with blur-fade,
 * simplified prose, related posts section, category link in meta bar.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// --- Hoisted mocks ---

const mockUseBlogBySlug = vi.hoisted(() => vi.fn())
const mockUseRelatedPosts = vi.hoisted(() => vi.fn())
const mockUseBlogCategories = vi.hoisted(() => vi.fn())

vi.mock('#hooks/api/use-blogs', () => ({
	useBlogBySlug: mockUseBlogBySlug,
	useRelatedPosts: mockUseRelatedPosts,
	useBlogCategories: mockUseBlogCategories,
}))

vi.mock('next/navigation', () => ({
	useParams: () => ({ slug: 'test-post' }),
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
			data-testid="featured-image"
		/>
	),
}))

vi.mock('next/dynamic', () => ({
	default: (importFn: () => Promise<{ default: React.ComponentType<{ content: string }> }>) => {
		const Component = (props: { content: string }) => (
			<div data-testid="markdown-content">{props.content}</div>
		)
		// Eagerly resolve the import so component renders synchronously in tests
		importFn()
		Component.displayName = 'DynamicMarkdownContent'
		return Component
	},
}))

vi.mock('#components/blog/blog-card', () => ({
	BlogCard: ({ post }: { post: { id: string; title: string } }) => (
		<div data-testid="blog-card">{post.title}</div>
	),
}))

vi.mock('#components/blog/newsletter-signup', () => ({
	NewsletterSignup: () => (
		<div data-testid="newsletter-signup">Newsletter</div>
	),
}))

vi.mock('#components/blog/lead-magnet-cta', () => ({
	LeadMagnetCta: () => (
		<div data-testid="lead-magnet-cta">Lead Magnet</div>
	),
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

vi.mock('#components/ui/button', () => ({
	Button: ({
		children,
		...props
	}: {
		children: React.ReactNode
		asChild?: boolean
		size?: string
		className?: string
	}) => <button {...props}>{children}</button>,
}))

vi.mock('lucide-react', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>()
	return {
		...actual,
		ArrowLeft: () => <span data-testid="arrow-left" />,
		ArrowRight: () => <span data-testid="arrow-right" />,
		Clock: () => <span data-testid="clock-icon" />,
		User: () => <span data-testid="user-icon" />,
	}
})

import BlogArticlePage from './blog-post-page'

// --- Mock data ---

const mockPost = {
	id: 'post-1',
	title: 'Managing Rental Properties in 2026',
	slug: 'test-post',
	excerpt: 'A comprehensive guide to property management.',
	content: '## Introduction\n\nThis is the article content.',
	published_at: '2026-02-15T10:00:00Z',
	category: 'Property Management',
	reading_time: 8,
	featured_image: 'https://example.com/images/featured.jpg',
	author_user_id: 'user-123',
	status: 'published' as const,
	meta_description: 'Guide to property management',
	tags: ['management', 'tips'],
	created_at: '2026-02-10T10:00:00Z',
	updated_at: '2026-02-15T10:00:00Z',
}

const mockPostNoImage = {
	...mockPost,
	featured_image: null,
}

const mockRelatedPosts = [
	{
		id: 'rp-1',
		title: 'Tenant Screening Best Practices',
		slug: 'tenant-screening',
		excerpt: 'How to screen tenants effectively.',
		published_at: '2026-02-10T10:00:00Z',
		category: 'Property Management',
		reading_time: 5,
		featured_image: null,
		author_user_id: 'user-123',
		status: 'published' as const,
		tags: ['screening'],
	},
	{
		id: 'rp-2',
		title: 'Lease Renewal Strategies',
		slug: 'lease-renewal',
		excerpt: 'Keep good tenants longer.',
		published_at: '2026-02-08T10:00:00Z',
		category: 'Property Management',
		reading_time: 6,
		featured_image: 'https://example.com/images/lease.jpg',
		author_user_id: 'user-123',
		status: 'published' as const,
		tags: ['leases'],
	},
	{
		id: 'rp-3',
		title: 'Maintenance Request Workflow',
		slug: 'maintenance-workflow',
		excerpt: 'Streamline your maintenance process.',
		published_at: '2026-02-05T10:00:00Z',
		category: 'Property Management',
		reading_time: 4,
		featured_image: null,
		author_user_id: 'user-123',
		status: 'published' as const,
		tags: ['maintenance'],
	},
]

const mockCategories = [
	{ name: 'Property Management', slug: 'property-management', post_count: 12 },
	{ name: 'Software Comparisons', slug: 'software-comparisons', post_count: 5 },
]

describe('BlogArticlePage', () => {
	beforeEach(() => {
		mockUseBlogBySlug.mockReturnValue({
			data: mockPost,
			isLoading: false,
		})
		mockUseRelatedPosts.mockReturnValue({
			data: mockRelatedPosts,
			isLoading: false,
		})
		mockUseBlogCategories.mockReturnValue({
			data: mockCategories,
			isLoading: false,
		})
	})

	it('renders featured image with next/image when post.featured_image exists', () => {
		render(<BlogArticlePage />)
		const image = screen.getByTestId('featured-image')
		expect(image).toBeInTheDocument()
		expect(image).toHaveAttribute('src', 'https://example.com/images/featured.jpg')
	})

	it('does NOT render featured image when post.featured_image is null', () => {
		mockUseBlogBySlug.mockReturnValue({
			data: mockPostNoImage,
			isLoading: false,
		})
		render(<BlogArticlePage />)
		expect(screen.queryByTestId('featured-image')).not.toBeInTheDocument()
	})

	it('renders category name in meta bar linked to /blog/category/[slug]', () => {
		render(<BlogArticlePage />)
		const categoryLink = screen.getByRole('link', { name: 'Property Management' })
		expect(categoryLink).toHaveAttribute('href', '/blog/category/property-management')
	})

	it('renders author name and reading time in meta bar', () => {
		render(<BlogArticlePage />)
		expect(screen.getByText('TenantFlow Team')).toBeInTheDocument()
		expect(screen.getByText('8 min read')).toBeInTheDocument()
	})

	it('renders prose wrapper with simplified classes (no [&>selector] overrides)', () => {
		const { container } = render(<BlogArticlePage />)
		const proseDiv = container.querySelector('.prose')
		expect(proseDiv).toBeInTheDocument()
		expect(proseDiv).toHaveClass('prose-lg')
		// Should NOT contain arbitrary selector overrides
		const classStr = proseDiv?.className ?? ''
		expect(classStr).not.toContain('[&>')
	})

	it('renders MarkdownContent with post content', () => {
		render(<BlogArticlePage />)
		const markdown = screen.getByTestId('markdown-content')
		expect(markdown).toBeInTheDocument()
		expect(markdown).toHaveTextContent('## Introduction')
	})

	it('renders Related Articles section heading', () => {
		render(<BlogArticlePage />)
		expect(
			screen.getByRole('heading', { name: 'Related Articles' })
		).toBeInTheDocument()
	})

	it('renders BlogCard for each related post (up to 3)', () => {
		render(<BlogArticlePage />)
		const cards = screen.getAllByTestId('blog-card')
		expect(cards).toHaveLength(3)
		expect(cards[0]).toHaveTextContent('Tenant Screening Best Practices')
		expect(cards[1]).toHaveTextContent('Lease Renewal Strategies')
		expect(cards[2]).toHaveTextContent('Maintenance Request Workflow')
	})

	it('does NOT render raw inline newsletter section (no bare input[type=email])', () => {
		const { container } = render(<BlogArticlePage />)
		const emailInputs = container.querySelectorAll('input[type="email"]')
		expect(emailInputs).toHaveLength(0)
	})

	it('shows loading state when post is loading', () => {
		mockUseBlogBySlug.mockReturnValue({
			data: undefined,
			isLoading: true,
		})
		const { container } = render(<BlogArticlePage />)
		// blog-post-page renders raw animate-pulse divs (not the Skeleton
		// primitive) for its branded loading shimmer.
		const skeletons = container.querySelectorAll('.animate-pulse')
		expect(skeletons.length).toBeGreaterThan(0)
	})

	it('shows not-found state when post is null', () => {
		mockUseBlogBySlug.mockReturnValue({
			data: null,
			isLoading: false,
		})
		render(<BlogArticlePage />)
		expect(screen.getByText('Blog Post Not Found')).toBeInTheDocument()
	})
})
