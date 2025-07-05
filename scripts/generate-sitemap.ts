/**
 * Sitemap Generator for TenantFlow
 * Generates XML sitemaps for better SEO and search engine crawling
 */

import fs from 'fs'
import path from 'path'

interface SitemapUrl {
	loc: string
	lastmod?: string
	changefreq?:
		| 'always'
		| 'hourly'
		| 'daily'
		| 'weekly'
		| 'monthly'
		| 'yearly'
		| 'never'
	priority?: string
}

class SitemapGenerator {
	private domain: string
	private urls: SitemapUrl[] = []

	constructor(domain: string) {
		this.domain = domain.replace(/\/$/, '') // Remove trailing slash
	}

	/**
	 * Get all URLs in the sitemap
	 */
	getUrls(): SitemapUrl[] {
		return [...this.urls] // Return a copy to prevent mutation
	}

	/**
	 * Add a URL to the sitemap
	 */
	addUrl(url: SitemapUrl): void {
		// Ensure URL starts with domain
		if (!url.loc.startsWith('http')) {
			url.loc = `${this.domain}${url.loc.startsWith('/') ? '' : '/'}${url.loc}`
		}

		this.urls.push(url)
	}

	/**
	 * Add multiple URLs at once
	 */
	addUrls(urls: SitemapUrl[]): void {
		urls.forEach(url => this.addUrl(url))
	}

	/**
	 * Generate the XML sitemap content
	 */
	generateXML(): string {
		const urlEntries = this.urls
			.map(url => {
				return `  <url>
    <loc>${this.escapeXml(url.loc)}</loc>${
		url.lastmod
			? `
    <lastmod>${url.lastmod}</lastmod>`
			: ''
	}${
		url.changefreq
			? `
    <changefreq>${url.changefreq}</changefreq>`
			: ''
	}${
		url.priority
			? `
    <priority>${url.priority}</priority>`
			: ''
	}
  </url>`
			})
			.join('\n')

		return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
	}

	/**
	 * Generate sitemap index (for multiple sitemaps)
	 */
	generateSitemapIndex(sitemaps: string[]): string {
		const sitemapEntries = sitemaps
			.map(sitemap => {
				return `  <sitemap>
    <loc>${this.domain}/${sitemap}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`
			})
			.join('\n')

		return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`
	}

	/**
	 * Save sitemap to file
	 */
	async saveToFile(filePath: string): Promise<void> {
		const dir = path.dirname(filePath)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true })
		}

		fs.writeFileSync(filePath, this.generateXML(), 'utf8')
		console.log(`✅ Sitemap saved to: ${filePath}`)
	}

	/**
	 * Escape XML special characters
	 */
	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;')
	}
}

/**
 * Generate sitemaps for TenantFlow
 */
async function generateSitemaps() {
	const domain = process.env.VITE_SITE_URL || 'https://tenantflow.app'
	const today = new Date().toISOString().split('T')[0]

	console.log(`🗺️  Generating sitemaps for domain: ${domain}`)

	// Main sitemap
	const mainSitemap = new SitemapGenerator(domain)

	// Add public pages with dynamic priority based on importance
	const publicPages = [
		{ loc: '/', priority: '1.0', changefreq: 'daily' as const },
		{ loc: '/pricing', priority: '0.9', changefreq: 'weekly' as const },
		{
			loc: '/lease-generator',
			priority: '0.8',
			changefreq: 'weekly' as const
		},
		{ loc: '/auth/login', priority: '0.7', changefreq: 'monthly' as const },
		{
			loc: '/auth/signup',
			priority: '0.7',
			changefreq: 'monthly' as const
		},
		{
			loc: '/auth/forgot-password',
			priority: '0.5',
			changefreq: 'monthly' as const
		}
	]

	publicPages.forEach(page => {
		mainSitemap.addUrl({
			loc: page.loc,
			lastmod: today,
			changefreq: page.changefreq,
			priority: page.priority
		})
	})

	// You can add more dynamic URLs here in the future:
	// - Blog posts from your CMS
	// - Help articles
	// - Legal pages (terms, privacy)
	// - Landing pages for different property types

	const futurePages: {
		loc: string
		priority: string
		changefreq:
			| 'always'
			| 'hourly'
			| 'daily'
			| 'weekly'
			| 'monthly'
			| 'yearly'
			| 'never'
	}[] = [
		// Uncomment and modify these when you add these pages
		 { loc: '/blog', priority: '0.8', changefreq: 'weekly' as const },
		// { loc: '/terms', priority: '0.4', changefreq: 'yearly' as const },
		 { loc: '/privacy', priority: '0.4', changefreq: 'yearly' as const },
		// { loc: '/contact', priority: '0.6', changefreq: 'monthly' as const },
	]

	futurePages.forEach(page => {
		mainSitemap.addUrl({
			loc: page.loc,
			lastmod: today,
			changefreq: page.changefreq,
			priority: page.priority
		})
	})

	const contentSitemap = new SitemapGenerator(domain)

	// Add potential blog/help content
	contentSitemap.addUrls([
		 {
		   loc: '/blog',
		   lastmod: today,
		   changefreq: 'weekly',
		   priority: '0.8'
		 },
		// {
		//   loc: '/help',
		//   lastmod: today,
		//   changefreq: 'monthly',
		//   priority: '0.6'
		// },
		// {
		//   loc: '/terms',
		//   lastmod: today,
		//   changefreq: 'yearly',
		//   priority: '0.4'
		// },
		 {
		   loc: '/privacy',
		   lastmod: today,
		   changefreq: 'yearly',
		   priority: '0.4'
	 }
	])

	// Save main sitemap
	const publicDir = path.join(process.cwd(), 'public')
	await mainSitemap.saveToFile(path.join(publicDir, 'sitemap.xml'))

	// Generate sitemap index
	const sitemapIndex = new SitemapGenerator(domain)
	const indexXML = sitemapIndex.generateSitemapIndex(['sitemap.xml'])
	fs.writeFileSync(
		path.join(publicDir, 'sitemap-index.xml'),
		indexXML,
		'utf8'
	)

	console.log('✅ Sitemap index saved to: public/sitemap-index.xml')
	console.log('🎉 All sitemaps generated successfully!')

	// Log URLs for verification
	console.log('\n📋 URLs included in sitemap:')
	mainSitemap.getUrls().forEach(url => {
		console.log(`   ${url.loc} (priority: ${url.priority || 'default'})`)
	})
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	generateSitemaps().catch(console.error)
}

export { SitemapGenerator, generateSitemaps }
