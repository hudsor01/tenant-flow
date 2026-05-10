/**
 * Integration tests for the Phase 6 / BLOG-01 blog status workflow + 9
 * validation gates + canonical_url column wiring.
 *
 * Pins the contract for six migrations applied in Plan 06-01:
 *   - 20260510214844 drop Phase-1 reject_n8n_error_blogs_trigger
 *   - 20260510214900 extend blogs.status CHECK to include 'in-review'
 *   - 20260510214914 add blogs_slug_format_check regex CHECK
 *   - 20260510214935 install validate_blog_post() trigger (9 gates)
 *   - 20260510214942 hard-DELETE 100 Phase-1 broken draft rows
 *   - 20260510214950 add blogs.canonical_url text NULL column
 *
 * Test strategy: service-role client for INSERTs (blogs has no authenticated
 * INSERT policy), anon client for the RLS read assertion. Each gate gets its
 * own `it()` block with an explicit error-message substring assertion using
 * the Vitest 4 `.toMatchObject({ message: expect.stringContaining(...) })`
 * pattern per CLAUDE.md (the chai 6 `.toThrow` regression makes string
 * matchers unreliable).
 *
 * Cleanup: deterministic `phase-6-rls-test-${SLUG_SUFFIX}-` slug prefix per
 * run, plus a broad `'phase-6-rls-test-%'` sweep in beforeAll to clear any
 * orphans left by previous interrupted runs.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY =
	process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
	process.env['SUPABASE_SECRET_KEY']
const ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

const skipReason = !SUPABASE_URL
	? 'NEXT_PUBLIC_SUPABASE_URL not set'
	: !SERVICE_ROLE_KEY
		? 'SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY not set'
		: !ANON_KEY
			? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set'
			: null

const SLUG_SUFFIX = Date.now().toString()
const SLUG_PREFIX = `phase-6-rls-test-${SLUG_SUFFIX}`

/**
 * Build a known-good blog payload. Defaults satisfy all 9 validation gates;
 * each test overrides one field to exercise that gate's rejection path.
 *
 * Defaults:
 *   - content: ~1,500 words, 5 H2s, contains "landlord", no banlist phrases,
 *     0 DocuSeal mentions (gates 1-3, 8, 9)
 *   - slug: `${SLUG_PREFIX}-valid` (gate 4 + CHECK)
 *   - meta_description: 100 chars (gate 5)
 *   - excerpt: 120 chars (gate 6)
 *   - category: 'lease-law' (gate 7)
 *   - status: 'in-review' (triggers gates; would skip on 'draft')
 */
function validBody(overrides: Record<string, unknown> = {}) {
	// 5 H2 sections, each ~280 words of filler containing "landlord".
	// Total body ~1,400 words (above 1,200 floor, below 3,000 ceiling).
	const section = (i: number) =>
		`## H2 Section ${i}\n\n` +
		`This paragraph is for landlords with one to fifteen rentals. ` +
			'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt. '.repeat(
				35
			)
	const content =
		'# Phase 6 RLS Test Post\n\n' +
		'Intro paragraph aimed at landlords managing small portfolios. '.repeat(8) +
		'\n\n' +
		[1, 2, 3, 4, 5].map(section).join('\n\n')

	return {
		title: 'Phase 6 RLS Test Post',
		slug: `${SLUG_PREFIX}-valid`,
		excerpt:
			'A test excerpt about landlords with 1-15 rentals to satisfy the excerpt length gate cleanly between 80 and 200 chars.',
		content,
		category: 'lease-law',
		meta_description:
			'Test meta description about landlord lease law content with sufficient length to pass the gate (50..160 chars).',
		status: 'in-review',
		...overrides
	}
}

describe.skipIf(skipReason)(
	'blogs — status workflow + 9 validation gates (Phase 6 / BLOG-01)',
	() => {
		let service: SupabaseClient
		let anon: SupabaseClient
		const insertedSlugs: string[] = []

		beforeAll(async () => {
			service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false }
			})
			anon = createClient(SUPABASE_URL!, ANON_KEY!, {
				auth: { persistSession: false, autoRefreshToken: false }
			})

			// Cleanup-on-rerun safeguard: clear any orphans from prior interrupted
			// runs. Uses broad prefix `phase-6-rls-test-%` (no SLUG_SUFFIX) so the
			// sweep also catches abandoned rows from previous timestamps.
			await service.from('blogs').delete().like('slug', 'phase-6-rls-test-%')
		})

		afterAll(async () => {
			for (const slug of insertedSlugs) {
				await service.from('blogs').delete().eq('slug', slug)
			}
			// Belt-and-braces: catch anything the test inserted without pushing
			// to `insertedSlugs` (e.g., the unused `${SLUG_PREFIX}-valid` slot).
			await service
				.from('blogs')
				.delete()
				.like('slug', `${SLUG_PREFIX}-%`)
		})

		// ────────────────────────────────────────────────────────────────────
		// Status CHECK constraint (migration 20260510214900)
		// ────────────────────────────────────────────────────────────────────

		it('accepts valid status=in-review payload', async () => {
			const slug = `${SLUG_PREFIX}-valid-accept`
			const body = validBody({ slug })
			insertedSlugs.push(slug)
			const { data, error } = await service
				.from('blogs')
				.insert(body)
				.select('id, status')
				.single()
			expect(error).toBeNull()
			expect(data?.status).toBe('in-review')
		})

		it("rejects status='not-a-state' (status CHECK constraint)", async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-bad-status`,
				status: 'not-a-state'
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('blogs_status_check')
			})
		})

		// ────────────────────────────────────────────────────────────────────
		// Slug regex CHECK constraint (migration 20260510214914)
		// ────────────────────────────────────────────────────────────────────

		it("rejects slug='1234567890' (numeric-only fails leading-letter regex)", async () => {
			const body = validBody({ slug: '1234567890' })
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('blogs_slug_format_check')
			})
		})

		it("accepts slug='valid-slug-format' (valid kebab-case starting with letter)", async () => {
			const slug = `${SLUG_PREFIX}-valid-slug-format`
			const body = validBody({ slug })
			insertedSlugs.push(slug)
			const { data, error } = await service
				.from('blogs')
				.insert(body)
				.select('id')
				.single()
			expect(error).toBeNull()
			expect(data?.id).toBeDefined()
		})

		it("rejects slug='Bad Slug With Spaces' (uppercase + spaces)", async () => {
			const body = validBody({ slug: 'Bad Slug With Spaces' })
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('blogs_slug_format_check')
			})
		})

		// ────────────────────────────────────────────────────────────────────
		// validate_blog_post() trigger gates (migration 20260510214935)
		// Gate 1: word count 1,200..3,000
		// ────────────────────────────────────────────────────────────────────

		it('rejects 800-word content (gate 1: word_count below floor)', async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-word-low`,
				// 800 words of "landlord ..." — passes persona gate but fails word count
				content:
					'# Heading\n\n## H2 a\n\n## H2 b\n\n## H2 c\n\n## H2 d\n\n' +
					('landlord word filler text here. '.repeat(160))
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('word_count out of range')
			})
		})

		// Gate 2: H2 count 4..10
		it('rejects 2-H2 content (gate 2: h2_count below floor)', async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-h2-low`,
				// ~1,500 words across only 2 H2 sections — passes gate 1 but fails gate 2
				content:
					'# Heading\n\nIntro about landlords. ' +
					'Lorem ipsum dolor sit amet. '.repeat(200) +
					'\n\n## Section One\n\nlandlord body. ' +
					'Lorem ipsum dolor sit amet. '.repeat(200) +
					'\n\n## Section Two\n\nlandlord body. ' +
					'Lorem ipsum dolor sit amet. '.repeat(200)
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('h2_count out of range')
			})
		})

		// Gate 3: persona phrase — content must contain "landlord"
		it("rejects content without 'landlord' (gate 3: persona phrase missing)", async () => {
			const section = (i: number) =>
				`## H2 ${i}\n\n` +
				'Generic body without the persona keyword. '.repeat(40)
			const content =
				'# Heading\n\nIntro paragraph. '.repeat(20) +
				'\n\n' +
				[1, 2, 3, 4, 5].map(section).join('\n\n')
			const body = validBody({
				slug: `${SLUG_PREFIX}-no-persona`,
				content
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('persona phrase missing')
			})
		})

		// Gate 5: meta_description 50..160 chars
		it('rejects 30-char meta_description (gate 5: meta length out of range)', async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-meta-short`,
				meta_description: 'Too short for SEO (30 chars).'
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('meta_description length out of range')
			})
		})

		// Gate 6: excerpt 80..200 chars
		it('rejects 50-char excerpt (gate 6: excerpt length out of range)', async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-excerpt-short`,
				excerpt: 'Excerpt under the 80-char floor for landlords.'
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('excerpt length out of range')
			})
		})

		// Gate 7: category enum
		it("rejects category='not-a-cluster' (gate 7: category not in enum)", async () => {
			const body = validBody({
				slug: `${SLUG_PREFIX}-bad-category`,
				category: 'not-a-cluster'
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('category not in enum')
			})
		})

		// Gate 8: banlist
		it("rejects content containing 'rent collection' (gate 8: banlist hit)", async () => {
			// Inject the banlist phrase into otherwise-valid body. The trigger
			// matches case-insensitively via position(lower(phrase) in lower(content)).
			const section = (i: number) =>
				`## H2 ${i}\n\n` +
				'Body for landlords with 1-15 rentals. '.repeat(40)
			const content =
				'# Heading\n\nIntro about landlords and rent collection responsibilities. '.repeat(
					4
				) +
				'\n\n' +
				[1, 2, 3, 4, 5].map(section).join('\n\n')
			const body = validBody({
				slug: `${SLUG_PREFIX}-banlist`,
				content
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('banlist hit')
			})
		})

		// Gate 9: DocuSeal mention count ≤ 1
		it("rejects content with 3 'DocuSeal' mentions (gate 9: DocuSeal mention count too high)", async () => {
			const section = (i: number) =>
				`## H2 ${i}\n\n` +
				'Body for landlords with rentals. '.repeat(40)
			const content =
				'# Heading\n\n' +
				'DocuSeal handles signatures for landlords. DocuSeal also stores PDFs. DocuSeal is the lease signing surface. '.repeat(
					2
				) +
				'\n\n' +
				[1, 2, 3, 4, 5].map(section).join('\n\n')
			const body = validBody({
				slug: `${SLUG_PREFIX}-docuseal`,
				content
			})
			const { error } = await service.from('blogs').insert(body)
			expect(error).toMatchObject({
				message: expect.stringContaining('DocuSeal mention count too high')
			})
		})

		// ────────────────────────────────────────────────────────────────────
		// canonical_url column wiring (migration 20260510214950)
		// ────────────────────────────────────────────────────────────────────

		it("accepts INSERT with canonical_url='/compare/buildium' override", async () => {
			const slug = `${SLUG_PREFIX}-canonical-override`
			const body = validBody({ slug, canonical_url: '/compare/buildium' })
			insertedSlugs.push(slug)
			const { data, error } = await service
				.from('blogs')
				.insert(body)
				.select('id, canonical_url')
				.single()
			expect(error).toBeNull()
			expect(data?.canonical_url).toBe('/compare/buildium')
		})

		it('accepts INSERT without canonical_url (defaults to NULL)', async () => {
			const slug = `${SLUG_PREFIX}-no-canonical`
			const body = validBody({ slug })
			insertedSlugs.push(slug)
			const { data, error } = await service
				.from('blogs')
				.insert(body)
				.select('canonical_url')
				.single()
			expect(error).toBeNull()
			expect(data?.canonical_url).toBeNull()
		})

		// ────────────────────────────────────────────────────────────────────
		// RLS read isolation: anon cannot see in-review rows
		// ────────────────────────────────────────────────────────────────────

		it("anon SELECT excludes status='in-review' rows (RLS)", async () => {
			const slug = `${SLUG_PREFIX}-anon-hidden`
			const body = validBody({ slug })
			insertedSlugs.push(slug)
			const { error: insertErr } = await service.from('blogs').insert(body)
			expect(insertErr).toBeNull()

			const { data, error: readErr } = await anon
				.from('blogs')
				.select('slug, status')
				.eq('slug', slug)
			expect(readErr).toBeNull()
			expect(data ?? []).toHaveLength(0)
		})
	}
)
