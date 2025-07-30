#!/bin/bash

# RLS Policies Test Script Wrapper
# Wrapper that calls the main RLS test script from the root directory

# Skip in CI environment
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$RUNNER_OS" ]; then
    echo "🚧 Running in CI environment - skipping RLS database tests"
    echo "✅ RLS tests skipped in CI (database connection not available)"
    exit 0
fi

# In non-CI environments, delegate to the main script
SCRIPT_DIR="$(dirname "$0")"
MAIN_SCRIPT="$SCRIPT_DIR/../../../scripts/test-rls-policies.sh"

if [ -f "$MAIN_SCRIPT" ]; then
    cd "$SCRIPT_DIR/../../.." || exit 1
    exec bash "$MAIN_SCRIPT"
else
    echo "Error: Main RLS test script not found at $MAIN_SCRIPT"
    exit 1
fi