/**
 * Blog Hub Loading UI Tests (Next.js streaming boundary fallback)
 *
 * This suite asserts the CONTENTS of loading.tsx in isolation. Mutual exclusion
 * between this skeleton and BlogEmptyState at runtime is a Next.js streaming-boundary
 * guarantee — verified by the manual smoke step in the plan's <done>, not by unit test.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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

vi.mock('#components/layout/page-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="page-layout">{children}</div>
	),
}))

vi.mock('#components/shared/blog-loading-skeleton', () => ({
	BlogLoadingSkeleton: () => (
		<div
			data-testid="blog-loading-skeleton"
			role="status"
			aria-label="Loading content"
		/>
	),
}))

import BlogLoading from './loading'

describe('BlogLoading (route-scoped streaming UI for /blog)', () => {
	it('renders inside PageLayout chrome', () => {
		render(<BlogLoading />)
		expect(screen.getByTestId('page-layout')).toBeInTheDocument()
	})

	it('renders multiple BlogLoadingSkeleton instances in a grid', () => {
		render(<BlogLoading />)
		const skeletons = screen.getAllByRole('status', {
			name: /loading content/i,
		})
		expect(skeletons.length).toBeGreaterThanOrEqual(6)
	})

	it('does NOT render empty-state copy ("No posts" / "More posts coming soon")', () => {
		render(<BlogLoading />)
		expect(
			screen.queryByText(/no posts found|more posts coming soon/i)
		).not.toBeInTheDocument()
	})

	it('does NOT render BlogCard, NewsletterSignup, or Software Comparisons heading', () => {
		render(<BlogLoading />)
		expect(screen.queryByTestId('blog-card')).not.toBeInTheDocument()
		expect(screen.queryByTestId('newsletter-signup')).not.toBeInTheDocument()
		expect(
			screen.queryByRole('heading', { name: /software comparisons/i })
		).not.toBeInTheDocument()
	})

	it('renders breadcrumb landmark with Home → Blog navigation chrome', () => {
		render(<BlogLoading />)
		const breadcrumbNav = screen.getByRole('navigation', {
			name: /breadcrumb/i,
		})
		expect(breadcrumbNav).toBeInTheDocument()
		expect(breadcrumbNav).toHaveTextContent(/home/i)
		expect(breadcrumbNav).toHaveTextContent(/blog/i)
	})
})
