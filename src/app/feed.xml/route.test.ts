import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#env', () => ({
	env: { NEXT_PUBLIC_APP_URL: 'https://tenantflow.app' },
}))

vi.mock('#lib/frontend-logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}))

let mockBlogPosts: Array<{
	slug: string
	title: string
	excerpt: string | null
	published_at: string | null
	updated_at: string | null
	category: string | null
}> = []
let mockShouldError = false

function makeQueryBuilder() {
	const result = mockShouldError
		? { data: null, error: { message: 'simulated db failure' } }
		: { data: mockBlogPosts, error: null }
	const builder: {
		select: (...args: unknown[]) => typeof builder
		eq: (...args: unknown[]) => typeof builder
		order: (...args: unknown[]) => typeof builder
		limit: (...args: unknown[]) => typeof builder
		then: (
			resolve: (v: typeof result) => unknown,
			reject?: (e: unknown) => unknown
		) => Promise<unknown>
	} = {
		select: vi.fn().mockImplementation(() => builder),
		eq: vi.fn().mockImplementation(() => builder),
		order: vi.fn().mockImplementation(() => builder),
		limit: vi.fn().mockImplementation(() => builder),
		then: (
			resolve: (v: typeof result) => unknown,
			reject?: (e: unknown) => unknown
		) => Promise.resolve(result).then(resolve, reject),
	}
	return builder
}

vi.mock('#lib/supabase/server', () => ({
	createClient: vi.fn().mockResolvedValue({
		from: vi.fn().mockImplementation(() => makeQueryBuilder()),
	}),
}))

async function fetchFeed(): Promise<{ status: number; xml: string; contentType: string }> {
	vi.resetModules()
	const mod = await import('./route')
	const response = await mod.GET()
	const xml = await response.text()
	return {
		status: response.status,
		xml,
		contentType: response.headers.get('Content-Type') ?? '',
	}
}

describe('GET /feed.xml', () => {
	beforeEach(() => {
		mockBlogPosts = []
		mockShouldError = false
	})

	it('returns 200 with valid empty channel envelope when no posts exist', async () => {
		const { status, xml, contentType } = await fetchFeed()
		expect(status).toBe(200)
		expect(contentType).toContain('application/rss+xml')
		expect(xml).toContain('<rss version="2.0"')
		expect(xml).toContain('<channel>')
		expect(xml).toContain('<title>TenantFlow Blog</title>')
		expect(xml).not.toContain('<item>')
	})

	it('returns 200 (not 500) when the database query fails', async () => {
		mockShouldError = true
		const { status, xml } = await fetchFeed()
		expect(status).toBe(200)
		expect(xml).toContain('<rss version="2.0"')
		expect(xml).toContain('<channel>')
	})

	it('emits an item per post with title, link, guid, pubDate, description', async () => {
		mockBlogPosts = [
			{
				slug: 'first-post',
				title: 'First Post',
				excerpt: 'A summary.',
				published_at: '2026-04-01T12:00:00Z',
				updated_at: null,
				category: 'Property Management',
			},
		]
		const { xml } = await fetchFeed()
		expect(xml).toContain('<item>')
		expect(xml).toContain('<title>First Post</title>')
		expect(xml).toContain(
			'<link>https://tenantflow.app/blog/first-post</link>'
		)
		expect(xml).toContain(
			'<guid isPermaLink="true">https://tenantflow.app/blog/first-post</guid>'
		)
		expect(xml).toContain('<category>Property Management</category>')
		expect(xml).toContain('<![CDATA[A summary.]]>')
		expect(xml).toMatch(/<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/)
	})

	it('escapes XML-special characters in titles and links', async () => {
		mockBlogPosts = [
			{
				slug: 'a&b<c',
				title: 'A & B < C',
				excerpt: '',
				published_at: '2026-04-01T12:00:00Z',
				updated_at: null,
				category: null,
			},
		]
		const { xml } = await fetchFeed()
		expect(xml).toContain('A &amp; B &lt; C')
		expect(xml).toContain('https://tenantflow.app/blog/a&amp;b&lt;c')
	})

	it("escapes literal `]]>` inside CDATA descriptions (no XML injection)", async () => {
		mockBlogPosts = [
			{
				slug: 'cdata-bomb',
				title: 'CDATA Bomb',
				excerpt: 'before ]]> after',
				published_at: '2026-04-01T12:00:00Z',
				updated_at: null,
				category: null,
			},
		]
		const { xml } = await fetchFeed()
		expect(xml).toContain('before ]]]]><![CDATA[> after')
		const desc = /<description><!\[CDATA\[([\s\S]*?)]]><\/description>/.exec(xml)
		expect(desc, 'description CDATA must be parseable').toBeTruthy()
	})

	it('omits <category> when post.category is null', async () => {
		mockBlogPosts = [
			{
				slug: 'uncategorized',
				title: 'Uncategorized',
				excerpt: '',
				published_at: '2026-04-01T12:00:00Z',
				updated_at: null,
				category: null,
			},
		]
		const { xml } = await fetchFeed()
		expect(xml).not.toContain('<category>')
	})

	it('lastBuildDate uses the freshest stamp (updated_at preferred)', async () => {
		mockBlogPosts = [
			{
				slug: 'first',
				title: 'First',
				excerpt: '',
				published_at: '2026-04-01T12:00:00Z',
				updated_at: '2026-04-15T12:00:00Z',
				category: null,
			},
			{
				slug: 'second',
				title: 'Second',
				excerpt: '',
				published_at: '2026-03-15T12:00:00Z',
				updated_at: null,
				category: null,
			},
		]
		const { xml } = await fetchFeed()
		expect(xml).toMatch(/<lastBuildDate>Wed, 15 Apr 2026 12:00:00 GMT<\/lastBuildDate>/)
	})

	it('declares atom:link self-reference for reader auto-discovery', async () => {
		const { xml } = await fetchFeed()
		expect(xml).toContain(
			'<atom:link href="https://tenantflow.app/feed.xml" rel="self" type="application/rss+xml" />'
		)
	})
})
