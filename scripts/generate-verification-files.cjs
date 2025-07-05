#!/usr/bin/env node

/**
 * Generate verification files for search engines and analytics
 * Run: node scripts/generate-verification-files.js
 */

const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
	fs.mkdirSync(publicDir, { recursive: true })
}

console.log('🔧 Generating search engine verification files...')

// Google Search Console verification HTML file
const googleVerificationHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE_HERE" />
    <title>Google Site Verification - TenantFlow</title>
</head>
<body>
    <h1>Google Site Verification</h1>
    <p>This file verifies ownership of tenantflow.app for Google Search Console.</p>
    <p>Replace YOUR_GOOGLE_VERIFICATION_CODE_HERE with your actual verification code.</p>
    
    <h2>Setup Instructions:</h2>
    <ol>
        <li>Go to <a href="https://search.google.com/search-console">Google Search Console</a></li>
        <li>Add your property (tenantflow.app)</li>
        <li>Choose "HTML file upload" verification method</li>
        <li>Download the verification file they provide</li>
        <li>Replace this file with the downloaded file</li>
        <li>Click "Verify" in Search Console</li>
    </ol>
</body>
</html>`

// Bing Webmaster Tools verification file
const bingVerificationHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE_HERE" />
    <title>Bing Site Verification - TenantFlow</title>
</head>
<body>
    <h1>Bing Site Verification</h1>
    <p>This file verifies ownership of tenantflow.app for Bing Webmaster Tools.</p>
    <p>Replace YOUR_BING_VERIFICATION_CODE_HERE with your actual verification code.</p>
    
    <h2>Setup Instructions:</h2>
    <ol>
        <li>Go to <a href="https://www.bing.com/webmasters">Bing Webmaster Tools</a></li>
        <li>Add your site (tenantflow.app)</li>
        <li>Choose "HTML meta tag" verification method</li>
        <li>Copy the meta tag content value</li>
        <li>Update the meta tag in this file and in your SEO component</li>
        <li>Click "Verify" in Bing Webmaster Tools</li>
    </ol>
</body>
</html>`

// robots.txt enhancement
const robotsTxtContent = `# TenantFlow - Property Management Software
# https://tenantflow.app

User-agent: *
Allow: /

# Sitemaps
Sitemap: https://tenantflow.app/sitemap.xml
Sitemap: https://tenantflow.app/sitemap-index.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /auth/callback
Disallow: /tenant/accept-invitation

# Allow important pages for SEO
Allow: /lease-generator
Allow: /pricing
Allow: /blog
Allow: /lease-generator/*

# Crawl delay (optional)
Crawl-delay: 1

# Specific rules for search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /`

// Generate files
const files = [
	{
		path: path.join(publicDir, 'google-site-verification.html'),
		content: googleVerificationHTML,
		description: 'Google Search Console verification file'
	},
	{
		path: path.join(publicDir, 'bing-site-verification.html'),
		content: bingVerificationHTML,
		description: 'Bing Webmaster Tools verification file'
	},
	{
		path: path.join(publicDir, 'robots.txt'),
		content: robotsTxtContent,
		description:
			'Enhanced robots.txt with verification and crawl instructions'
	}
]

files.forEach(({ path: filePath, content, description }) => {
	try {
		fs.writeFileSync(filePath, content, 'utf8')
		console.log(`✅ Generated ${description}: ${path.basename(filePath)}`)
	} catch (error) {
		console.error(`❌ Failed to generate ${description}:`, error.message)
	}
})

console.log('\n📊 Verification Setup Checklist:')
console.log(
	'□ Replace Google verification code in google-site-verification.html'
)
console.log('□ Replace Google verification code in SEO.tsx component')
console.log('□ Replace Bing verification code in bing-site-verification.html')
console.log('□ Replace Bing verification code in SEO.tsx component')
console.log('□ Submit sitemap.xml to Google Search Console')
console.log('□ Submit sitemap.xml to Bing Webmaster Tools')
console.log('□ Set up URL inspection in Google Search Console')
console.log('□ Configure search analytics in both platforms')

console.log('\n🚀 Verification files generated successfully!')
console.log('   Files created:')
files.forEach(({ path: filePath }) => {
	console.log(`   - ${path.relative(process.cwd(), filePath)}`)
})

console.log('\n🔗 Next Steps:')
console.log('1. Deploy these files to production')
console.log(
	'2. Verify ownership in Google Search Console and Bing Webmaster Tools'
)
console.log('3. Submit your sitemaps to both platforms')
console.log('4. Set up performance monitoring with the verification codes')
