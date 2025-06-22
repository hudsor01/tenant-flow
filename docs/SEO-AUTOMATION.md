# SEO Automation for TenantFlow

This document explains how TenantFlow automatically maintains SEO files (sitemap.xml and robots.txt) to ensure optimal search engine indexing.

## 🎯 Overview

TenantFlow uses automated SEO file generation to:
- Keep sitemap.xml always current with latest pages
- Update robots.txt with proper crawling permissions
- Notify search engines when content changes
- Maintain SEO health without manual intervention

## 🔄 Automation Triggers

### 1. GitHub Actions (Production)
- **Triggers**: Push to main/master branch, manual dispatch, daily at 6 AM UTC
- **Actions**: Generates fresh SEO files, commits changes, notifies search engines
- **File**: `.github/workflows/update-sitemap.yml`

### 2. Pre-commit Hooks (Development)
- **Triggers**: Before each git commit
- **Actions**: Updates SEO files if source code changes
- **File**: `.githooks/pre-commit`

### 3. Pre-push Hooks (Quality Assurance)
- **Triggers**: Before each git push
- **Actions**: Ensures SEO files are current, auto-commits updates
- **File**: `.githooks/pre-push`
- **Behavior**: Generates fresh SEO files, commits changes with `[skip ci]`

### 4. Manual Generation
- **Command**: `npm run seo:generate`
- **Use case**: Development testing, manual updates

## 📁 Generated Files

### Sitemap.xml
- **Location**: `public/sitemap.xml`
- **Contains**: All public pages with priorities and update frequencies
- **URLs Included**:
  - Homepage (priority: 1.0)
  - Pricing page (priority: 0.9)
  - Lease generator (priority: 0.8)
  - Auth pages (priority: 0.7)

### Robots.txt
- **Location**: `public/robots.txt`
- **Contains**: Crawling permissions for search engines
- **Blocks**: Private areas (dashboard, tenant portal, API routes)
- **Allows**: Public pages (homepage, pricing, auth)

### Sitemap Index
- **Location**: `public/sitemap-index.xml`
- **Purpose**: References all sitemap files (future expansion)

## 🛠 Available Commands

```bash
# Generate both sitemap and robots.txt
npm run seo:generate

# Generate sitemap only
npm run sitemap:generate

# Generate robots.txt only
npm run robots:generate

# Setup development environment (includes Git hooks)
npm run setup
```

## 🔧 Configuration

### Domain Configuration
The domain is automatically detected from:
1. `VITE_SITE_URL` environment variable
2. `VERCEL_URL` environment variable (for Vercel deployments)
3. Fallback: `https://tenantflow.app`

### GitHub Secrets (Optional)
For enhanced automation, configure these secrets in your GitHub repository:

```bash
# Vercel Integration (optional)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Custom domain (optional)
PRODUCTION_URL=https://your-domain.com
```

## 📈 Search Engine Notification

The automation automatically notifies search engines when sitemaps update:

- **Google**: `https://www.google.com/ping?sitemap=your-site/sitemap.xml`
- **Bing**: `https://www.bing.com/ping?sitemap=your-site/sitemap.xml`

## 🎮 Manual Setup

If you need to set up the automation manually:

```bash
# 1. Install dependencies
npm install

# 2. Setup Git hooks and generate initial SEO files
npm run setup

# 3. Verify files were created
ls -la public/sitemap* public/robots.txt
```

## 🔍 Verification

### Check Generated Files
```bash
# View sitemap
cat public/sitemap.xml

# View robots.txt
cat public/robots.txt

# Check sitemap in browser
open http://localhost:5173/sitemap.xml
```

### Test Search Engine Access
```bash
# Test robots.txt
curl https://your-domain.com/robots.txt

# Test sitemap
curl https://your-domain.com/sitemap.xml
```

## 🚨 Troubleshooting

### SEO Files Not Updating
1. Check if GitHub Actions have proper permissions
2. Verify the pre-commit hook is executable: `chmod +x .githooks/pre-commit`
3. Ensure Git hooks are configured: `git config core.hooksPath .githooks`

### Missing URLs in Sitemap
1. Add new routes to `scripts/generate-sitemap.ts`
2. Run `npm run seo:generate` to regenerate
3. Commit and push changes

### Search Engines Not Finding Site
1. Manually submit sitemap to Google Search Console
2. Verify robots.txt allows crawling: `https://your-domain.com/robots.txt`
3. Check domain configuration in scripts

## 🎯 Best Practices

1. **Keep URLs Updated**: Add new public routes to the sitemap generator
2. **Monitor Automation**: Check GitHub Actions regularly for failures
3. **Test Locally**: Run `npm run seo:generate` before major deployments
4. **Verify Access**: Regularly check that public pages are accessible
5. **Update Priorities**: Adjust page priorities based on importance

## 📊 SEO Health Monitoring

The automation includes basic monitoring:
- Logs number of URLs in sitemap
- Verifies file generation success
- Reports changes via GitHub comments
- Tracks search engine notification status

For advanced SEO monitoring, consider integrating:
- Google Search Console
- Google Analytics
- Third-party SEO tools
- Core Web Vitals monitoring

## 🔄 Future Enhancements

Planned improvements:
- Dynamic page discovery from React Router
- Image sitemap generation
- Video sitemap support
- Multi-language sitemap handling
- Advanced SEO metadata automation
