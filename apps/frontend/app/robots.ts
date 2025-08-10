import type { MetadataRoute } from '../src/types/next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tenantflow.app'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/auth/login',
          '/auth/signup',
          '/privacy-policy',
          '/terms-of-service',
          '/tenant-portal'
        ],
        disallow: [
          '/dashboard/*',
          '/properties/*', 
          '/tenants/*',
          '/maintenance/*',
          '/reports/*',
          '/settings/*',
          '/api/*',
          '/auth/callback',
          '/auth/reset-password',
          '/ingest/*',
          '/_next/',
          '/static/'
        ]
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/pricing',
          '/features',
          '/privacy-policy',
          '/terms-of-service'
        ],
        disallow: [
          '/dashboard/*',
          '/properties/*',
          '/tenants/*', 
          '/maintenance/*',
          '/reports/*',
          '/settings/*',
          '/api/*',
          '/auth/*',
          '/ingest/*',
          '/_next/',
          '/static/'
        ]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  }
}