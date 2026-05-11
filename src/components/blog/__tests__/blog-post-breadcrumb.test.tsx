/**
 * Tests for BlogPostBreadcrumb.
 *
 * Pins the path-derivation rule so visible breadcrumb segments match the
 * JSON-LD BreadcrumbList emitted by `createBreadcrumbJsonLd`. Drift between
 * the two is a documented search-penalty risk (Pitfall 2).
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

import { BlogPostBreadcrumb } from '#components/blog/blog-post-breadcrumb'

describe('BlogPostBreadcrumb', () => {
	it('renders 4 segments (Home > Blog > Category > Title) when category is present', () => {
		render(<BlogPostBreadcrumb title="The Test Post" category="Lease Law" />)

		expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
			'href',
			'/'
		)
		expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
			'href',
			'/blog'
		)
		expect(screen.getByRole('link', { name: 'Lease Law' })).toHaveAttribute(
			'href',
			'/blog/category/lease-law'
		)
		expect(screen.getByText('The Test Post')).toBeInTheDocument()
	})

	it('renders 3 segments (Home > Blog > Title) when category is null', () => {
		render(<BlogPostBreadcrumb title="Uncategorized Post" category={null} />)

		expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
			'href',
			'/'
		)
		expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute(
			'href',
			'/blog'
		)
		// No category link rendered when category is null
		expect(screen.queryByRole('link', { name: /Law/i })).not.toBeInTheDocument()
		expect(screen.getByText('Uncategorized Post')).toBeInTheDocument()
	})

	it('lowercase-dasherizes the category slug to match createBreadcrumbJsonLd', () => {
		// `createBreadcrumbJsonLd` does NOT lower-and-dasherize itself; the
		// caller-supplied path is used verbatim. But the post page derives
		// the same slug from the visible category via the same regex used
		// here, so by pinning this transform we guarantee no drift.
		render(
			<BlogPostBreadcrumb
				title="Multi-Word Category Post"
				category="Property Management"
			/>
		)
		expect(
			screen.getByRole('link', { name: 'Property Management' })
		).toHaveAttribute('href', '/blog/category/property-management')
	})

	it('uses aria-current="page" on the title segment', () => {
		render(<BlogPostBreadcrumb title="Active Post" category="Maintenance" />)
		const current = screen.getByText('Active Post')
		expect(current).toHaveAttribute('aria-current', 'page')
	})

	it('renders inside a nav landmark with aria-label="breadcrumb"', () => {
		render(<BlogPostBreadcrumb title="Some Post" category="Some Category" />)
		const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
		expect(nav).toBeInTheDocument()
	})
})
