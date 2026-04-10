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
			['Organization']
		)
	})

	test('/resources/security-deposit-reference-card has SEO metadata', async ({ page }) => {
		await assertPageSeo(
			page,
			'/resources/security-deposit-reference-card',
			['Organization']
		)
	})

	test('/blog/[slug] has Article schema', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'load', timeout: 30000 })
		const firstLink = page.locator('a[href^="/blog/"][href*="-"]').first()
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
})
