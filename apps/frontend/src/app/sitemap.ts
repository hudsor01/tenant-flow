import { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tenantflow.app';
  
  // Static routes that should be in sitemap
  const staticRoutes = [
    '',
    '/login',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ];

  // Generate entries for each locale
  const staticEntries = staticRoutes.flatMap((route) => 
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((lang) => [lang, `${baseUrl}/${lang}${route}`])
        ),
      },
    }))
  );

  // In production, you would fetch dynamic content
  // Example: properties, blog posts, etc.
  // const properties = await getProperties();
  // const propertyEntries = properties.map(property => ({
  //   url: `${baseUrl}/properties/${property.id}`,
  //   lastModified: new Date(property.updatedAt),
  //   changeFrequency: 'monthly' as const,
  //   priority: 0.6,
  // }));

  return [
    ...staticEntries,
    // ...propertyEntries,
  ];
}