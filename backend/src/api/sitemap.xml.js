export default function handler(request, response) {
  const baseUrl = 'https://tenantflow.app';

  // Define all public pages with their priority and change frequency
  const pages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/lease-generator', priority: '0.8', changefreq: 'monthly' },
    { path: '/lease-generator/create', priority: '0.7', changefreq: 'monthly' },
    { path: '/auth/login', priority: '0.6', changefreq: 'monthly' },
    { path: '/auth/signup', priority: '0.6', changefreq: 'monthly' },
  ];

  // Generate XML sitemap
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  // Set proper content type and cache headers
  response.setHeader('Content-Type', 'application/xml');
  response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  response.status(200).send(xml);
}
