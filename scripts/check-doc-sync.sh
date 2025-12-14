#!/bin/bash
# Check for drift between CLAUDE.md and .github/copilot-instructions.md
# These files should maintain consistent core principles

set -e

CLAUDE_MD="CLAUDE.md"
COPILOT_MD=".github/copilot-instructions.md"

echo "🔍 Checking documentation sync between CLAUDE.md and copilot-instructions.md..."

# Check if both files exist
if [[ ! -f "$CLAUDE_MD" ]]; then
  echo "❌ Error: $CLAUDE_MD not found"
  exit 1
fi

if [[ ! -f "$COPILOT_MD" ]]; then
  echo "❌ Error: $COPILOT_MD not found"
  exit 1
fi

# Extract core principles sections from both files
# This checks for consistency in key principles, not line-by-line equality

check_principle() {
  local principle="$1"
  local file="$2"

  if grep -q "$principle" "$file"; then
    return 0
  else
    return 1
  fi
}

# Core principles that MUST be consistent between both files
PRINCIPLES=(
  "DRY"
  "KISS"
  "NO GENERIC ABSTRACTIONS"
  "YAGNI"
  "Composition Over Inheritance"
  "Explicit Data Flow"
  "Fail Fast"
  "Idempotency"
  "Single Responsibility"
)

DRIFT_DETECTED=false

for principle in "${PRINCIPLES[@]}"; do
  in_claude=$(check_principle "$principle" "$CLAUDE_MD" && echo "yes" || echo "no")
  in_copilot=$(check_principle "$principle" "$COPILOT_MD" && echo "yes" || echo "no")

  if [[ "$in_claude" != "$in_copilot" ]]; then
    echo "⚠️  Principle drift detected: '$principle'"
    echo "   CLAUDE.md: $in_claude"
    echo "   copilot-instructions.md: $in_copilot"
    DRIFT_DETECTED=true
  fi
done

# Check file sizes (shouldn't differ by more than 20%)
claude_size=$(wc -c < "$CLAUDE_MD")
copilot_size=$(wc -c < "$COPILOT_MD")

size_diff=$(echo "scale=2; ($copilot_size - $claude_size) / $claude_size * 100" | bc)
size_diff_abs=${size_diff#-}  # Remove negative sign for comparison

if (( $(echo "$size_diff_abs > 20" | bc -l) )); then
  echo "⚠️  File size drift detected: ${size_diff}% difference"
  echo "   CLAUDE.md: $claude_size bytes"
  echo "   copilot-instructions.md: $copilot_size bytes"
  DRIFT_DETECTED=true
fi

# Check last modified dates
claude_modified=$(stat -f "%Sm" -t "%Y-%m-%d" "$CLAUDE_MD" 2>/dev/null || stat -c "%y" "$CLAUDE_MD" | cut -d' ' -f1)
copilot_modified=$(stat -f "%Sm" -t "%Y-%m-%d" "$COPILOT_MD" 2>/dev/null || stat -c "%y" "$COPILOT_MD" | cut -d' ' -f1)

echo ""
echo "📅 Last modified:"
echo "   CLAUDE.md: $claude_modified"
echo "   copilot-instructions.md: $copilot_modified"

if [[ "$DRIFT_DETECTED" == true ]]; then
  echo ""
  echo "❌ Documentation drift detected!"
  echo ""
  echo "Action required:"
  echo "1. Review differences between CLAUDE.md and .github/copilot-instructions.md"
  echo "2. Ensure core principles are synchronized"
  echo "3. Update the outdated file to match the source of truth"
  echo ""
  echo "Hint: Run 'diff CLAUDE.md .github/copilot-instructions.md' to see differences"
  exit 1
fi

echo ""
echo "✅ Documentation sync check passed!"
exit 0
