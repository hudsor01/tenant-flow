#!/bin/bash

echo "# Complete Dependency Audit - TenantFlow Monorepo"
echo ""
echo "Generated: $(date)"
echo ""

packages=(
  "."
  "apps/frontend"
  "apps/backend"
  "apps/e2e-tests"
  "packages/api-client"
  "packages/config"
  "packages/database"
  "packages/eslint-config"
  "packages/shared"
  "packages/testing"
  "packages/typescript-config"
)

for pkg in "${packages[@]}"; do
  echo "========================================="
  echo "Package: $pkg"
  echo "========================================="

  if [ -f "$pkg/package.json" ]; then
    result=$(npx depcheck "$pkg" --json 2>/dev/null)

    unused_deps=$(echo "$result" | python3 -c "import sys, json; data=json.load(sys.stdin); print(','.join(data.get('dependencies', [])))" 2>/dev/null)
    unused_dev=$(echo "$result" | python3 -c "import sys, json; data=json.load(sys.stdin); print(','.join(data.get('devDependencies', [])))" 2>/dev/null)

    echo "Unused dependencies: ${unused_deps:-NONE}"
    echo "Unused devDependencies: ${unused_dev:-NONE}"
    echo ""
  else
    echo "No package.json found"
    echo ""
  fi
done

echo "========================================="
echo "Audit Complete"
echo "========================================="
