import type { MetadataRoute } from 'next'

import { getSiteUrl } from '#lib/generate-metadata'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/', '/_next/static/', '/_next/image/'],
				disallow: [
					'/admin/',
					'/api/',
					'/auth/',
					'/dashboard/',
					'/tenant/',
					'/settings/',
					'/profile/',
					'/billing/',
					'/_next/data/',
					'/monitoring/',
				],
			},
		],
		sitemap: `${getSiteUrl()}/sitemap.xml`,
		host: getSiteUrl(),
	}
}
