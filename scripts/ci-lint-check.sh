#!/bin/bash
# CI Lint Check - mimics what CI runs to catch issues locally

echo "Running CI lint check (mimics GitHub Actions)"
echo "=============================================="

# Get changed TypeScript/JavaScript files (compared to HEAD~1 like CI does)
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)' | head -20 || true)

# If no commits to compare, check staged/modified files
if [ -z "$CHANGED_FILES" ]; then
  echo "No commits to compare, checking staged and modified files..."
  CHANGED_FILES=$(git diff --name-only --cached | grep -E '\.(ts|tsx|js|jsx)' | head -20 || true)
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only | grep -E '\.(ts|tsx|js|jsx)' | head -20 || true)
  fi
fi

if [[ -n "$CHANGED_FILES" ]]; then
  LINT_FILES=""
  for FILE in $CHANGED_FILES; do
    # Only lint files that actually exist and aren't test artifacts
    if [ -f "$FILE" ] && [[ "$FILE" != *"/test.js" ]] && [[ "$FILE" != *"/test.ts" ]]; then
      LINT_FILES="$LINT_FILES $FILE"
    fi
  done

  if [[ -n "$LINT_FILES" ]]; then
    echo "Linting changed files: $LINT_FILES"
    echo ""
    npx eslint $LINT_FILES --max-warnings 5 --no-warn-ignored || {
      echo ""
      echo "WARNING: Linting found issues - CI will fail!"
      echo "Fix these issues before pushing."
      exit 1
    }
    echo "SUCCESS: All lint checks passed!"
  else
    echo "No existing files to lint."
  fi
else
  echo "No TypeScript/JavaScript files changed"
fi