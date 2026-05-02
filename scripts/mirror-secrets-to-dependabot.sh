#!/usr/bin/env bash
# Mirror Actions-scope secrets into the Dependabot scope so Dependabot PRs
# can pass the e2e-smoke + rls-security required CI checks.
#
# Why this exists:
#   GitHub Actions secrets and Dependabot secrets live in separate scopes.
#   Dependabot-triggered workflows only see secrets explicitly set under
#   the Dependabot scope; the Actions scope is invisible to them. Without
#   this mirror, every Dependabot PR fails the secret-precheck in
#   .github/workflows/ci-cd.yml and never satisfies branch protection.
#
# How to run:
#   1. `gh auth status` to confirm you're logged in with admin on the repo
#   2. Run this script and paste each secret value when prompted (values
#      are read silently, never echoed). Press Enter on a blank line to
#      skip a secret you've already mirrored.
#   3. Re-run any time you rotate one of these secrets — the Actions and
#      Dependabot scopes do not auto-sync.
#
# Verify:
#   gh api repos/hudsor01/tenant-flow/dependabot/secrets --jq '.secrets[].name'
#   should list all 6 names below.
set -euo pipefail

REPO="${REPO:-hudsor01/tenant-flow}"

SECRETS=(
	E2E_OWNER_EMAIL
	E2E_OWNER_PASSWORD
	E2E_OWNER_B_EMAIL
	E2E_OWNER_B_PASSWORD
	NEXT_PUBLIC_SUPABASE_URL
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

echo "Mirroring ${#SECRETS[@]} Actions secrets into the Dependabot scope on ${REPO}."
echo "Leave any prompt blank to skip that secret."
echo

for name in "${SECRETS[@]}"; do
	read -rsp "  ${name}: " value
	echo
	if [[ -z "${value}" ]]; then
		echo "  ↳ skipped"
		continue
	fi
	gh secret set "${name}" --app dependabot --repo "${REPO}" --body "${value}"
done

echo
echo "Done. Verify:"
echo "  gh api repos/${REPO}/dependabot/secrets --jq '.secrets[].name'"
