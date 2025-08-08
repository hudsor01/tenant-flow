#!/bin/bash

# TenantFlow Deployment Environment Setup Script
# Sets up all necessary environment variables and validates Vercel configuration

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Environment variables needed for production deployment
REQUIRED_SECRETS=(
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
)

OPTIONAL_SECRETS=(
    "TURBO_TOKEN"
    "TURBO_TEAM"
    "NEXT_PUBLIC_POSTHOG_KEY"
    "NEXT_PUBLIC_GTM_ID"
)

check_github_secrets() {
    log "🔑 Checking GitHub repository secrets..."
    
    if ! command -v gh &> /dev/null; then
        warning "GitHub CLI not found - please verify secrets manually at:"
        warning "https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/settings/secrets/actions"
        return 0
    fi
    
    # Check if we're in a GitHub repository
    if ! gh auth status &>/dev/null; then
        warning "Not authenticated with GitHub CLI - run 'gh auth login'"
        return 0
    fi
    
    echo "Required secrets status:"
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if gh secret list | grep -q "^$secret"; then
            echo "  ✅ $secret - Set"
        else
            echo "  ❌ $secret - Missing"
        fi
    done
    
    echo
    echo "Optional secrets status:"
    for secret in "${OPTIONAL_SECRETS[@]}"; do
        if gh secret list | grep -q "^$secret"; then
            echo "  ✅ $secret - Set"
        else
            echo "  ⚪ $secret - Not set (optional)"
        fi
    done
}

setup_vercel_project() {
    log "🚀 Setting up Vercel project configuration..."
    
    if [ ! -f "apps/frontend/vercel.json" ]; then
        error "vercel.json not found in apps/frontend/"
    fi
    
    # Validate vercel.json syntax
    if ! python3 -m json.tool apps/frontend/vercel.json > /dev/null 2>&1; then
        if ! node -e "JSON.parse(require('fs').readFileSync('apps/frontend/vercel.json', 'utf8'))" > /dev/null 2>&1; then
            error "Invalid JSON in vercel.json"
        fi
    fi
    
    success "Vercel configuration validated"
}

generate_env_template() {
    log "📝 Generating environment template..."
    
    cat > apps/frontend/.env.example << 'EOF'
# TenantFlow Frontend Environment Variables
# Copy to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Configuration
NEXT_PUBLIC_API_URL=https://api.tenantflow.app

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_your-posthog-key
NEXT_PUBLIC_GTM_ID=G-XXXXXXXXXX

# Development Only
NEXT_PUBLIC_DEBUG=false
EOF

    success "Environment template created at apps/frontend/.env.example"
}

check_deployment_readiness() {
    log "🔍 Checking deployment readiness..."
    
    cd apps/frontend
    
    # Check if package.json has required scripts
    REQUIRED_SCRIPTS=("build" "start" "lint")
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if ! npm run $script --silent --dry-run &>/dev/null; then
            if ! grep -q "\"$script\":" package.json; then
                error "Missing required script: $script"
            fi
        fi
    done
    
    # Check for critical files
    REQUIRED_FILES=("next.config.ts" "package.json" "tsconfig.json")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            error "Missing required file: $file"
        fi
    done
    
    # Check Next.js configuration
    if [ -f "next.config.ts" ]; then
        log "✅ Next.js TypeScript config found"
    elif [ -f "next.config.js" ]; then
        log "✅ Next.js JavaScript config found"
    else
        error "No Next.js configuration file found"
    fi
    
    cd ../..
    success "Deployment readiness check passed"
}

setup_github_environments() {
    log "🏭 Setting up GitHub environments..."
    
    if ! command -v gh &> /dev/null; then
        warning "GitHub CLI not found - please set up environments manually"
        return 0
    fi
    
    # Try to create production environment
    if gh api repos/:owner/:repo/environments/production --silent 2>/dev/null; then
        log "Production environment already exists"
    else
        gh api repos/:owner/:repo/environments/production -X PUT \
            --field wait_timer=0 \
            --field prevent_self_review=false \
            --field reviewers='[]' \
            --field deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}' \
            2>/dev/null || warning "Could not create production environment"
    fi
    
    # Try to create preview environment
    if gh api repos/:owner/:repo/environments/preview --silent 2>/dev/null; then
        log "Preview environment already exists"
    else
        gh api repos/:owner/:repo/environments/preview -X PUT \
            --field wait_timer=0 \
            --field prevent_self_review=false \
            --field reviewers='[]' \
            2>/dev/null || warning "Could not create preview environment"
    fi
}

generate_deployment_checklist() {
    log "📋 Generating deployment checklist..."
    
    cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# TenantFlow Frontend Deployment Checklist

## Pre-Deployment
- [ ] All GitHub secrets configured
- [ ] Vercel project linked (`VERCEL_PROJECT_ID` set)
- [ ] Environment variables validated
- [ ] Build passes locally (`npm run build`)
- [ ] Tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)

## Deployment Steps
- [ ] Create feature branch from `develop`
- [ ] Push changes and create PR to `main`
- [ ] Wait for CI/CD pipeline to pass
- [ ] Merge PR to `main` for production deployment

## Post-Deployment Validation
- [ ] Health check passes (200 response)
- [ ] Critical pages load correctly
- [ ] Authentication flow works
- [ ] API integration functional
- [ ] Performance acceptable (<3s load time)
- [ ] No console errors in browser

## Emergency Procedures
- [ ] Rollback plan documented
- [ ] Emergency contacts identified
- [ ] Monitoring alerts configured

## Production URLs
- Production: https://tenantflow.app
- API: https://api.tenantflow.app
- Status: https://status.tenantflow.app (if configured)

## Useful Commands
```bash
# Deploy to preview
./apps/frontend/deploy-production.sh --preview

# Deploy to production (force)
./apps/frontend/deploy-production.sh --force

# Check deployment status
vercel ls --token=$VERCEL_TOKEN

# Rollback deployment
vercel rollback [deployment-url] --token=$VERCEL_TOKEN
```
EOF

    success "Deployment checklist created: DEPLOYMENT_CHECKLIST.md"
}

main() {
    log "🚀 TenantFlow Deployment Environment Setup"
    log "========================================"
    
    # Ensure we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "apps/frontend" ]; then
        error "Run this script from the repository root directory"
    fi
    
    check_github_secrets
    setup_vercel_project
    generate_env_template
    check_deployment_readiness
    setup_github_environments
    generate_deployment_checklist
    
    echo
    success "🎉 Deployment environment setup completed!"
    echo
    log "Next steps:"
    log "1. Review DEPLOYMENT_CHECKLIST.md"
    log "2. Configure missing GitHub secrets"
    log "3. Test deployment with: ./apps/frontend/deploy-production.sh --preview"
    log "4. Deploy to production by merging to main branch"
}

main "$@"