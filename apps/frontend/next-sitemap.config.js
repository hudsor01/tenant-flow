/** @type {import('next-sitemap').IConfig} */
module.exports = {
	siteUrl: process.env.NEXT_PUBLIC_SITE_URL || (() => {
		throw new Error('NEXT_PUBLIC_SITE_URL is required for sitemap generation')
	})(),
	generateRobotsTxt: true,
	generateIndexSitemap: false,
	exclude: [
		'/admin/*',
		'/api/*',
		'/manage/*',
		'/tenant/*',
		'/settings/*',
		'/profile/*'
	],
	robotsTxtOptions: {
		policies: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/admin/',
					'/api/',
					'/manage/',
					'/tenant/',
					'/settings/',
					'/profile/'
				]
			}
		]
	}
}
