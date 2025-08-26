#!/bin/bash

set -e

echo "🔧 Setting up TenantFlow CI/CD hooks..."

# Initialize Husky
echo "📋 Initializing Husky hooks..."
npm run prepare

# Make hook files executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/_/husky.sh

# Verify hooks are working
echo "✅ Testing pre-commit hook setup..."
if [[ -f ".husky/pre-commit" ]]; then
    echo "✅ Pre-commit hook installed"
else
    echo "❌ Pre-commit hook not found"
    exit 1
fi

if [[ -f ".husky/commit-msg" ]]; then
    echo "✅ Commit message hook installed"
else
    echo "❌ Commit message hook not found"
    exit 1
fi

echo ""
echo "🚀 CI/CD Setup Complete!"
echo ""
echo "Available commands:"
echo "  npm run claude:check     - Run all quality checks"
echo "  npm run lint-staged      - Run pre-commit hooks manually"
echo "  npm run format           - Format all code"
echo ""
echo "Quality gates enforced:"
echo "  ✓ ESLint (zero warnings)"
echo "  ✓ TypeScript strict mode"
echo "  ✓ Test coverage (10% → 70%)"
echo "  ✓ Bundle size limits"
echo "  ✓ Security scanning"
echo "  ✓ Performance benchmarks"
echo ""
echo "Happy coding! 🎉"