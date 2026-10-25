/**
 * Assertions over configuration that lives on other people's platforms.
 *
 * WHY THIS EXISTS. CLAUDE.md states that migrations are "applied by hand" and
 * "never on merge". Supabase's GitHub integration was configured to do the
 * opposite: "Deploy to production" was ON, bound to `main`, and would have
 * applied this repo's migrations on every merge. The only thing that stopped it
 * was that the branch sat in MIGRATIONS_FAILED. Nothing in the repo could tell
 * -- the setting is a toggle in somebody's dashboard, and the documentation
 * that contradicted it is just prose. Three such invariants are written down in
 * this repo and none of them was checkable.
 *
 * The functions here are pure: they take state somebody else fetched and say
 * whether it still matches what the repo claims.
 * `platform-config-assertions.test.ts` fails each one on purpose, and
 * `scripts/verify-platform-config.ts` does the fetching.
 *
 * Every invariant below is verified from a signal that is OBSERVABLE WITHOUT
 * NEW CREDENTIALS, deliberately. Supabase's own Management API would answer the
 * branching question directly, but a Supabase personal access token is
 * account-wide and unscopable -- handing CI a token that can delete every
 * project in the account in order to read one boolean is a worse trade than the
 * indirect signal. The indirect signal is the integration's own check run,
 * which is what the setting actually DOES.
 */
import type { AssertionResult } from "./assertion-result";

/**
 * The required status checks on `main`, as branch protection should list them.
 *
 * `checks` and `e2e-smoke` are reported either by ci-cd.yml or by its doc-only
 * companion; `rls-security` comes from rls-security-tests.yml, which carries no
 * path filter precisely so that it reports on every PR.
 * `src/lib/__tests__/workflow-required-checks.test.ts` guards that arrangement
 * offline from this same list.
 */
export const REQUIRED_CHECK_CONTEXTS: readonly string[] = [
	"checks",
	"e2e-smoke",
	"rls-security",
];

/** How Vercel names itself in a commit status context. */
const VERCEL_CONTEXT = /^vercel/i;

/** The GitHub App slug the Supabase integration posts its check runs under. */
const SUPABASE_APP_SLUG = "supabase";

/**
 * The documented admin-enforcement level on `main`.
 *
 * `non_admins` is how the classic API spells `enforce_admins: false`. Asserted
 * rather than merely logged, in both directions: this gate exists because
 * configuration diverged from documentation unnoticed, and a TIGHTENING that
 * nobody wrote down is still a divergence. If it fires because the setting was
 * deliberately changed, change this constant in the same commit.
 */
export const DOCUMENTED_ADMIN_ENFORCEMENT = "non_admins";

/**
 * `GET /repos/{owner}/{repo}/branches/{branch}` -- the parts of it this reads.
 *
 * This endpoint, NOT `/branches/{branch}/protection`, is what carries the
 * required-check list for a token that is only allowed to read the repository.
 * The full protection endpoint needs repository-admin rights, and the workflow
 * `permissions:` block has no `administration` key to grant (17 keys, checked
 * against the workflow-syntax reference on 2026-10-25), so GITHUB_TOKEN cannot
 * read it however it is configured.
 */
export interface BranchSummary {
	readonly protected?: boolean;
	readonly protection?: {
		readonly enabled?: boolean;
		readonly required_status_checks?: {
			readonly contexts?: readonly string[] | null;
			readonly enforcement_level?: string;
		} | null;
	} | null;
}

/**
 * `GET /repos/{owner}/{repo}/branches/{branch}/protection` -- admin-only, so in
 * CI this arrives only when a token that can read it was supplied. Everything
 * asserted from it is a secondary invariant for that reason.
 */
export interface BranchProtection {
	readonly allow_force_pushes?: { readonly enabled?: boolean } | null;
	readonly allow_deletions?: { readonly enabled?: boolean } | null;
}

export interface CommitCheckRun {
	readonly sha: string;
	/** The GitHub App slug that posted the run, e.g. "github-actions", "supabase". */
	readonly app: string;
	readonly name: string;
	/** null while the run is still in progress. */
	readonly conclusion: string | null;
}

export interface CommitStatuses {
	readonly sha: string;
	/** Commit-status context names, e.g. ["Vercel"]. */
	readonly contexts: readonly string[];
}

export interface PullRequestHead extends CommitStatuses {
	readonly number: number;
}

export interface VercelConfig {
	readonly git?: {
		readonly deploymentEnabled?: boolean | Readonly<Record<string, boolean>>;
	} | null;
}

/** Protection has to be switched on at all, at the documented strength. */
export function assertProtectionEnforced(
	branch: BranchSummary,
	documentedEnforcement: string = DOCUMENTED_ADMIN_ENFORCEMENT,
): AssertionResult {
	if (branch.protected !== true || branch.protection?.enabled !== true) {
		return {
			ok: false,
			message: `main is not a protected branch (protected=${String(branch.protected)}, enabled=${String(branch.protection?.enabled)}). Nothing is gating merges into the branch Vercel deploys to production.`,
		};
	}
	const level = branch.protection.required_status_checks?.enforcement_level;
	if (level !== documentedEnforcement) {
		return {
			ok: false,
			message: `main enforces required checks at "${String(level)}", and this repo documents "${documentedEnforcement}". If the change was deliberate, update DOCUMENTED_ADMIN_ENFORCEMENT in the same commit.`,
		};
	}
	return {
		ok: true,
		message: `main is protected and enforces required checks at "${level}"`,
	};
}

/** Branch protection must require exactly the checks the repo documents. */
export function assertRequiredChecks(
	contexts: readonly string[] | null | undefined,
	expected: readonly string[] = REQUIRED_CHECK_CONTEXTS,
): AssertionResult {
	if (!contexts) {
		return {
			ok: false,
			message:
				"main requires no status checks at all, so every gate in this repo reports without being able to block a merge.",
		};
	}
	const missing = expected.filter((name) => !contexts.includes(name));
	// Extra contexts matter as much as missing ones in the other direction: a
	// check nobody required is a check that cannot stop anything, which is the
	// state a new job starts in.
	const unexpected = contexts.filter((name) => !expected.includes(name));
	if (missing.length === 0 && unexpected.length === 0) {
		return {
			ok: true,
			message: `main requires exactly the documented checks (${[...contexts].sort().join(", ")})`,
		};
	}
	return {
		ok: false,
		message: `main's required status checks have drifted from the documented set.${missing.length > 0 ? `\nno longer required (a gate that cannot block): ${missing.join(", ")}` : ""}${unexpected.length > 0 ? `\nrequired but not documented (update REQUIRED_CHECK_CONTEXTS if deliberate): ${unexpected.join(", ")}` : ""}`,
	};
}

/**
 * Force pushes and deletions on `main` must stay blocked (GH #653).
 *
 * Secondary: this reads the admin-only protection endpoint, so in CI it runs
 * only when a token that can read it was supplied, and is reported as
 * UNVERIFIED rather than as a pass when it was not.
 */
export function assertHistoryProtected(
	protection: BranchProtection,
): AssertionResult {
	const force = protection.allow_force_pushes?.enabled;
	const deletion = protection.allow_deletions?.enabled;
	if (typeof force !== "boolean" || typeof deletion !== "boolean") {
		return {
			ok: false,
			message: `could not read main's force-push and deletion settings (got ${JSON.stringify({ force, deletion })}). The protection API answered in a shape this does not understand, so the invariant is unverified rather than satisfied.`,
		};
	}
	if (force || deletion) {
		return {
			ok: false,
			message: `main allows ${force ? "force pushes" : ""}${force && deletion ? " and " : ""}${deletion ? "deletion" : ""}. Both were blocked deliberately: the ledger of what shipped is the only record this repo has of what production was built from.`,
		};
	}
	return { ok: true, message: "main blocks force pushes and deletion" };
}

/**
 * Supabase's GitHub integration must hold no authority over production.
 *
 * The signal is the integration's own check run. With "Deploy to production"
 * ON, Supabase posts `Supabase Preview` and it RUNS -- it concluded `failure`
 * on main through 2026-10-25 06:09Z. With the production branch cleared, the
 * same check posts and concludes `skipped`, which is what every main commit
 * after 07:11Z shows. So a Supabase check run that reached any conclusion other
 * than `skipped` means the integration can apply migrations on merge again,
 * which CLAUDE.md says nothing may do.
 */
export function assertSupabaseHasNoProductionAuthority(
	commitsExamined: number,
	runs: readonly CommitCheckRun[],
): AssertionResult {
	// Zero commits is not a pass. An empty window would make the filter below
	// return nothing and report the invariant as satisfied without having looked
	// at anything.
	if (commitsExamined === 0) {
		return {
			ok: false,
			message:
				"examined no commits, so this proves nothing about the Supabase integration. The commit listing failed or returned an empty page.",
		};
	}
	const fromSupabase = runs.filter((run) => run.app === SUPABASE_APP_SLUG);
	const live = fromSupabase.filter((run) => run.conclusion !== "skipped");
	if (live.length === 0) {
		return {
			ok: true,
			message: `the Supabase integration holds no production authority (${commitsExamined} commit(s) examined, ${runs.length} check run(s), ${fromSupabase.length} of them Supabase's, all skipped or absent)`,
		};
	}
	return {
		ok: false,
		message: `the Supabase GitHub integration is acting on this repo again: ${live.map((run) => `${run.sha.slice(0, 9)} ${run.name} -> ${run.conclusion ?? "in progress"}`).join(", ")}. "Deploy to production" is back on, which means merging a migration applies it to production -- CLAUDE.md says migrations are applied by hand, never on merge. Turn it off under Project Settings -> Integrations, on the GitHub card (NOT the Branches page, whose row menu only offers "Change production branch" and "Resync branch").`,
	};
}

/**
 * `vercel.json` must actually restrict automatic deploys to `main`.
 *
 * `{"main": true}` alone does NOT: per Vercel's git-configuration docs, "any
 * unspecified branch defaults to true", so naming `main` as enabled restricts
 * nothing and the file merely looked like it did. A catch-all is what expresses
 * the invariant. `main` keeps its explicit `true` because when a branch matches
 * several rules "a deployment will trigger if at least one rule evaluates to
 * true" -- that is what keeps production deploying while everything else stops.
 * `**` rather than `*`, because minimatch's `*` does not cross a `/` and every
 * branch here is `type/description`.
 */
export function assertVercelConfigDeclaresMainOnly(
	config: VercelConfig,
): AssertionResult {
	const enabled = config.git?.deploymentEnabled;
	if (enabled === undefined) {
		return {
			ok: false,
			message:
				"vercel.json declares no git.deploymentEnabled, so nothing in this repo restricts which branches Vercel deploys. The repo documents main-only.",
		};
	}
	if (typeof enabled === "boolean") {
		return {
			ok: false,
			message: `vercel.json sets git.deploymentEnabled to ${enabled}, which applies to every branch including main. main-only needs the per-branch form.`,
		};
	}
	const problems: string[] = [];
	if (enabled["main"] !== true) {
		problems.push(
			"`main` is not explicitly true, so the catch-all below can stop production deploying (matching rules are OR-ed, and an explicit true is what wins)",
		);
	}
	const catchAll = Object.entries(enabled).find(
		([pattern]) => pattern === "**",
	);
	if (!catchAll) {
		problems.push(
			'there is no `"**": false` catch-all, and any branch Vercel finds no rule for defaults to TRUE -- so this file restricts nothing',
		);
	} else if (catchAll[1] !== false) {
		problems.push("the `**` catch-all is not false");
	}
	if (problems.length === 0) {
		return {
			ok: true,
			message: "vercel.json restricts automatic deploys to main",
		};
	}
	return {
		ok: false,
		message: `vercel.json does not express main-only deploys:\n${problems.map((line) => `- ${line}`).join("\n")}`,
	};
}

/**
 * And Vercel must actually behave that way.
 *
 * Two halves, because either one alone can pass while being wrong. No open PR
 * head may carry a Vercel status (a preview deployed), AND a recent main commit
 * must carry one (production still deploys, and this signal is alive at all).
 * The second half is what catches a catch-all rule that went too far.
 */
export function assertVercelDeploysOnlyMain(state: {
	readonly mainCommits: readonly CommitStatuses[];
	readonly pullRequestHeads: readonly PullRequestHead[];
}): AssertionResult {
	const hasVercel = (commit: CommitStatuses): boolean =>
		commit.contexts.some((context) => VERCEL_CONTEXT.test(context));

	if (state.mainCommits.length === 0) {
		return {
			ok: false,
			message:
				"examined no main commits, so this proves nothing about where Vercel deploys from.",
		};
	}
	if (!state.mainCommits.some(hasVercel)) {
		return {
			ok: false,
			message: `none of the last ${state.mainCommits.length} commits on main carries a Vercel status. Either the Git integration is gone, or production has stopped deploying -- check that the \`**\` catch-all in vercel.json did not also stop main. The last deploy stays live, so the site is stale rather than down.`,
		};
	}
	const previews = state.pullRequestHeads.filter(hasVercel);
	if (previews.length > 0) {
		return {
			ok: false,
			message: `Vercel deployed a branch other than main: ${previews.map((pr) => `#${pr.number} (${pr.sha.slice(0, 9)})`).join(", ")}. The repo documents main-only, and preview URLs built from a PR branch run against PRODUCTION Supabase.`,
		};
	}
	return {
		ok: true,
		message:
			state.pullRequestHeads.length === 0
				? "main deploys and there are no open pull requests to have deployed"
				: `main deploys and none of the ${state.pullRequestHeads.length} open pull request head(s) did`,
	};
}
