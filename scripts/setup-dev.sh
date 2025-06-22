#!/bin/bash
# Setup script for TenantFlow development environment

echo "🚀 Setting up TenantFlow development environment..."

# Make git hooks executable
if [ -d ".githooks" ]; then
    echo "📋 Setting up Git hooks..."
    chmod +x .githooks/*
    git config core.hooksPath .githooks
    echo "✅ Git hooks configured"
else
    echo "⚠️ .githooks directory not found, skipping Git hooks setup"
fi

# Generate initial SEO files
echo "🗺️ Generating initial SEO files..."
npm run seo:generate

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Available commands:"
echo "  npm run dev              - Start development server"
echo "  npm run build            - Build for production"
echo "  npm run seo:generate     - Generate sitemap and robots.txt"
echo "  npm run sitemap:generate - Generate sitemap only"
echo "  npm run robots:generate  - Generate robots.txt only"
echo ""
echo "🔗 SEO files will be automatically updated on:"
echo "  • Git commits (via pre-commit hook)"
echo "  • GitHub pushes (via GitHub Actions)"
echo "  • Daily at 6 AM UTC (via scheduled workflow)"
