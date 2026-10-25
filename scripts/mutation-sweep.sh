#!/usr/bin/env bash
# Break each of this script's listed decision points in this repo's CI
# assertions and require a control to fail for it.
#
# It is NOT a claim of total branch coverage: the rows below are enumerated by
# hand, and a branch with no row here can still be uncovered. Review found
# exactly that -- the liveness clock's newest-commit comparison had no row and
# no mixed-timestamp fixture, so reading the OLDEST commit instead left the
# whole suite green. Adding a row is the fix for a gap like that; the rows are
# the record of which gaps have been closed.
#
#   bash scripts/mutation-sweep.sh
#
# WHY THIS EXISTS, AND WHY IT IS COMMITTED. Two review passes over the gates in
# scripts/ each returned the same CLASS of defect: an assertion or a control
# that did not bind to what it claimed. Reviewing a third time would sample the
# class again; this enumerates it. Each row below breaks one branch and requires
# the suite to go red. A row reported VACUOUS is a branch nothing tests.
#
# WHAT IT STILL DOES NOT REACH: the fetching in
# scripts/verify-platform-config.ts. Its summary arithmetic was extracted into
# `summarizeResults` precisely so it could be covered by a unit test instead;
# what remains there is HTTP, which has no control short of a live run (the
# `config-drift` job is that run, on every PR touching these files and daily).
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
RESULT=scripts/assertion-result.ts
REPLAY_CLI=scripts/assert-migration-replay.ts

BACKUP=$(mktemp -d)
LOG=$(mktemp)
FILES=("$REPLAY" "$PLATFORM" "$CONTRACT" "$RESULT" "$REPLAY_CLI")
for f in "${FILES[@]}"; do cp "$f" "$BACKUP/$(basename "$f")"; done
restore() { for f in "${FILES[@]}"; do cp "$BACKUP/$(basename "$f")" "$f"; done; }
trap 'restore; rm -rf "$BACKUP" "$LOG"' EXIT

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
  CI=true bun run test:unit -- scripts src/lib/__tests__ > "$LOG" 2>&1
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
CI=true bun run test:unit -- scripts src/lib/__tests__ > "$LOG" 2>&1
if [ $? -ne 0 ]; then echo "baseline is RED; fix that before sweeping"; exit 1; fi
grep -oE 'Tests  [0-9]+ passed' "$LOG"
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
mutate "$PLATFORM" 'if (newest === undefined) {' 'if (false) {' \
                   'examining zero main commits passes'
mutate "$PLATFORM" 'const newest = state.mainCommits[0];' \
                   'const newest = state.mainCommits[state.mainCommits.length - 1];' \
                   'the liveness half reads the LAST element, i.e. the oldest commit'
mutate "$PLATFORM" 'const newest = state.mainCommits[0];' \
                   'const newest = state.mainCommits[1] ?? state.mainCommits[0];' \
                   'the liveness half reads one commit past the tip'
mutate "$PLATFORM" 'if (!deployed(newest)) {' 'if (false) {' \
                   'a tip that never deployed is reported as deploying'
mutate "$PLATFORM" 'const settled = state.now.getTime() - landed > graceMs;' \
                   'const settled = false;' \
                   'the reporting grace never expires, so a stopped deploy only warns'
mutate "$PLATFORM" 'if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(revokedAtRaw.trim())) {' 'if (false) {' \
                   'a zoneless window bound is accepted'
mutate "$PLATFORM" 'if (branch.protected !== true || branch.protection?.enabled !== true) {' \
                   'if (false) {' \
                   'an unprotected main passes'
mutate "$PLATFORM" 'if (!contexts) {' 'if (false) {' \
                   'protection requiring no checks at all passes'
mutate "$PLATFORM" 'if (inWindow.length === 0) {' 'if (false) {' \
                   'an all-stale Supabase window is reported as a pass'
mutate "$PLATFORM" 'if (pending.length === inWindow.length) {' 'if (false) {' \
                   'an all-pending Supabase window is reported as a pass'
mutate "$PLATFORM" 'if (typeof enabled === "boolean") {' 'if (false) {' \
                   'the blanket boolean deploymentEnabled form is accepted'

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
echo "=== the verdict layer: annotations, reporting, tallying, exit codes ==="
# NOT COVERED BY THE ROWS ABOVE, and review proved what that cost: deleting the
# %0A escaping passed lint, typecheck, the whole suite, a clean sweep and both
# gates, because a GREEN gate never calls an annotation helper. Changing
# `process.exit(1)` to 0 in the replay CLI made the gate report green on a
# 246-of-348 replay with the sweep still clean.
mutate "$RESULT" 'return `::error::${message.replaceAll("\n", "%0A")}`;' \
                 'return `::error::${message}`;' \
                 'the error annotation stops escaping newlines'
mutate "$RESULT" 'return `::warning::${message.replaceAll("\n", "%0A")}`;' \
                 'return `::warning::${message}`;' \
                 'the warning annotation stops escaping newlines'
mutate "$RESULT" 'if (!result.ok) {' 'if (false) {' \
                 'reportResult stops treating a failure as a failure'
mutate "$RESULT" 'if (result.unverified === true) {' 'if (false) {' \
                 'reportResult prints an unverified result as a pass'
mutate "$RESULT" 'checked: results.length - unverified,' 'checked: results.length,' \
                 'the tally counts an unverified result among the checked'
mutate "$RESULT" 'exitCode: failed === 0 ? 0 : 1,' 'exitCode: 0,' \
                 'the tally always implies exit 0'
mutate "$REPLAY_CLI" 'console.log(errorAnnotation(result.message));
		console.log(result.message);
		process.exit(1);' \
                     'console.log(errorAnnotation(result.message));
		console.log(result.message);
		process.exit(0);' \
                     'the replay CLI exits 0 on a failed assertion'
mutate "$REPLAY_CLI" 'process.exit(2);' 'process.exit(0);' \
                     'the replay CLI exits 0 on misuse'

echo
echo "=== restore check ==="
restore
if git diff --quiet; then echo "tree restored byte-exact"; else echo "TREE NOT RESTORED"; git diff --stat; fi
echo
echo "caught=$caught vacuous=$vacuous not-applied=$unapplied"
[ "$vacuous" -eq 0 ] && [ "$unapplied" -eq 0 ]
