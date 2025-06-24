#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import state data
import { ALL_US_STATES } from '../src/lib/state-data.ts';

const DOMAIN = 'https://tenantflow.app';

// Static pages with their priorities and change frequencies
const staticPages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/pricing', priority: 0.9, changefreq: 'weekly' },
  { url: '/lease-generator', priority: 0.8, changefreq: 'weekly' },
  { url: '/lease-generator/create', priority: 0.7, changefreq: 'weekly' },
  { url: '/lease-generator/states', priority: 0.6, changefreq: 'weekly' },
  { url: '/blog', priority: 0.8, changefreq: 'daily' },
  { url: '/auth/login', priority: 0.7, changefreq: 'monthly' },
  { url: '/auth/signup', priority: 0.7, changefreq: 'monthly' },
  { url: '/auth/forgot-password', priority: 0.5, changefreq: 'monthly' }
];

// Generate state-specific pages
const statePages = Object.keys(ALL_US_STATES).map(stateKey => {
  const stateData = ALL_US_STATES[stateKey];
  const slug = stateData.name.toLowerCase().replace(/\s+/g, '-');
  
  return {
    url: `/lease-generator/${slug}`,
    priority: 0.8, // High priority for state pages
    changefreq: 'weekly',
    state: stateData.name,
    searchVolume: stateData.searchVolume
  };
});

// Sort state pages by search volume (highest first)
statePages.sort((a, b) => b.searchVolume - a.searchVolume);

// Blog article pages
const blogPages = [
  {
    url: '/blog/property-management-software-comparison-2025',
    priority: 0.8,
    changefreq: 'monthly',
    title: 'Property Management Software Comparison 2025: Complete Guide'
  },
  {
    url: '/blog/california-landlord-guide-2025',
    priority: 0.7,
    changefreq: 'monthly',
    title: 'California Landlord Guide: Legal Requirements 2025'
  },
  {
    url: '/blog/tenant-screening-process',
    priority: 0.7,
    changefreq: 'monthly',
    title: 'How to Screen Tenants: 10-Step Process for Property Owners'
  }
];

// Generate XML sitemap
function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static pages
  staticPages.forEach(page => {
    xml += `
  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Add state-specific pages
  statePages.forEach(page => {
    xml += `
  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Add blog pages
  blogPages.forEach(page => {
    xml += `
  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  return xml;
}

// Generate sitemap index for multiple sitemaps
function generateSitemapIndex() {
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

// Generate robots.txt
function generateRobotsTxt() {
  return `# Robots.txt for TenantFlow - Property Management Platform
# Generated on ${new Date().toISOString().split('T')[0]}

User-agent: *
Allow: /

# Allow public pages
Allow: /
Allow: /pricing
Allow: /lease-generator
Allow: /lease-generator/create
Allow: /lease-generator/states
Allow: /blog
${statePages.map(page => `Allow: ${page.url}`).join('\n')}
${blogPages.map(page => `Allow: ${page.url}`).join('\n')}
Allow: /auth/login
Allow: /auth/signup
Allow: /auth/forgot-password

# Disallow private/sensitive areas
Disallow: /dashboard
Disallow: /properties
Disallow: /tenants
Disallow: /maintenance
Disallow: /finances
Disallow: /reports
Disallow: /settings
Disallow: /profile
Disallow: /tenant/
Disallow: /auth/callback
Disallow: /auth/setup-account
Disallow: /auth/update-password
Disallow: /api/
Disallow: /_next/
Disallow: /admin
Disallow: /.git
Disallow: /node_modules
Disallow: /src
Disallow: /dist
Disallow: /*.env*
Disallow: /logs/
Disallow: /tmp/

# Crawl delay (optional)
Crawl-delay: 1

# Sitemap
Sitemap: ${DOMAIN}/sitemap.xml

# Search Engine Specific Rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 1

# Block resource-intensive bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /
`;
}

// Main execution
async function main() {
  try {
    console.log('🔧 Generating SEO files...');
    
    const publicDir = path.join(__dirname, '../public');
    
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Generate and write sitemap
    const sitemap = generateSitemap();
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('✅ Generated sitemap.xml');
    
    // Generate and write sitemap index
    const sitemapIndex = generateSitemapIndex();
    fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), sitemapIndex);
    console.log('✅ Generated sitemap-index.xml');
    
    // Generate and write robots.txt
    const robotsTxt = generateRobotsTxt();
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
    console.log('✅ Generated robots.txt');
    
    console.log('\n📊 SEO Statistics:');
    console.log(`   Static pages: ${staticPages.length}`);
    console.log(`   State pages: ${statePages.length}`);
    console.log(`   Blog pages: ${blogPages.length}`);
    console.log(`   Total URLs: ${staticPages.length + statePages.length + blogPages.length}`);
    console.log(`   Top states by search volume:`);
    
    statePages.slice(0, 5).forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.state}: ${page.searchVolume.toLocaleString()} monthly searches`);
    });
    
    console.log('\n🚀 SEO files generated successfully!');
    console.log('   Files created:');
    console.log('   - public/sitemap.xml');
    console.log('   - public/sitemap-index.xml');
    console.log('   - public/robots.txt');
    
  } catch (error) {
    console.error('❌ Error generating SEO files:', error);
    process.exit(1);
  }
}

main();