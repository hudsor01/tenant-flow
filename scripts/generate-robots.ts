/**
 * Robots.txt Generator for TenantFlow
 * Generates robots.txt with current domain and sitemap location
 */

import fs from 'fs';
import path from 'path';

interface RobotsConfig {
  domain: string;
  sitemap?: string;
  allowPaths?: string[];
  disallowPaths?: string[];
  userAgent?: string;
}

class RobotsGenerator {
  private config: RobotsConfig;

  constructor(config: RobotsConfig) {
    this.config = {
      userAgent: '*',
      sitemap: '/sitemap.xml',
      allowPaths: ['/'],
      disallowPaths: [],
      ...config
    };
  }

  /**
   * Generate robots.txt content
   */
  generate(): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const domain = this.config.domain.replace(/\/$/, '');
    
    let content = `# Robots.txt for TenantFlow - Property Management Platform\n`;
    content += `# Generated on ${timestamp}\n\n`;
    
    content += `User-agent: ${this.config.userAgent}\n`;
    
    // Add allowed paths
    if (this.config.allowPaths && this.config.allowPaths.length > 0) {
      this.config.allowPaths.forEach(path => {
        content += `Allow: ${path}\n`;
      });
    }
    
    content += '\n';
    
    // Add specific allowed public pages
    const publicPages = [
      '/',
      '/pricing',
      '/lease-generator', 
      '/auth/login',
      '/auth/signup',
      '/auth/forgot-password'
    ];
    
    content += '# Allow public pages\n';
    publicPages.forEach(page => {
      content += `Allow: ${page}\n`;
    });
    
    content += '\n# Disallow private/sensitive areas\n';
    
    // Add disallowed paths
    const privatePaths = [
      '/dashboard',
      '/properties',
      '/tenants',
      '/maintenance',
      '/finances',
      '/reports',
      '/settings',
      '/profile',
      '/tenant/',
      '/auth/callback',
      '/auth/setup-account',
      '/auth/update-password',
      '/api/',
      '/_next/',
      '/admin',
      '/.git',
      '/node_modules',
      '/src',
      '/dist',
      '/*.env*',
      '/logs/',
      '/tmp/',
      ...this.config.disallowPaths || []
    ];
    
    privatePaths.forEach(path => {
      content += `Disallow: ${path}\n`;
    });
    
    content += '\n# Crawl delay (optional)\n';
    content += 'Crawl-delay: 1\n\n';
    
    // Add sitemap
    if (this.config.sitemap) {
      const sitemapUrl = this.config.sitemap.startsWith('http') 
        ? this.config.sitemap 
        : `${domain}${this.config.sitemap}`;
      content += `# Sitemap\n`;
      content += `Sitemap: ${sitemapUrl}\n`;
    }
    
    // Add additional search engine specific rules
    content += '\n# Search Engine Specific Rules\n';
    content += 'User-agent: Googlebot\n';
    content += 'Allow: /\n';
    content += 'Crawl-delay: 0.5\n\n';
    
    content += 'User-agent: Bingbot\n';
    content += 'Allow: /\n';
    content += 'Crawl-delay: 1\n\n';
    
    // Block common bots that might consume resources
    const blockBots = [
      'AhrefsBot',
      'SemrushBot', 
      'MJ12bot',
      'DotBot',
      'BLEXBot'
    ];
    
    content += '# Block resource-intensive bots\n';
    blockBots.forEach(bot => {
      content += `User-agent: ${bot}\n`;
      content += `Disallow: /\n\n`;
    });
    
    return content;
  }

  /**
   * Save robots.txt to public directory
   */
  async saveToFile(filePath: string): Promise<void> {
    const content = this.generate();
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Robots.txt saved to: ${filePath}`);
  }
}

/**
 * Generate robots.txt file
 */
async function generateRobots(): Promise<void> {
  // Get domain from environment or use default
  const domain = process.env.VITE_SITE_URL || 
                process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                'https://tenantflow.app'; // Replace with your actual domain
  
  console.log(`🤖 Generating robots.txt for domain: ${domain}`);
  
  const robotsGenerator = new RobotsGenerator({
    domain,
    sitemap: `${domain}/sitemap.xml`
  });
  
  const publicDir = path.join(process.cwd(), 'public');
  await robotsGenerator.saveToFile(path.join(publicDir, 'robots.txt'));
  
  console.log('🎉 Robots.txt generated successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateRobots().catch(console.error);
}

export { RobotsGenerator, generateRobots };
