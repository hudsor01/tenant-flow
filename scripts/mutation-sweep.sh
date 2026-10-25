#!/usr/bin/env bash
# Prove every decision point in this repo's CI assertions has a control that
# fails when the decision is wrong.
#
#   bash scripts/mutation-sweep.sh
#
# WHY THIS EXISTS, AND WHY IT IS COMMITTED. Two review passes over the gates in
# scripts/ each returned the same CLASS of defect: an assertion or a control
# that did not bind to what it claimed. Reviewing a third time would sample the
# class again; this enumerates it. Each row below breaks one branch and requires
# the suite to go red. A row reported VACUOUS is a branch nothing tests.
#
# It is in the repo rather than in a scratch directory because the earlier
# version of this was a shell script nobody else could run, which made
# "the mutations are each caught" a claim with nothing behind it -- the exact
# shape of defect it was written to find. (The workflow-contract mutations have
# since become ordinary committed tests, in scripts/workflow-contract.test.ts,
# because that module takes a directory and its fixtures need no mutation of
# tracked files. These cannot: they change module logic.)
#
# SAFETY. Refuses to run on a dirty tree, restores every file from a byte-exact
# backup through an EXIT trap, and verifies the restore before reporting. It
# never calls `git checkout` -- an earlier version did, over a whole directory,
# and silently discarded uncommitted work.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 9

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "refusing to run: the working tree has uncommitted changes, and this"
  echo "script edits tracked files. Commit or stash first."
  exit 2
fi

REPLAY=scripts/migration-replay-assertions.ts
PLATFORM=scripts/platform-config-assertions.ts
CONTRACT=scripts/workflow-contract.ts

BACKUP=$(mktemp -d)
for f in "$REPLAY" "$PLATFORM" "$CONTRACT"; do cp "$f" "$BACKUP/$(basename "$f")"; done
restore() { for f in "$REPLAY" "$PLATFORM" "$CONTRACT"; do cp "$BACKUP/$(basename "$f")" "$f"; done; }
trap 'restore; rm -rf "$BACKUP"' EXIT

caught=0; vacuous=0; unapplied=0

# $1 file, $2 needle, $3 replacement, $4 label
mutate() {
  local file=$1 needle=$2 replacement=$3 label=$4
  if ! NEEDLE="$needle" REPLACEMENT="$replacement" FILE="$file" python3 - <<'PY'
import os, pathlib, sys
p = pathlib.Path(os.environ["FILE"])
s = p.read_text()
needle = os.environ["NEEDLE"]
if needle not in s:
    sys.exit(3)
p.write_text(s.replace(needle, os.environ["REPLACEMENT"], 1))
PY
  then
    printf 'NOT APPLIED  %s\n' "$label"
    unapplied=$((unapplied + 1))
    restore
    return
  fi
  CI=true bun run test:unit -- scripts src/lib/__tests__ > /tmp/mutation-sweep.log 2>&1
  if [ $? -eq 0 ]; then
    printf 'VACUOUS      %s\n' "$label"
    vacuous=$((vacuous + 1))
  else
    printf 'caught       %s\n' "$label"
    caught=$((caught + 1))
  fi
  restore
}

echo "=== baseline ==="
CI=true bun run test:unit -- scripts src/lib/__tests__ > /tmp/mutation-sweep.log 2>&1
if [ $? -ne 0 ]; then echo "baseline is RED; fix that before sweeping"; exit 1; fi
grep -oE 'Tests  [0-9]+ passed' /tmp/mutation-sweep.log
echo

echo "=== migration-replay assertions ==="
mutate "$REPLAY" 'return /^\d+$/.test(trimmed) ? Number(trimmed) : null;' \
                 'return /^\d*$/.test(trimmed) ? Number(trimmed) : null;' \
                 'parseCount accepts an empty string'
mutate "$REPLAY" 'if (expected === 0) {' 'if (expected === -1) {' \
                 'the zero-migration-files vacuity guard is removed'
mutate "$REPLAY" 'if (expected !== applied) {' 'if (false) {' \
                 'applied-vs-expected comparison always passes'
mutate "$REPLAY" 'if (wrappers !== 1) {' 'if (false) {' \
                 'the wrappers-present check always passes'
mutate "$REPLAY" 'if (server !== 0 || tables !== 0) {' 'if (false) {' \
                 'the Stripe-server/foreign-table check always passes'
mutate "$REPLAY" 'if (received.length === 0) {' 'if (false) {' \
                 'the no-rows guard is removed'
mutate "$REPLAY" 'if ([...widened].sort().join("\n") === expected.join("\n")) {' \
                 'if (false) {' \
                 'the t/f boolean diagnosis is removed'
mutate "$REPLAY" 'const duplicated = [' 'const duplicated: string[] = []; const unusedDuplicated = [' \
                 'duplicate-row detection is removed'

echo
echo "=== platform-config assertions ==="
mutate "$PLATFORM" 'if (missing.length === 0 && unexpected.length === 0) {' 'if (true) {' \
                   'required-check drift always passes'
mutate "$PLATFORM" 'const unexpected = contexts.filter((name) => !expected.includes(name));' \
                   'const unexpected: string[] = [];' \
                   'an undocumented required check is ignored'
mutate "$PLATFORM" 'if (level !== documentedEnforcement) {' 'if (false) {' \
                   'enforcement-level drift is ignored'
mutate "$PLATFORM" 'if (force || deletion) {' 'if (false) {' \
                   'force-push and deletion being allowed is ignored'
mutate "$PLATFORM" 'if (typeof force !== "boolean" || typeof deletion !== "boolean") {' \
                   'if (false) {' \
                   'an unreadable protection response is treated as readable'
mutate "$PLATFORM" 'if (linked.length === 0) {' 'if (true) {' \
                   'a Supabase branch bound to a git branch is ignored'
mutate "$PLATFORM" 'if (branches.length === 0) {' 'if (false) {' \
                   'an empty Supabase branch list passes'
mutate "$PLATFORM" 'if (commitsExamined === 0) {' 'if (false) {' \
                   'examining zero commits passes'
mutate "$PLATFORM" 'if (options.truncated === true) {' 'if (false) {' \
                   'a truncated page is treated as complete'
mutate "$PLATFORM" 'if (Number.isNaN(floor)) {' 'if (false) {' \
                   'an unparseable window bound is not reported'
mutate "$PLATFORM" '(run) => run.conclusion !== null && run.conclusion !== "skipped",' \
                   '(run) => run.conclusion !== "skipped",' \
                   'an in-progress Supabase run counts as having acted'
mutate "$PLATFORM" 'return Number.isNaN(completed) ? true : completed >= floor;' \
                   'return true;' \
                   'the pre-fix era is no longer excluded'
mutate "$PLATFORM" 'if (fromSupabase.length === 0) {' 'if (false) {' \
                   'no Supabase run at all is reported as a pass'
mutate "$PLATFORM" '(pattern) => !Object.hasOwn(documented, pattern),' \
                   '(pattern) => !(pattern in documented),' \
                   'a prototype-keyed deploy rule is treated as documented'
mutate "$PLATFORM" 'if (enabled[pattern] !== value) {' 'if (false) {' \
                   'a wrong deploymentEnabled value is ignored'
mutate "$PLATFORM" 'if (extra.length > 0) {' 'if (false) {' \
                   'an extra deploymentEnabled pattern is ignored'
mutate "$PLATFORM" 'VERCEL_CONTEXT.test(status.context) && status.state === "success",' \
                   'VERCEL_CONTEXT.test(status.context),' \
                   'a failed production build counts as main deploying'
mutate "$PLATFORM" 'const previews = state.pullRequestHeads.filter(built);' \
                   'const previews = state.pullRequestHeads.filter(deployed).filter(() => false);' \
                   'preview deployments on PR heads are ignored'
mutate "$PLATFORM" 'if (state.mainCommits.length === 0) {' 'if (false) {' \
                   'examining zero main commits passes'

echo
echo "=== workflow contract ==="
mutate "$CONTRACT" 'if (left === null || right === null) return false;' \
                   'if (left === null || right === null) return true;' \
                   'two absent path lists compare equal'
mutate "$CONTRACT" 'if (trigger === null) problems.push(`${label} trigger is absent entirely`);' \
                   'if (false) problems.push(`${label} trigger is absent entirely`);' \
                   'an absent push trigger is not reported'
mutate "$CONTRACT" 'typeof job?.name === "string" ? job.name : key,' 'key,' \
                   'job names are read as keys, which branch protection does not match'
mutate "$CONTRACT" '.filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))' \
                   '.filter((file) => file.endsWith(".yml"))' \
                   '.yaml workflows are invisible'
mutate "$CONTRACT" 'if (Array.isArray(on)) {' 'if (false) {' \
                   'the list form of on: is not understood'
mutate "$CONTRACT" 'if (typeof on === "string") return { [on]: null };' \
                   'if (false) return {};' \
                   'the scalar form of on: is not understood'
mutate "$CONTRACT" 'if (workflows.length === 0) {' 'if (false) {' \
                   'an empty workflow directory passes'
mutate "$CONTRACT" 'if (sortedReal.join("\n") !== sortedCompanion.join("\n")) {' 'if (false) {' \
                   'the companion job-name equality is dropped'

echo
echo "=== restore check ==="
restore
if git diff --quiet; then echo "tree restored byte-exact"; else echo "TREE NOT RESTORED"; git diff --stat; fi
echo
echo "caught=$caught vacuous=$vacuous not-applied=$unapplied"
[ "$vacuous" -eq 0 ] && [ "$unapplied" -eq 0 ]
