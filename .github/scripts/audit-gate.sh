#!/usr/bin/env bash
#
# The dependency audit gate. Invoked by the `checks` job in ci-cd.yml on every
# PR, and by dependency-audit.yml on a daily schedule, so both run byte-identical
# checks and cannot drift apart.
#
# `set -e` is set here rather than inherited: the `checks` job got it from
# GitHub's `bash -e {0}` wrapper, but a scheduled job invoking this as
# `bash .github/scripts/audit-gate.sh` would not, and the control below relies
# on it (a failed `mktemp -d` must abort rather than carry on with an empty
# directory). Behaviour is now the same whoever calls it.
#
# NOTHING IN CI WAS CHECKING THIS. The dependency tree carried critical
# and high advisories while every required check stayed green, and
# several `overrides` floors had been overtaken by advisories published
# after they were set.
#
# `--audit-level` gates the EXIT CODE, not just what is printed: measured
# on a tree whose only advisory is low, `bun audit` exits 1 at
# --audit-level=low and 0 at moderate/high/critical. So this fails the
# calling job on high and critical only. Moderate and low are printed by the first
# invocation and do not block: a newly published advisory on any
# transitive dev dependency would otherwise stop every unrelated PR, and a
# gate people route around is worse than one that reports honestly.
#
# It fails CLOSED, and that takes TWO mechanisms, because the exit code
# alone cannot carry it. `bun audit` exits non-zero when it finds
# advisories and when it cannot REACH the registry (`ConnectionRefused:
# audit request failed`), so those two are told apart by the output and
# reported differently. But it exits ZERO whenever the registry IS
# reachable and answers 2xx carrying no advisory data. Measured
# 2026-10-24 against a tree whose only dependency has a CRITICAL
# advisory (minimist@0.0.8), behind a local registry that proxied package
# metadata upstream and intercepted only the advisory endpoint: 200 `{}`
# and 200 with an empty body both printed "No vulnerabilities found",
# 200 `{"error": ...}` printed nothing at all, and all three exited 0.
# The first two are byte-identical to what a healthy clean tree prints.
# The previous gate, run verbatim on that tree, printed "no high or
# critical advisories" and passed.
#
# So the exit code is checked, and the gate is separately proven live by
# a POSITIVE CONTROL: it reruns the gate's OWN command against a
# throwaway tree that must fail, and a clean answer there fails the job.
# Nothing vulnerable is committed -- the control is written to a temp dir
# at run time and never installed, because `bun audit` reads the
# lockfile, not node_modules.
#
# Why the error below says to bound an override instead of writing `>=`:
# a bare `>=` does not pin, it floats to whatever is newest at resolve
# time. Measured while writing this: `path-to-regexp: ">=8.4.2"` held
# 8.4.2 in the committed lockfile but re-resolved to 9.0.0 -- a major
# published less than a day earlier -- into `msw`, which declares
# `^6.3.0`. This is NOT a bun quirk; plain `npm` with default config
# (`min-release-age` unset) resolves the same 9.0.0 from the same
# manifest. So the lockfile is the only thing standing between a bare
# `>=` and a brand-new major, and any command that re-resolves gives it
# up. Floors belong in a bounded range, and the audit in this script is
# what catches the regression a speculative floor was supposed to prevent.
#
# Reproducing that locally: if your shell has safe-chain installed, `bun`
# and `npm` are both wrapper SHELL FUNCTIONS that delegate to the same
# `safe-chain` binary, and it suppresses versions below a minimum publish
# age -- so either one can give you 8.4.2 and make the measurement above
# look wrong. Do not read the suppression as a property of one package
# manager: with an empty cache on 2026-10-23 both wrappers returned 8.4.2
# while both real binaries returned 9.0.0. Call the binary by absolute
# path, or pass `--safe-chain-skip-minimum-package-age`, to see what this
# job sees. CI has no safe-chain, which is the whole point: the runner
# resolves what the real binary resolves, whatever your shell shows you.

set -euo pipefail

CANARY_PKG='minimist'
CANARY_RANGE='0.0.8'
CANARY_ADVISORY='GHSA-xvch-5gv4-984h' # critical: prototype pollution, minimist <0.2.4

echo "--- positive control: this gate must catch ${CANARY_PKG}@${CANARY_RANGE} ---"
canary_dir="$(mktemp -d)"
trap 'rm -rf "$canary_dir"' EXIT
printf '{"name":"audit-gate-positive-control","version":"0.0.0","private":true,"dependencies":{"%s":"%s"}}\n' \
  "$CANARY_PKG" "$CANARY_RANGE" > "$canary_dir/package.json"

# `bun audit` reads the lockfile, so the control never has to be installed.
canary_resolve=$(cd "$canary_dir" && bun install --lockfile-only --ignore-scripts 2>&1) \
  && canary_resolve_code=0 || canary_resolve_code=$?
if [ "$canary_resolve_code" -ne 0 ]; then
  printf '%s\n' "$canary_resolve"
  echo "::error::could not resolve the audit gate's positive control (${CANARY_PKG}@${CANARY_RANGE}, exit ${canary_resolve_code}). Without it this job cannot tell a clean dependency tree from an audit that never ran, so it fails instead of passing."
  exit 1
fi

canary_out=$(cd "$canary_dir" && bun audit --audit-level=high 2>&1) && canary_code=0 || canary_code=$?
printf '%s\n' "$canary_out"
# Herestring, not `printf | grep`: with pipefail set, grep -q exiting early
# can SIGPIPE the writer and the pipeline reports 141 even on a match, which
# would fail this job for the wrong reason. Measured: 141 at a 300KB payload,
# 0 at the ~400 bytes this actually produces.
if [ "$canary_code" -eq 0 ] || ! grep -qF "$CANARY_ADVISORY" <<<"$canary_out"; then
  echo "::error::THE AUDIT GATE IS INOPERATIVE -- not clean. \`bun audit --audit-level=high\` exited ${canary_code} without reporting ${CANARY_ADVISORY} against ${CANARY_PKG}@${CANARY_RANGE}, which carries it. bun exits 0 whenever the registry answers 2xx with no advisory data, so the real tree's result below would be meaningless. Failing the job. Usually this means the advisory feed is down and failing is correct; if ${CANARY_ADVISORY} was withdrawn or re-rated below high, pin a different permanently-vulnerable package as the control."
  exit 1
fi
echo "positive control passed: the gate is live and catches ${CANARY_ADVISORY}"

echo "--- full report (moderate and low are informational) ---"
bun audit || true
echo "--- gate: high and critical ---"
out=$(bun audit --audit-level=high 2>&1) && code=0 || code=$?
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
