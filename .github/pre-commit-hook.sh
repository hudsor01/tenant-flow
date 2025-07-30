#!/bin/bash
# Pre-commit hook to detect secrets before committing
# Install this by running: cp .github/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "🔍 Running pre-commit security check..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for common secret patterns
check_secrets() {
    local files="$1"
    local found_secrets=0
    
    # Critical patterns that should NEVER be committed
    critical_patterns=(
        # AWS
        "AKIA[0-9A-Z]{16}"
        
        # Stripe
        "sk_live_[0-9a-zA-Z]{24,}"
        "rk_live_[0-9a-zA-Z]{24,}"
        
        # GitHub
        "ghp_[0-9a-zA-Z]{36}"
        "gho_[0-9a-zA-Z]{36}"
        "github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}"
        
        # Generic API keys
        "api[_-]?key\s*[:=]\s*['\"][0-9a-zA-Z]{32,}['\"]"
        "secret\s*[:=]\s*['\"][0-9a-zA-Z]{32,}['\"]"
        
        # Private keys
        "-----BEGIN.*PRIVATE KEY-----"
        
        # Connection strings with passwords
        "postgres://[^:]+:[^@]+@"
        "mysql://[^:]+:[^@]+@"
        "mongodb://[^:]+:[^@]+@"
        "redis://[^:]+:[^@]+@"
    )
    
    while IFS= read -r file; do
        for pattern in "${critical_patterns[@]}"; do
            if grep -E "$pattern" "$file" 2>/dev/null | grep -v "example" | grep -v "dummy" | grep -v "test"; then
                echo -e "${RED}❌ CRITICAL: Found secret in $file${NC}"
                echo -e "${RED}   Pattern: $pattern${NC}"
                found_secrets=1
            fi
        done
        
        # Check for generic password patterns
        if grep -E "password\s*[:=]\s*['\"][^'\"]{8,}['\"]" "$file" 2>/dev/null | grep -v "process.env" | grep -v "import.meta.env" | grep -v "example" | grep -v "dummy"; then
            echo -e "${YELLOW}⚠️  WARNING: Possible hardcoded password in $file${NC}"
            found_secrets=1
        fi
    done <<< "$files"
    
    return $found_secrets
}

# Get list of staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx|json|env|yml|yaml|sh|sql)$' || true)

if [ -n "$staged_files" ]; then
    if check_secrets "$staged_files"; then
        echo -e "${RED}"
        echo "========================================="
        echo "❌ SECURITY ALERT: SECRETS DETECTED!"
        echo "========================================="
        echo ""
        echo "DO NOT COMMIT! Your code contains sensitive information."
        echo ""
        echo "To fix this:"
        echo "1. Remove the secrets from your code"
        echo "2. Use environment variables instead"
        echo "3. Add sensitive files to .gitignore"
        echo "4. Run 'git add' again after fixing"
        echo ""
        echo "To bypass this check (NOT RECOMMENDED):"
        echo "git commit --no-verify"
        echo "========================================="
        echo -e "${NC}"
        exit 1
    fi
fi

# Check for .env files
env_files=$(git diff --cached --name-only | grep -E '^\.env' | grep -v '.example' || true)
if [ -n "$env_files" ]; then
    echo -e "${RED}"
    echo "========================================="
    echo "❌ ERROR: .env file detected!"
    echo "========================================="
    echo ""
    echo "Never commit .env files! They contain secrets."
    echo ""
    echo "Files detected:"
    echo "$env_files"
    echo ""
    echo "To fix:"
    echo "1. Run: git reset HEAD $env_files"
    echo "2. Add to .gitignore: echo '.env*' >> .gitignore"
    echo "3. Commit .gitignore instead"
    echo "========================================="
    echo -e "${NC}"
    exit 1
fi

# Check for large files that might contain secrets
large_files=$(git diff --cached --name-only -z | xargs -0 du -k 2>/dev/null | awk '$1 > 1000 {print $2}' || true)
if [ -n "$large_files" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Large files detected (>1MB):${NC}"
    echo "$large_files"
    echo "Large files might contain logs or data dumps with secrets."
fi

echo -e "${GREEN}✅ Pre-commit security check passed!${NC}"

# Optional: Run additional checks
echo "Running additional checks..."

# Check commit message
commit_msg=$(git log -1 --pretty=%B 2>/dev/null || true)
if echo "$commit_msg" | grep -E "api[_-]?key|password|secret|token" | grep -E "[0-9a-zA-Z]{16,}"; then
    echo -e "${YELLOW}⚠️  WARNING: Commit message might contain secrets${NC}"
fi

echo -e "${GREEN}✅ All security checks passed! Safe to commit.${NC}"
exit 0