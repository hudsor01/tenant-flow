import type { MetadataRoute } from 'next'

import { getSiteUrl } from '#lib/generate-metadata'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: ['/', '/_next/static/', '/_next/image/'],
				// No trailing slashes — `/dashboard` blocks both `/dashboard` and
			// `/dashboard/anything`. Trailing-slash form only blocks subpaths.
			disallow: [
					'/admin',
					'/api',
					'/auth/callback',
					'/auth/confirm-email',
					'/auth/post-checkout',
					'/auth/select-role',
					'/auth/signout',
					'/auth/update-password',
					'/dashboard',
					'/tenant',
					'/owner',
					'/settings',
					'/profile',
					'/billing',
					'/_next/data',
					'/monitoring',
				],
			},
		],
		sitemap: `${getSiteUrl()}/sitemap.xml`,
		host: getSiteUrl(),
	}
}
