#!/usr/bin/env node

/**
 * Enhanced SEO Generation Script for TenantFlow
 * Optimized for Google Search Console and organic traffic
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  domain: 'https://tenantflow.app',
  publicDir: path.join(__dirname, '../apps/frontend/public'),
  distDir: path.join(__dirname, '../apps/frontend/dist'),
  outputDir: path.join(__dirname, '../apps/frontend/public'),
  
  // SEO optimization settings
  sitemapSettings: {
    maxUrls: 50000,
    includeImages: true,
    includeAlternateLanguages: false,
    changeFrequency: {
      homepage: 'daily',
      tools: 'weekly',
      blog: 'weekly',
      static: 'monthly'
    },
    priority: {
      homepage: 1.0,
      tools: 0.9,
      blog: 0.8,
      static: 0.6
    }
  },
  
  // Google Search Console optimization
  googleOptimization: {
    enableRichSnippets: true,
    enableBreadcrumbs: true,
    enableOrganizationSchema: true,
    enableProductSchema: true,
    enableFAQSchema: true
  }
};

// Core URL structures for TenantFlow
const URLS = {
  static: [
    { url: '/', changefreq: 'daily', priority: 1.0, lastmod: new Date().toISOString() },
    { url: '/pricing', changefreq: 'weekly', priority: 0.9 },
    { url: '/contact', changefreq: 'monthly', priority: 0.7 },
    { url: '/about', changefreq: 'monthly', priority: 0.6 },
    { url: '/privacy', changefreq: 'monthly', priority: 0.5 },
    { url: '/terms', changefreq: 'monthly', priority: 0.5 }
  ],
  
  tools: [
    { url: '/tools/lease-generator', changefreq: 'weekly', priority: 0.9 },
    { url: '/tools/invoice-generator', changefreq: 'weekly', priority: 0.9 },
    { url: '/tools/rent-calculator', changefreq: 'weekly', priority: 0.8 },
    { url: '/tools/maintenance-tracker', changefreq: 'weekly', priority: 0.8 }
  ],
  
  // State-specific lease generators (high-value SEO pages)
  states: [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 
    'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire',
    'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia',
    'wisconsin', 'wyoming'
  ].map(state => ({
    url: `/tools/lease-generator/${state}`,
    changefreq: 'weekly',
    priority: 0.8,
    lastmod: new Date().toISOString()
  }))
};

// Utility functions
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

const ensureDirectoryExists = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
};

const logStep = (message, type = 'info') => {
  const icons = { info: '📝', success: '✅', warning: '⚠️', error: '❌' };
  console.log(`${icons[type]} ${message}`);
};

// Generate XML sitemap
const generateSitemap = async () => {
  logStep('Generating optimized XML sitemap...');
  
  const allUrls = [
    ...URLS.static,
    ...URLS.tools,
    ...URLS.states
  ];
  
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${allUrls.map(({ url, changefreq, priority, lastmod }) => `  <url>
    <loc>${CONFIG.domain}${url}</loc>
    <lastmod>${lastmod || formatDate(new Date())}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  await fs.writeFile(path.join(CONFIG.outputDir, 'sitemap.xml'), xmlContent);
  logStep(`Generated sitemap with ${allUrls.length} URLs`, 'success');
};

// Generate sitemap index for large sites
const generateSitemapIndex = async () => {
  logStep('Generating sitemap index...');
  
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${CONFIG.domain}/sitemap.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${CONFIG.domain}/sitemap-states.xml</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
  </sitemap>
</sitemapindex>`;

  await fs.writeFile(path.join(CONFIG.outputDir, 'sitemap-index.xml'), sitemapIndex);
  
  // Generate state-specific sitemap
  const statesSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${URLS.states.map(({ url, changefreq, priority, lastmod }) => `  <url>
    <loc>${CONFIG.domain}${url}</loc>
    <lastmod>${lastmod || formatDate(new Date())}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  await fs.writeFile(path.join(CONFIG.outputDir, 'sitemap-states.xml'), statesSitemap);
  logStep('Generated sitemap index and state-specific sitemap', 'success');
};

// Generate robots.txt optimized for SEO
const generateRobots = async () => {
  logStep('Generating SEO-optimized robots.txt...');
  
  const robotsContent = `# Robots.txt for TenantFlow - Property Management Software
# Generated: ${new Date().toISOString()}

User-agent: *
Allow: /

# High-value pages for SEO
Allow: /tools/
Allow: /pricing
Allow: /contact
Allow: /blog/

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/
Disallow: /_next/
Disallow: /private/

# Disallow duplicate content
Disallow: /*?*
Disallow: /*#*

# Allow specific query parameters for tools
Allow: /tools/lease-generator?*
Allow: /tools/invoice-generator?*

# Sitemaps
Sitemap: ${CONFIG.domain}/sitemap-index.xml
Sitemap: ${CONFIG.domain}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Google-specific optimizations
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Bing-specific optimizations
User-agent: Bingbot
Allow: /
Crawl-delay: 1`;

  await fs.writeFile(path.join(CONFIG.outputDir, 'robots.txt'), robotsContent);
  logStep('Generated SEO-optimized robots.txt', 'success');
};

// Generate Google Search Console verification files
const generateVerificationFiles = async () => {
  logStep('Generating verification files...');
  
  // Google Search Console verification (placeholder)
  const googleVerification = `google-site-verification: google123456789abcdef.html`;
  await fs.writeFile(path.join(CONFIG.outputDir, 'google123456789abcdef.html'), googleVerification);
  
  // Bing Webmaster Tools verification (placeholder)
  const bingVerification = `<?xml version="1.0"?>
<users>
  <user>123456789ABCDEF</user>
</users>`;
  await fs.writeFile(path.join(CONFIG.outputDir, 'BingSiteAuth.xml'), bingVerification);
  
  logStep('Generated verification files (update with actual verification codes)', 'success');
};

// Generate structured data schema
const generateStructuredData = async () => {
  logStep('Generating structured data schema...');
  
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TenantFlow",
    "description": "Professional property management software for landlords and property managers",
    "url": CONFIG.domain,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "29.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TenantFlow",
      "url": CONFIG.domain
    }
  };
  
  await fs.writeFile(
    path.join(CONFIG.outputDir, 'structured-data.json'),
    JSON.stringify(organizationSchema, null, 2)
  );
  
  logStep('Generated structured data schema', 'success');
};

// Validate generated files
const validateSEOFiles = async () => {
  logStep('Validating SEO files...');
  
  const requiredFiles = [
    'sitemap.xml',
    'sitemap-index.xml',
    'robots.txt',
    'structured-data.json'
  ];
  
  const validationResults = [];
  
  for (const file of requiredFiles) {
    try {
      const filePath = path.join(CONFIG.outputDir, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      validationResults.push({
        file,
        exists: true,
        size: stats.size,
        valid: content.length > 0,
        lastModified: stats.mtime
      });
      
      logStep(`✓ ${file} - ${stats.size} bytes - ${formatDate(stats.mtime)}`, 'success');
    } catch (error) {
      validationResults.push({
        file,
        exists: false,
        error: error.message
      });
      logStep(`✗ ${file} - Missing or invalid`, 'error');
    }
  }
  
  return validationResults;
};

// Main execution
const main = async () => {
  try {
    logStep('🚀 Starting SEO optimization generation...', 'info');
    
    // Ensure output directory exists
    await ensureDirectoryExists(CONFIG.outputDir);
    
    // Generate all SEO files
    await generateSitemap();
    await generateSitemapIndex();
    await generateRobots();
    await generateVerificationFiles();
    await generateStructuredData();
    
    // Validate everything
    const validationResults = await validateSEOFiles();
    
    // Summary
    const validFiles = validationResults.filter(r => r.exists && r.valid).length;
    const totalFiles = validationResults.length;
    
    logStep(`🎉 SEO optimization complete! ${validFiles}/${totalFiles} files generated successfully`, 'success');
    
    // Output file sizes for monitoring
    const totalSize = validationResults.reduce((sum, r) => sum + (r.size || 0), 0);
    logStep(`📊 Total SEO files size: ${(totalSize / 1024).toFixed(2)} KB`, 'info');
    
  } catch (error) {
    logStep(`❌ SEO generation failed: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = { main, generateSitemap, generateRobots, validateSEOFiles };