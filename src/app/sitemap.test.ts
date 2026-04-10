import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#env', () => ({
	env: { NEXT_PUBLIC_APP_URL: 'https://tenantflow.app' }
}))

vi.mock('#lib/frontend-logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		error: vi.fn()
	})
}))

const mockBlogPosts = [
	{ slug: 'post-one', published_at: '2026-01-15T00:00:00Z' },
	{ slug: 'post-two', published_at: '2026-02-20T00:00:00Z' }
]

const mockCategoryRows = [
	{ category: 'property-management' },
	{ category: 'tenant-tips' },
	{ category: 'property-management' }, // duplicate to test dedup
	{ category: 'legal' }
]

/**
 * Build a chainable query builder that resolves differently based on the
 * `.select()` argument — 'category' returns category rows, anything else
 * returns blog posts.
 */
function makeQueryBuilder(selectArg: string) {
	const isCategoryQuery = selectArg === 'category'
	const result = isCategoryQuery
		? { data: mockCategoryRows, error: null }
		: { data: mockBlogPosts, error: null }

	const builder = {
		select: vi.fn().mockImplementation((arg: string) => makeQueryBuilder(arg)),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		// thenable so await works
		then: (
			resolve: (v: typeof result) => unknown,
			_reject?: (e: unknown) => unknown
		) => Promise.resolve(result).then(resolve, _reject)
	}
	return builder
}

vi.mock('#lib/supabase/server', () => ({
	createClient: vi.fn().mockResolvedValue({
		from: vi.fn().mockImplementation(() => makeQueryBuilder('slug, published_at'))
	})
}))

describe('sitemap()', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	it('Test 1: includes /support URL in entries', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const urls = entries.map(e => e.url)
		expect(urls).toContain('https://tenantflow.app/support')
	})

	it('Test 2: includes /security-policy URL in entries', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const urls = entries.map(e => e.url)
		expect(urls).toContain('https://tenantflow.app/security-policy')
	})

	it('Test 3: includes blog category entries matching /blog/category/ pattern', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const categoryUrls = entries.filter(e => e.url.includes('/blog/category/'))
		expect(categoryUrls.length).toBeGreaterThan(0)
		for (const entry of categoryUrls) {
			expect(entry.url).toMatch(/\/blog\/category\//)
		}
	})

	it('Test 4: static page entries do not use current date as lastModified', async () => {
		const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD portion
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()

		// Legal pages should use '2026-01-01', not current date
		const legalUrls = [
			'https://tenantflow.app/terms',
			'https://tenantflow.app/privacy',
			'https://tenantflow.app/security-policy'
		]
		for (const url of legalUrls) {
			const entry = entries.find(e => e.url === url)
			expect(entry, `entry for ${url} should exist`).toBeDefined()
			const lastMod = String(entry!.lastModified ?? '')
			expect(lastMod, `${url} should not use today's date`).not.toContain(today)
			expect(lastMod).toBe('2026-01-01')
		}

		// Company pages should use '2026-04-01', not current date
		const companyUrls = [
			'https://tenantflow.app/about',
			'https://tenantflow.app/contact',
			'https://tenantflow.app/faq',
			'https://tenantflow.app/help',
			'https://tenantflow.app/support'
		]
		for (const url of companyUrls) {
			const entry = entries.find(e => e.url === url)
			expect(entry, `entry for ${url} should exist`).toBeDefined()
			const lastMod = String(entry!.lastModified ?? '')
			expect(lastMod, `${url} should not use today's date`).not.toContain(today)
			expect(lastMod).toBe('2026-04-01')
		}
	})

	it('Test 5: blog post entries use post.published_at (not a fixed date)', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()

		const postOne = entries.find(e => e.url === 'https://tenantflow.app/blog/post-one')
		expect(postOne, 'post-one should be in sitemap').toBeDefined()
		expect(postOne!.lastModified).toBe('2026-01-15T00:00:00Z')

		const postTwo = entries.find(e => e.url === 'https://tenantflow.app/blog/post-two')
		expect(postTwo, 'post-two should be in sitemap').toBeDefined()
		expect(postTwo!.lastModified).toBe('2026-02-20T00:00:00Z')
	})

	it('Test 6: compare pages for buildium, appfolio, rentredi are present', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const urls = entries.map(e => e.url)
		expect(urls).toContain('https://tenantflow.app/compare/buildium')
		expect(urls).toContain('https://tenantflow.app/compare/appfolio')
		expect(urls).toContain('https://tenantflow.app/compare/rentredi')
	})

	it('Test 7: resource pages are present', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const urls = entries.map(e => e.url)
		expect(urls).toContain('https://tenantflow.app/resources/seasonal-maintenance-checklist')
		expect(urls).toContain('https://tenantflow.app/resources/landlord-tax-deduction-tracker')
		expect(urls).toContain('https://tenantflow.app/resources/security-deposit-reference-card')
	})

	it('deduplicates blog categories', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const categoryUrls = entries.filter(e => e.url.includes('/blog/category/'))
		// 'property-management' appears twice in mockCategoryRows but should only produce one entry
		const pmUrls = categoryUrls.filter(e => e.url.includes('property-management'))
		expect(pmUrls).toHaveLength(1)
		// Total unique categories: property-management, tenant-tips, legal = 3
		expect(categoryUrls).toHaveLength(3)
	})
})
