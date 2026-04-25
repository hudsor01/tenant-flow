#!/usr/bin/env bash
# Regenerate src/types/supabase.ts from the live Supabase project.
#
# Atomic by design: writes to a tempfile, validates non-empty, then mv's.
# A bare `supabase gen types ... > src/types/supabase.ts` redirect (the
# previous form) would clobber the existing file with an empty result on
# any CLI failure (e.g. transient `Unauthorized`, missing `supabase
# login`, or no network).
#
# If the CLI fails: the tempfile is removed, src/types/supabase.ts is
# untouched, and the error message points to the MCP fallback.

set -euo pipefail

readonly PROJECT_ID="bshjmbshupiibfiewpxb"
readonly DEST="src/types/supabase.ts"

tmp=$(mktemp -t supabase-types.XXXXXX.ts)
trap 'rm -f "$tmp"' EXIT

if ! supabase gen types typescript --project-id "$PROJECT_ID" >"$tmp" 2>&1; then
  echo "db:types: supabase CLI failed. Output:" >&2
  cat "$tmp" >&2
  echo "" >&2
  echo "If the failure is 'Unauthorized', run \`supabase login\` or" >&2
  echo "regenerate via the Supabase MCP \`generate_typescript_types\`" >&2
  echo "tool. \`$DEST\` was NOT modified." >&2
  exit 1
fi

if [ ! -s "$tmp" ]; then
  echo "db:types: CLI exited 0 but produced an empty file. \`$DEST\`" >&2
  echo "was NOT modified." >&2
  exit 1
fi

mv "$tmp" "$DEST"
trap - EXIT
echo "db:types: regenerated $DEST"
