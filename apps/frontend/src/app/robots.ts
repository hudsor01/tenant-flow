import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://tenantflow.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/pricing', '/about', '/contact'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/properties/',
          '/tenants/',
          '/maintenance/',
          '/reports/',
          '/settings/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}