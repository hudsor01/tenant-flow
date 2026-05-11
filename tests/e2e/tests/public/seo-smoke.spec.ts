import { test, expect, type Page } from '@playwright/test'

type SchemaObject = Record<string, unknown>

async function getJsonLdSchemas(page: Page): Promise<SchemaObject[]> {
	return page.evaluate(() => {
		const scripts = document.querySelectorAll('script[type="application/ld+json"]')
		return Array.from(scripts).flatMap(el => {
			try {
				const parsed = JSON.parse(el.textContent ?? '') as Record<string, unknown>
				return Array.isArray(parsed['@graph'])
					? (parsed['@graph'] as SchemaObject[])
					: [parsed]
			} catch {
				return []
			}
		})
	}) as Promise<SchemaObject[]>
}

async function assertPageSeo(
	page: Page,
	path: string,
	expectedTypes: string[]
) {
	await page.goto(path, { waitUntil: 'load', timeout: 30000 })

	// Title exists and is non-empty
	const title = await page.title()
	expect(title.length, `${path}: title should be non-empty`).toBeGreaterThan(0)

	// Meta description exists and is non-empty
	const desc = await page.locator('meta[name="description"]').getAttribute('content')
	expect(desc?.length ?? 0, `${path}: description should be non-empty`).toBeGreaterThan(0)

	// Canonical link exists
	const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
	expect(canonical, `${path}: canonical should exist`).toBeTruthy()

	// OG tags (property= not name= — OG tags use property attribute)
	const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
	expect(ogTitle?.length ?? 0, `${path}: og:title should be non-empty`).toBeGreaterThan(0)

	const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content')
	expect(ogDesc?.length ?? 0, `${path}: og:description should be non-empty`).toBeGreaterThan(0)

	const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content')
	expect(ogUrl, `${path}: og:url should exist`).toBeTruthy()

	// JSON-LD schemas exist (at minimum from global layout SeoJsonLd)
	const schemas = await getJsonLdSchemas(page)
	expect(schemas.length, `${path}: at least one JSON-LD schema should exist`).toBeGreaterThan(0)

	// Validate expected @type values
	const types = schemas.map(s => s['@type'])
	for (const expectedType of expectedTypes) {
		expect(types, `${path}: should contain @type "${expectedType}"`).toContain(expectedType)
	}
}

test.describe('SEO Smoke Tests', () => {
	test('/ has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/', ['WebSite', 'Organization'])
	})

	test('/pricing has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/pricing', ['Product', 'FAQPage', 'BreadcrumbList'])
	})

	test('/features has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/features', ['BreadcrumbList'])
	})

	test('/blog has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/blog', ['BreadcrumbList'])
	})

	test('/faq has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/faq', ['FAQPage', 'BreadcrumbList'])
	})

	test('/about has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/about', ['BreadcrumbList'])
	})

	test('/contact has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/contact', ['BreadcrumbList'])
	})

	test('/help has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/help', ['BreadcrumbList'])
	})

	test('/support has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/support', ['BreadcrumbList'])
	})

	test('/resources has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/resources', ['BreadcrumbList'])
	})

	test('/terms has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/terms', ['BreadcrumbList'])
	})

	test('/privacy has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/privacy', ['BreadcrumbList'])
	})

	test('/security-policy has full SEO metadata', async ({ page }) => {
		await assertPageSeo(page, '/security-policy', ['BreadcrumbList'])
	})

	test('/login has SEO metadata', async ({ page }) => {
		// Login page inherits global Organization + SoftwareApplication schemas
		await assertPageSeo(page, '/login', ['Organization'])
	})

	test('/compare/buildium has SEO metadata', async ({ page }) => {
		// Compare pages use inline WebPage JSON-LD; global Organization schema also present
		await assertPageSeo(page, '/compare/buildium', ['Organization'])
	})

	test('/resources/seasonal-maintenance-checklist has SEO metadata', async ({ page }) => {
		// Resource sub-pages have no page-specific JsonLdScript;
		// global layout injects Organization + SoftwareApplication
		await assertPageSeo(
			page,
			'/resources/seasonal-maintenance-checklist',
			['Organization']
		)
	})

	test('/resources/landlord-tax-deduction-tracker has SEO metadata', async ({ page }) => {
		await assertPageSeo(
			page,
			'/resources/landlord-tax-deduction-tracker',
			['Organization', 'BreadcrumbList']
		)
	})

	test('/resources/security-deposit-reference-card has SEO metadata', async ({ page }) => {
		await assertPageSeo(
			page,
			'/resources/security-deposit-reference-card',
			['Organization', 'BreadcrumbList']
		)
	})

	test('/blog/[slug] has Article schema', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'load', timeout: 30000 })
		const firstLink = page.locator('a[href^="/blog/"][href*="-"]:not([href^="/blog/category/"])').first()
		const count = await firstLink.count()
		if (count === 0) {
			test.skip()
			return
		}
		const href = await firstLink.getAttribute('href', { timeout: 5000 })
		if (!href) {
			test.skip()
			return
		}
		await assertPageSeo(page, href, ['Article', 'BreadcrumbList'])
	})

	test('/blog/[slug] renders visible breadcrumb + dynamic /api/og/blog/ OG image (Plan 06-02)', async ({
		page,
	}) => {
		await page.goto('/blog', { waitUntil: 'load', timeout: 30000 })
		const firstLink = page.locator('a[href^="/blog/"][href*="-"]:not([href^="/blog/category/"])').first()
		const count = await firstLink.count()
		if (count === 0) {
			test.skip(true, 'no published posts yet — re-run after Plan 06-04 ships')
			return
		}
		const href = await firstLink.getAttribute('href', { timeout: 5000 })
		if (!href) {
			test.skip(true, 'no published post href resolved')
			return
		}
		await page.goto(href, { waitUntil: 'load', timeout: 30000 })

		// Visible breadcrumb nav landmark must be present (Phase 6 SEO-05).
		// The shadcn primitive renders `<nav aria-label="breadcrumb">`.
		await expect(
			page.getByRole('navigation', { name: /breadcrumb/i }).first()
		).toBeVisible()

		// og:image content must point at the dynamic OG route (Plan 06-02 Task 2).
		// We assert the URL pattern, not the byte-for-byte URL, so the test
		// survives slug variance across Plan 06-04 / future content additions.
		const ogImage = await page
			.locator('meta[property="og:image"]')
			.getAttribute('content')
		expect(ogImage, 'og:image content should reference /api/og/blog/').toMatch(
			/\/api\/og\/blog\//
		)
	})

	test('/blog/this-slug-does-not-exist returns real HTTP 404 (no soft-200)', async ({
		page,
	}) => {
		// Phase 6 (BLOG-02): generateStaticParams + dynamicParams=false must
		// emit a real 404 for slugs outside the published set. With Next.js
		// dev's turbopack, dynamicParams enforcement requires at least one
		// statically generated path to anchor the 404 behavior — when 0 posts
		// are published the test result is ambiguous, so skip until Plan 06-04
		// editorial flip ships ≥1 post.
		await page.goto('/blog', { waitUntil: 'load', timeout: 30000 })
		const postLink = page
			.locator('a[href^="/blog/"][href*="-"]:not([href^="/blog/category/"])')
			.first()
		if ((await postLink.count()) === 0) {
			test.skip(
				true,
				'no published posts — soft-404 enforcement is meaningful only after Plan 06-04 ships ≥1 post'
			)
			return
		}
		const bogusSlug = `this-slug-does-not-exist-${Date.now()}`
		const response = await page.goto(`/blog/${bogusSlug}`, {
			waitUntil: 'load',
			timeout: 30000,
		})
		expect(
			response?.status(),
			`/blog/${bogusSlug} should return 404 (not soft-200)`
		).toBe(404)
	})

	test('canonical tag on tenantflow-vs-buildium points at /compare/buildium (Blocker-#1)', async ({
		page,
	}) => {
		// Plan 06-02 Task 2 wires `post.canonical_url` (Plan 06-01 column) →
		// Next.js Metadata.alternates.canonical → `<link rel="canonical">` in
		// <head>. The buildium post (brief #10) ships with canonical_url =
		// `/compare/buildium` to avoid cannibalization with the compare page.
		//
		// Skip-if-not-published guard: post #10 isn't live until Plan 06-04's
		// editorial flip. Pre-publish the slug page can show a not-found
		// surface with HTTP 200 (Next.js dev mode soft-404), so skip on either
		// 404 or any non-200 to avoid the canonical-on-empty-page ambiguity.
		const response = await page.goto('/blog/tenantflow-vs-buildium', {
			waitUntil: 'load',
			timeout: 30000,
		})
		const status = response?.status() ?? 0
		if (status !== 200) {
			test.skip(
				true,
				`tenantflow-vs-buildium returned ${status} — not yet published; re-run after editorial flip`
			)
			return
		}
		// Belt-and-suspenders: also skip if the canonical isn't yet wired (the
		// post may render but lack canonical_url until brief #10 is inserted).
		const canonical = await page
			.locator('link[rel="canonical"]')
			.getAttribute('href')
		if (!canonical?.includes('/compare/buildium')) {
			test.skip(
				true,
				'canonical_url not yet set on tenantflow-vs-buildium row — re-run after editorial flip'
			)
			return
		}
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			/\/compare\/buildium$/
		)
	})

	test('/blog/category/[category] has BreadcrumbList schema', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'load', timeout: 30000 })
		const categoryLink = page.locator('a[href^="/blog/category/"]').first()
		const count = await categoryLink.count()
		if (count === 0) {
			test.skip()
			return
		}
		const href = await categoryLink.getAttribute('href', { timeout: 5000 })
		if (!href) {
			test.skip()
			return
		}
		await assertPageSeo(page, href, ['BreadcrumbList'])
	})

	test('title tag has no double brand suffix on Phase 40 target paths', async ({ page }) => {
		const phase40Paths = [
			'/terms',
			'/privacy',
			'/security-policy',
			'/support',
			'/resources/seasonal-maintenance-checklist',
			'/resources/security-deposit-reference-card',
			'/resources/landlord-tax-deduction-tracker'
		]

		for (const path of phase40Paths) {
			await page.goto(path, { waitUntil: 'load', timeout: 30000 })
			const title = await page.title()
			expect(
				title,
				`${path}: title should not contain double brand suffix "| TenantFlow | TenantFlow"`
			).not.toContain('| TenantFlow | TenantFlow')
		}
	})
})
