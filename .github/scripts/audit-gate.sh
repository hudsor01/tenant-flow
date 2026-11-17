#!/usr/bin/env bash
#
# The dependency audit gate. Invoked by the `checks` job in ci-cd.yml on every PR
# and by dependency-audit.yml daily, so an edit here changes both.
#
# Three things have to stay true. The measurements and the history behind them
# are in the merge commits for #1022 and #1027, not repeated here.
#
# 1. `--audit-level=high` gates the EXIT CODE, not just what gets printed. High
#    and critical fail the calling job; moderate and low are reported by the
#    first invocation and deliberately do not block, because a newly published
#    advisory on any transitive dev dependency would otherwise stop every
#    unrelated PR, and a gate people route around is worse than one that reports
#    honestly.
#
# 2. THE POSITIVE CONTROL IS LOAD-BEARING. Do not drop it as redundant.
#    `bun audit` exits 0 whenever the registry is reachable but answers 2xx
#    carrying no advisory data -- printing either "No vulnerabilities found" or
#    nothing at all -- so the exit code alone cannot tell a clean tree from an
#    audit that never ran. The control reruns this gate's own command against a
#    throwaway tree that must fail, and a clean answer there fails the job.
#    Nothing vulnerable is committed: it is written to a temp dir at run time and
#    never installed, because `bun audit` reads the lockfile, not node_modules.
#    If the pinned advisory is ever withdrawn or re-rated below high, pin a
#    different permanently-vulnerable package -- do not delete the control.
#
# 3. `set -e` is set here rather than inherited. `checks` gets it from GitHub's
#    `bash -e {0}` wrapper, but a scheduled `bash .github/scripts/audit-gate.sh`
#    does not, and the control relies on it: a failed `mktemp -d` must abort, not
#    carry on with an empty directory.
#
# 4. AN ADVISORY IS ACCEPTED ONLY WHEN IT IS FIXED IN-TREE AND NO RELEASE FIXES
#    IT. The one case today is GHSA-fc5q-39xc-vjpf (picomatch <= 4.0.7 ReDoS):
#    no fixed picomatch is published and every parent requires ^4, so the fix
#    is patches/picomatch@4.0.7.patch, pinned by
#    src/lib/__tests__/picomatch-redos-patch.test.ts. The gate passes it only
#    while that patch is declared for picomatch@4.0.7, bun.lock resolves
#    picomatch to 4.0.7 alone, and the registry's latest picomatch is still
#    4.0.7. A new picomatch release, a second resolved version, a dropped patch
#    or an unreachable registry each turns the gate red. The full report above
#    the gate still lists the advisory.
#
set -euo pipefail

CANARY_PKG='minimist'
CANARY_RANGE='0.0.8'
CANARY_ADVISORY='GHSA-xvch-5gv4-984h' # critical: prototype pollution, minimist <0.2.4

echo "--- positive control: this gate must catch ${CANARY_PKG}@${CANARY_RANGE} ---"
canary_dir="$(mktemp -d)"
trap 'rm -rf "$canary_dir"' EXIT
printf '{"name":"audit-gate-positive-control","version":"0.0.0","private":true,"dependencies":{"%s":"%s"}}\n' \
  "$CANARY_PKG" "$CANARY_RANGE" > "$canary_dir/package.json"

canary_resolve=$(cd "$canary_dir" && bun install --lockfile-only --ignore-scripts 2>&1) \
  && canary_resolve_code=0 || canary_resolve_code=$?
if [ "$canary_resolve_code" -ne 0 ]; then
  printf '%s\n' "$canary_resolve"
  echo "::error::could not resolve the audit gate's positive control (${CANARY_PKG}@${CANARY_RANGE}, exit ${canary_resolve_code}). Without it this job cannot tell a clean dependency tree from an audit that never ran, so it fails instead of passing."
  exit 1
fi

canary_out=$(cd "$canary_dir" && bun audit --audit-level=high 2>&1) && canary_code=0 || canary_code=$?
printf '%s\n' "$canary_out"
# Keep both greps pipeline-free. With pipefail set, `grep -q` exits on its first
# match and can SIGPIPE the writer, so `printf | grep -q` reports 141 even when
# the pattern matched -- failing the job for the wrong reason.
if [ "$canary_code" -eq 0 ] || ! grep -qF "$CANARY_ADVISORY" <<<"$canary_out"; then
  echo "::error::THE AUDIT GATE IS INOPERATIVE -- not clean. \`bun audit --audit-level=high\` exited ${canary_code} without reporting ${CANARY_ADVISORY} against ${CANARY_PKG}@${CANARY_RANGE}, which carries it. bun exits 0 whenever the registry answers 2xx with no advisory data, so the real tree's result below would be meaningless. Failing the job. Usually this means the advisory feed is down and failing is correct; if ${CANARY_ADVISORY} was withdrawn or re-rated below high, pin a different permanently-vulnerable package as the control."
  exit 1
fi
echo "positive control passed: the gate is live and catches ${CANARY_ADVISORY}"

echo "--- full report (moderate and low are informational) ---"
bun audit || true
echo "--- gate: high and critical ---"
ignore_args=()
picomatch_patch='patches/picomatch@4.0.7.patch'
picomatch_locked=$(grep -oE '"picomatch@[0-9][^"]*"' bun.lock | sort -u) || picomatch_locked=''
# A herestring, not `curl | grep | head`: under pipefail an early-exiting reader
# can SIGPIPE the writer and report failure on a match.
registry_answer=$(curl -fsS --max-time 20 https://registry.npmjs.org/picomatch/latest) || registry_answer=''
picomatch_latest=$(grep -m 1 -oE '"version":"[^"]*"' <<<"$registry_answer") || picomatch_latest=''
if grep -qF "\"picomatch@4.0.7\": \"${picomatch_patch}\"" package.json \
  && [ -f "$picomatch_patch" ] \
  && grep -qF 'GHSA-fc5q-39xc-vjpf' "$picomatch_patch" \
  && [ "$picomatch_locked" = '"picomatch@4.0.7"' ] \
  && [ "$picomatch_latest" = '"version":"4.0.7"' ]; then
  ignore_args+=(--ignore=GHSA-fc5q-39xc-vjpf)
  echo "accepted GHSA-fc5q-39xc-vjpf: no fixed picomatch is published and ${picomatch_patch} fixes 4.0.7 in-tree"
else
  echo "GHSA-fc5q-39xc-vjpf is gated normally (locked: ${picomatch_locked:-none}; registry latest: ${picomatch_latest:-unreachable})"
fi
# ${arr[@]+...}: bash 3.2 (macOS) treats an empty "${arr[@]}" as unbound under set -u.
out=$(bun audit --audit-level=high ${ignore_args[@]+"${ignore_args[@]}"} 2>&1) && code=0 || code=$?
printf '%s\n' "$out"
if [ "$code" -ne 0 ]; then
  if grep -qiE 'vulnerabilit' <<<"$out"; then
    echo "::error::high or critical advisories are present (listed above). Fix by bumping the direct dependency that pulls the vulnerable package -- it keeps the dependency graph honest. Reach for an \`overrides\` entry only when no release of the dependent declares a patched range, and then bound it (\`^x.y.z\`, never a bare \`>=\`) so it cannot silently cross a major."
  else
    echo "::error::bun audit did not complete (exit ${code}); treating that as a failure rather than a pass, because an audit that did not run proves nothing."
  fi
  exit 1
fi
echo "no high or critical advisories"
