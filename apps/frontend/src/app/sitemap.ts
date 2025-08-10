import type { MetadataRoute } from '@/types/next';
import { locales } from '@/lib/i18n/config';
import { unstable_noStore as noStore } from 'next/cache';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  noStore();
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app';
  const currentDate = new Date();
  
  const staticRoutes = [
    { path: '', changeFrequency: 'daily' as const, priority: 1.0 },
    { path: '/pricing', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/features', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.7 },
    { path: '/login', changeFrequency: 'yearly' as const, priority: 0.6 },
    { path: '/signup', changeFrequency: 'yearly' as const, priority: 0.6 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/cookies', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const staticEntries = staticRoutes.flatMap(({ path, changeFrequency, priority }) => 
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: currentDate,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((lang) => [lang, `${baseUrl}/${lang}${path}`])
        ),
      },
    }))
  );

  const dynamicEntries: MetadataRoute.Sitemap = [];
  
  const allEntries = [...staticEntries, ...dynamicEntries];
  allEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return allEntries;
}

export const revalidate = 3600;