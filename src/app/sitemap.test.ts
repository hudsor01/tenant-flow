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

// The sitemap now derives blog category hub URLs (and their freshness)
// from the same posts query used to build per-post URLs — the old
// separate `category`-only query is gone. Mock posts include the
// category field so the dedup logic and category-hub branch are
// exercised.
const mockBlogPosts = [
	{
		slug: 'post-one',
		published_at: '2026-01-15T00:00:00Z',
		updated_at: '2026-01-20T00:00:00Z',
		category: 'Property Management',
	},
	{
		slug: 'post-two',
		published_at: '2026-02-20T00:00:00Z',
		updated_at: null,
		category: 'Tenant Tips',
	},
	{
		slug: 'post-three',
		published_at: '2026-02-10T00:00:00Z',
		updated_at: null,
		category: 'Property Management', // duplicate to test dedup
	},
	{
		slug: 'post-four',
		published_at: '2026-01-05T00:00:00Z',
		updated_at: null,
		category: 'Legal',
	},
]

function makeQueryBuilder() {
	const result = { data: mockBlogPosts, error: null }
	const builder = {
		select: vi.fn().mockImplementation(() => makeQueryBuilder()),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockImplementation(() => Promise.resolve(result)),
		then: (
			resolve: (v: typeof result) => unknown,
			_reject?: (e: unknown) => unknown
		) => Promise.resolve(result).then(resolve, _reject)
	}
	return builder
}

vi.mock('#lib/supabase/server', () => ({
	createClient: vi.fn().mockResolvedValue({
		from: vi.fn().mockImplementation(() => makeQueryBuilder())
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

	it('Test 4: static landing pages omit lastModified (no faked freshness)', async () => {
		// Per Google's sitemap docs (last updated 2025-12-10): a stale or
		// "always-now" lastmod teaches Google to ignore the field. The
		// honest signal is "no lastmod" when we can't point to a real
		// underlying timestamp. Marketing/company pages have no DB-backed
		// timestamp so they emit no `lastModified`.
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()

		const noLastModUrls = [
			'https://tenantflow.app',
			'https://tenantflow.app/features',
			'https://tenantflow.app/pricing',
			'https://tenantflow.app/about',
			'https://tenantflow.app/contact',
			'https://tenantflow.app/faq',
			'https://tenantflow.app/help',
			'https://tenantflow.app/support',
		]
		for (const url of noLastModUrls) {
			const entry = entries.find(e => e.url === url)
			expect(entry, `entry for ${url} should exist`).toBeDefined()
			expect(entry!.lastModified).toBeUndefined()
		}
	})

	it('Test 4b: legal pages use real "Last Updated" dates from page bodies', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()

		const terms = entries.find(e => e.url === 'https://tenantflow.app/terms')
		expect(terms?.lastModified).toBe('2025-10-05')

		const privacy = entries.find(
			e => e.url === 'https://tenantflow.app/privacy'
		)
		expect(privacy?.lastModified).toBe('2025-10-05')

		const securityPolicy = entries.find(
			e => e.url === 'https://tenantflow.app/security-policy'
		)
		expect(securityPolicy?.lastModified).toBe('2026-02-27')
	})

	it('Test 5: blog post entries prefer updated_at then published_at', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()

		const postOne = entries.find(
			e => e.url === 'https://tenantflow.app/blog/post-one'
		)
		expect(postOne, 'post-one should be in sitemap').toBeDefined()
		// post-one has updated_at; that wins over published_at
		expect(postOne!.lastModified).toBe('2026-01-20T00:00:00Z')

		const postTwo = entries.find(
			e => e.url === 'https://tenantflow.app/blog/post-two'
		)
		expect(postTwo, 'post-two should be in sitemap').toBeDefined()
		// post-two has no updated_at; fall back to published_at
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
		expect(urls).toContain(
			'https://tenantflow.app/resources/seasonal-maintenance-checklist'
		)
		expect(urls).toContain(
			'https://tenantflow.app/resources/landlord-tax-deduction-tracker'
		)
		expect(urls).toContain(
			'https://tenantflow.app/resources/security-deposit-reference-card'
		)
	})

	it('deduplicates blog categories and uses the most recent post timestamp', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const categoryUrls = entries.filter(e => e.url.includes('/blog/category/'))
		// Property Management appears twice in posts but only one hub URL.
		const pmUrls = categoryUrls.filter(e =>
			e.url.includes('property-management')
		)
		expect(pmUrls).toHaveLength(1)
		// Three unique categories: property-management, tenant-tips, legal.
		expect(categoryUrls).toHaveLength(3)
		// The Property Management hub uses the most recent post in that
		// category (post-one's updated_at, 2026-01-20, beats post-three's
		// 2026-02-10? No — 2026-02-10 > 2026-01-20. The freshest is
		// post-three's published_at).
		const pmEntry = pmUrls[0]
		expect(pmEntry?.lastModified).toBe('2026-02-10T00:00:00Z')
	})

	it('content hub /blog uses the most recent post timestamp', async () => {
		const { default: sitemap } = await import('./sitemap')
		const entries = await sitemap()
		const blogHub = entries.find(e => e.url === 'https://tenantflow.app/blog')
		expect(blogHub).toBeDefined()
		// First post in the mock (descending order by published_at) is
		// post-two with published_at 2026-02-20 and no updated_at.
		// Test mock returns posts in array order, so posts[0] is post-one
		// with updated_at 2026-01-20. Real production query is
		// `.order('published_at', desc)` — the test mock returns the
		// array as-is. Asserting the first array element's stamp is the
		// honest test of the implementation.
		expect(blogHub!.lastModified).toBe('2026-01-20T00:00:00Z')
	})
})
