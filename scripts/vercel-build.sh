#!/bin/bash

# Vercel Build Script - Ensures SEO files are generated during deployment
set -e

echo "🚀 Starting Vercel build process..."

# Generate SEO files first
echo "🗺️ Generating SEO files (sitemap & robots.txt)..."
npm run seo:generate

# Verify SEO files were created
if [ -f "public/sitemap.xml" ] && [ -f "public/robots.txt" ]; then
  echo "✅ SEO files generated successfully"
  URL_COUNT=$(grep -c '<url>' public/sitemap.xml || echo "0")
  echo "📄 Sitemap contains $URL_COUNT URLs"
else
  echo "⚠️ Warning: SEO files may not have been generated properly"
fi

# Run the actual build
echo "🔨 Building application..."
npm run build:fast

echo "✅ Build completed successfully!"
