#!/usr/bin/env bash
# scripts/ci/print-env.sh
# Diagnostic helper used in CI debug runs.
# Prints PATH, node/npm versions, git remote, current HEAD, and whether tenant-flow CLI is available.

set -euo pipefail

echo "=== CI ENV DIAGNOSTICS ==="
echo "Date: $(date --iso-8601=seconds 2>/dev/null || date)"
echo "User: $(whoami 2>/dev/null || echo unknown)"
echo "PWD: $(pwd)"
echo
echo "---- PATH ----"
echo "$PATH" | tr ':' '\n' || true
echo
echo "---- Node / NPM ----"
node -v 2>/dev/null || echo "node: not found"
npm -v 2>/dev/null || echo "npm: not found"
echo
echo "---- Git remotes ----"
git remote -v 2>/dev/null || echo "no git remotes"
echo
echo "---- Git fetch & HEAD ----"
git fetch --all --prune 2>/dev/null || echo "git fetch failed"
git show -s --format=%H 2>/dev/null || echo "no HEAD"
echo
echo "---- tenant-flow CLI availability ----"
if command -v tenant-flow >/dev/null 2>&1; then
  echo "tenant-flow: available at $(command -v tenant-flow)"
else
  echo "tenant-flow: not found in PATH"
fi
echo
echo "---- Node / NPM env vars ----"
echo "NODE_VERSION: ${NODE_VERSION:-<not set>}"
echo "NPM_CONFIG_PREFIX: ${NPM_CONFIG_PREFIX:-<not set>}"
echo "CI_DEBUG: ${CI_DEBUG:-<not set>}"
echo
echo "=== END CI ENV DIAGNOSTICS ==="
