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
#      skip a secret you've already mirrored — already-set secrets are
#      annotated `[already set]` so you know which prompts can be skipped.
#   3. Re-run any time you rotate one of these secrets — the Actions and
#      Dependabot scopes do not auto-sync.
#
# Verify:
#   gh api "repos/${REPO}/dependabot/secrets" --jq '.secrets[].name'
#   (where ${REPO} defaults to hudsor01/tenant-flow). The output should
#   list all 6 names below.
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

# Pre-flight: ensure gh CLI is authed with sufficient scope. `gh secret set
# --app dependabot` requires admin on the repo (the API endpoint is
# /repos/{owner}/{repo}/dependabot/secrets/{name}).
if ! gh auth status >/dev/null 2>&1; then
	echo "Error: gh CLI is not authenticated. Run 'gh auth login' first." >&2
	exit 1
fi

if ! gh api "repos/${REPO}" --jq '.permissions.admin' 2>/dev/null | grep -q '^true$'; then
	echo "Error: current gh auth lacks admin on ${REPO}. The dependabot/secrets endpoint requires admin." >&2
	exit 1
fi

# Fetch the names already set in the Dependabot scope so the operator
# knows which prompts can be skipped vs. which need a value.
existing="$(gh api "repos/${REPO}/dependabot/secrets" --jq '[.secrets[].name] | join(" ")' 2>/dev/null || echo '')"

is_set() {
	local name="$1"
	[[ " ${existing} " == *" ${name} "* ]]
}

echo "Mirroring ${#SECRETS[@]} Actions secrets into the Dependabot scope on ${REPO}."
echo "Press Enter on a blank line to skip a prompt."
echo

for name in "${SECRETS[@]}"; do
	suffix=""
	if is_set "${name}"; then
		suffix=" [already set]"
	fi
	read -rsp "  ${name}${suffix}: " value
	echo
	if [[ -z "${value}" ]]; then
		echo "  ↳ skipped"
		continue
	fi
	gh secret set "${name}" --app dependabot --repo "${REPO}" --body "${value}"
done

echo
echo "Done. Verify:"
echo "  gh api \"repos/${REPO}/dependabot/secrets\" --jq '.secrets[].name'"
