/**
 * RelatedArticles Server Component Tests
 *
 * Smoke tests for the async Server Component that renders a grid of
 * BlogCard instances for given blog slugs. Tests call the component
 * function directly and assert on the returned React element.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

// ── Hoisted mock variables ────────────────────────────────────────────────────

const mockOrder = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn())
const mockIn = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())
const mockCreateClient = vi.hoisted(() => vi.fn())

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('#lib/supabase/server', () => ({
	createClient: mockCreateClient,
}))

vi.mock('#components/blog/blog-card', () => ({
	BlogCard: ({ post }: { post: BlogListItem }) => (
		<div data-testid="blog-card">{post.title}</div>
	),
}))

// ── Setup supabase chain ──────────────────────────────────────────────────────

function setupSupabaseChain(returnData: BlogListItem[] | null) {
	mockOrder.mockResolvedValueOnce({ data: returnData })
	mockEq.mockReturnValue({ order: mockOrder })
	mockIn.mockReturnValue({ eq: mockEq })
	mockSelect.mockReturnValue({ in: mockIn })
	mockFrom.mockReturnValue({ select: mockSelect })
	mockCreateClient.mockResolvedValue({ from: mockFrom })
}

// ── Test data ─────────────────────────────────────────────────────────────────

const mockPost1: BlogListItem = {
	id: 'post-1',
	title: 'Seasonal Maintenance Guide',
	slug: 'preventive-maintenance-checklist-rental-properties-seasonal-guide',
	excerpt: 'Keep your rental property in top shape.',
	published_at: '2026-01-01T00:00:00Z',
	category: 'Maintenance',
	reading_time: 5,
	featured_image: null,
	author_user_id: 'user-1',
	status: 'published',
	tags: ['maintenance'],
}

const mockPost2: BlogListItem = {
	id: 'post-2',
	title: 'Tax Deductions for Landlords',
	slug: 'landlord-tax-deductions-missing-2025',
	excerpt: 'Stop leaving money on the table.',
	published_at: '2026-02-01T00:00:00Z',
	category: 'Finance',
	reading_time: 8,
	featured_image: null,
	author_user_id: 'user-1',
	status: 'published',
	tags: ['tax'],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RelatedArticles', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when slugs array is empty', async () => {
		const { RelatedArticles } = await import('./related-articles')
		const result = await RelatedArticles({ slugs: [] })
		expect(result).toBeNull()
	})

	it('returns null when Supabase returns no matching posts', async () => {
		setupSupabaseChain([])
		const { RelatedArticles } = await import('./related-articles')
		const result = await RelatedArticles({
			slugs: ['some-slug'],
		})
		expect(result).toBeNull()
	})

	it('returns null when Supabase returns null data', async () => {
		setupSupabaseChain(null)
		const { RelatedArticles } = await import('./related-articles')
		const result = await RelatedArticles({
			slugs: ['some-slug'],
		})
		expect(result).toBeNull()
	})

	it('renders section with default heading when posts found', async () => {
		setupSupabaseChain([mockPost1, mockPost2])
		const { render, screen } = await import('@testing-library/react')
		const { RelatedArticles } = await import('./related-articles')
		const element = await RelatedArticles({
			slugs: [mockPost1.slug, mockPost2.slug],
		})
		if (!element) throw new Error('Expected non-null element')
		render(element)
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'Related Articles'
		)
	})

	it('renders custom title prop in h2', async () => {
		setupSupabaseChain([mockPost1])
		const { render, screen } = await import('@testing-library/react')
		const { RelatedArticles } = await import('./related-articles')
		const element = await RelatedArticles({
			slugs: [mockPost1.slug],
			title: 'Keep Reading',
		})
		if (!element) throw new Error('Expected non-null element')
		render(element)
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'Keep Reading'
		)
	})

	it('renders a BlogCard for each returned post', async () => {
		setupSupabaseChain([mockPost1, mockPost2])
		const { render, screen } = await import('@testing-library/react')
		const { RelatedArticles } = await import('./related-articles')
		const element = await RelatedArticles({
			slugs: [mockPost1.slug, mockPost2.slug],
		})
		if (!element) throw new Error('Expected non-null element')
		render(element)
		const cards = screen.getAllByTestId('blog-card')
		expect(cards).toHaveLength(2)
		expect(cards[0]).toHaveTextContent('Seasonal Maintenance Guide')
		expect(cards[1]).toHaveTextContent('Tax Deductions for Landlords')
	})
})
