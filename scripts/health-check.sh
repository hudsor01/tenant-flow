#!/usr/bin/env bash
# Project health check - uses installed CLI tools for comprehensive analysis
set -euo pipefail

echo "=== TenantFlow Health Check ==="
echo ""

# Code stats
echo "--- Code Statistics (tokei) ---"
tokei --sort lines -e node_modules -e .next -e dist -e .turbo -e .serena -c 80 2>/dev/null | head -20
echo ""

# Disk usage
echo "--- Disk Usage (dust) ---"
dust -n 8 -d 2 . 2>/dev/null
echo ""

# Dependency vulnerabilities
echo "--- Vulnerability Scan (trivy) ---"
trivy fs --severity HIGH,CRITICAL --scanners vuln --quiet . 2>/dev/null
echo ""

# Secret detection
echo "--- Secret Scan (gitleaks) ---"
gitleaks detect --source . --no-git --no-banner --quiet \
  --config <(cat <<'EOF'
[extend]
useDefault = true
[allowlist]
paths = ['\.serena/', 'node_modules/', '\.next/', 'dist/', '\.turbo/', 'pnpm-lock\.yaml', '\.pkl$', '\.map$']
EOF
) 2>/dev/null && echo "No secrets found" || echo "WARNING: Potential secrets detected - run 'secrets' for details"
echo ""

# Typo check
echo "--- Typo Check (typos) ---"
typos --format brief . 2>/dev/null && echo "No typos found" || true
echo ""

# Git stats
echo "--- Git Summary ---"
echo "Branch: $(git branch --show-current)"
echo "Uncommitted: $(git status --porcelain | wc -l | tr -d ' ') files"
echo "Ahead/behind: $(git rev-list --left-right --count HEAD...origin/main 2>/dev/null || echo 'N/A')"
echo ""

echo "=== Health Check Complete ==="
