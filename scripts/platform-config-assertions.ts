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
 * The functions here take state somebody else fetched and say whether it still
 * matches what the repo claims. `platform-config-assertions.test.ts` fails each
 * one on purpose, and `scripts/verify-platform-config.ts` does the fetching.
 *
 * EACH ASSERTION SAYS WHAT ITS SIGNAL CAN AND CANNOT ESTABLISH, because two of
 * them read a proxy rather than the setting itself, and a gate that overstates
 * its own reach is the failure it was built to prevent. Where the proxy is too
 * weak, the result is `unverified` -- annotated as a warning and left out of
 * the pass count -- rather than a pass.
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

/** How Vercel names itself in a commit status context. */
const VERCEL_CONTEXT = /^vercel/i;

/** The GitHub App slug the Supabase integration posts its check runs under. */
const SUPABASE_APP_SLUG = "supabase";

/**
 * When the Supabase production branch was cleared, from the Management API's
 * own `updated_at` on the branch row.
 *
 * Check runs that completed before this belong to the era when the setting WAS
 * on -- four of them concluded `failure` -- and say nothing about the setting
 * now. Without this bound the proxy reports a resolved historical event as a
 * live regression for as long as those commits stay in the window.
 */
export const SUPABASE_AUTHORITY_REVOKED_AT = "2026-10-25T07:11:58Z";

/**
 * How recent a Supabase run has to be to say anything about the setting today.
 *
 * Also what lets this clear itself: a re-enable that is caught and then turned
 * off again stops being reported once its runs age out, instead of reddening
 * the gate forever the way an un-bounded history would.
 */
const SUPABASE_RUN_FRESHNESS_HOURS = 168;

/** What `vercel.json` must say, exactly, for "deploy main and nothing else". */
const DOCUMENTED_DEPLOYMENT_RULES: Readonly<Record<string, boolean>> = {
	main: true,
	"**": false,
};

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
	/** ISO 8601, or null while the run is still in progress. */
	readonly completedAt: string | null;
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
		readonly deploymentEnabled?:
			| boolean
			| Readonly<Record<string, boolean>>
			| null;
	} | null;
}

/**
 * A row from Supabase's `GET /v1/projects/{ref}/branches`.
 *
 * `git_branch` is the field that carries the authority: while "Deploy to
 * production" was on it held `"main"`, and clearing the setting emptied it.
 * Shape confirmed against the live API on 2026-10-25.
 */
export interface SupabaseBranch {
	readonly name: string;
	readonly git_branch?: string | null;
	readonly is_default?: boolean;
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
 * unverified rather than as a pass when it was not.
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
 * THE REAL CHECK on Supabase's authority over production: no branch may be
 * bound to a git branch.
 *
 * `git_branch` is what "Deploy to production" writes. It held `"main"` while the
 * setting was on and was emptied to `""` when it was cleared on 2026-10-25.
 *
 * Reading it needs a Supabase personal access token, which is account-wide and
 * cannot be scoped -- so CI is deliberately not given one, and calls this only
 * when a token happens to be present (a local run, or a future scoped
 * credential). Without it the gate falls back to
 * `assertSupabaseDidNotActOnProduction`, which proves strictly less and says so.
 */
export function assertSupabaseBranchingHasNoGitLink(
	branches: readonly SupabaseBranch[],
): AssertionResult {
	if (branches.length === 0) {
		return {
			ok: false,
			message:
				"the Supabase branches endpoint returned no rows, not even the production branch. The project ref is wrong or the response shape changed, so nothing was checked.",
		};
	}
	const linked = branches.filter((branch) => (branch.git_branch ?? "") !== "");
	if (linked.length === 0) {
		return {
			ok: true,
			message: `no Supabase branch is bound to a git branch (${branches.length} branch(es) examined)`,
		};
	}
	return {
		ok: false,
		message: `Supabase can deploy to production on merge again: ${linked.map((branch) => `${branch.name} -> ${String(branch.git_branch)}`).join(", ")}. CLAUDE.md says migrations are applied by hand, never on merge. Turn "Deploy to production" off under Project Settings -> Integrations, on the GitHub card (NOT the Branches page, whose row menu only offers "Change production branch" and "Resync branch").`,
	};
}

/**
 * The weaker, credential-free check: no Supabase check run ACTED on this repo.
 *
 * WHAT `skipped` DOES NOT MEAN. It is tempting to read a `skipped` conclusion as
 * "the integration has no authority", and that reading is wrong. Measured on
 * this repo's own history: `d0077d3ac` was merged to main at 21:29Z on
 * 2026-10-24, TEN HOURS before the production branch was cleared, and its
 * `Supabase Preview` run concluded `skipped` with the summary "This git branch
 * is not associated with any Supabase Branch." -- byte-identical to
 * `754c91802` at 08:08Z on 2026-10-25, after the setting was off. So `skipped`
 * is silence, not proof.
 *
 * What the runs that ACTED look like: `25cef7b2b` (06:10:25Z) and `18ff5f9a8`
 * (06:48:21Z) both concluded `failure` with "Remote migration versions not
 * found in local migrations directory" -- the production deploy attempting and
 * failing. A `success` would be worse: it would mean migrations were applied.
 *
 * So this detects an integration that is ACTING, which is the state that does
 * damage, but it cannot detect one that is merely enabled and has had nothing
 * to do yet. `assertSupabaseBranchingHasNoGitLink` is the assertion that can.
 * Treat a pass here as "nothing has been applied", never as "the setting is
 * off".
 *
 * TWO TIME BOUNDS, because the signal is history rather than state. Runs that
 * completed before `SUPABASE_AUTHORITY_REVOKED_AT` are the pre-fix era, and
 * runs older than `SUPABASE_RUN_FRESHNESS_HOURS` have stopped describing today
 * -- which is also what lets this clear itself after a re-enable is fixed,
 * rather than staying red for as long as the commit stays in the window.
 */
export function assertSupabaseDidNotActOnProduction(
	commitsExamined: number,
	runs: readonly CommitCheckRun[],
	options: {
		readonly truncated?: boolean;
		/** Evaluation time; injected so the bounds below are testable. */
		readonly now: Date;
		readonly revokedAt?: string;
		readonly freshnessHours?: number;
	},
): AssertionResult {
	// Zero commits is not a pass: an empty window makes the filters below return
	// nothing and report the invariant as satisfied without having looked.
	if (commitsExamined === 0) {
		return {
			ok: false,
			message:
				"examined no commits, so this proves nothing about the Supabase integration. The commit listing failed or returned an empty page.",
		};
	}
	// A truncated check-run page could have dropped the very run this reads.
	if (options.truncated === true) {
		return {
			ok: false,
			message:
				"the check-run listing was truncated, so a Supabase run may have been dropped from the page this assertion read. Paginate before trusting the result.",
		};
	}

	const revokedAt = Date.parse(
		options.revokedAt ?? SUPABASE_AUTHORITY_REVOKED_AT,
	);
	const freshest =
		options.now.getTime() -
		(options.freshnessHours ?? SUPABASE_RUN_FRESHNESS_HOURS) * 3600_000;
	const floor = Math.max(revokedAt, freshest);

	const fromSupabase = runs.filter((run) => run.app === SUPABASE_APP_SLUG);
	const inWindow = fromSupabase.filter((run) => {
		if (run.completedAt === null) return true;
		const completed = Date.parse(run.completedAt);
		return Number.isNaN(completed) ? true : completed >= floor;
	});
	const stale = fromSupabase.length - inWindow.length;

	// An in-progress run has concluded nothing yet. Failing on it would redden
	// the gate with a wrong diagnosis whenever a scheduled run overlaps a merge.
	const acted = inWindow.filter(
		(run) => run.conclusion !== null && run.conclusion !== "skipped",
	);
	if (acted.length > 0) {
		return {
			ok: false,
			message: `the Supabase GitHub integration ACTED on this repo: ${acted.map((run) => `${run.sha.slice(0, 9)} ${run.name} -> ${String(run.conclusion)} at ${String(run.completedAt)}`).join(", ")}. A conclusion other than \`skipped\` means it ran against production -- "Deploy to production" is back on, and a \`success\` means migrations were applied. Turn it off under Project Settings -> Integrations, on the GitHub card (NOT the Branches page, whose row menu only offers "Change production branch" and "Resync branch").`,
		};
	}

	// Nothing from Supabase at all is NOT the same as nothing acting. The app
	// posts a run on every commit here, so an empty set means the slug changed,
	// the app was removed, or this stopped reading the right field.
	if (fromSupabase.length === 0) {
		return {
			ok: true,
			unverified: true,
			message: `no check run from the \`${SUPABASE_APP_SLUG}\` app appears on any of the ${commitsExamined} commit(s) examined, where one appears on every commit today. The app may have been removed (in which case delete this assertion) or its slug may have changed (in which case fix SUPABASE_APP_SLUG) -- either way nothing was checked.`,
		};
	}
	if (inWindow.length === 0) {
		return {
			ok: true,
			unverified: true,
			message: `all ${fromSupabase.length} Supabase check run(s) in the ${commitsExamined} commit(s) examined completed before the window this trusts (nothing on or after ${new Date(floor).toISOString()}), so none of them says anything about the setting now. Nothing has been pushed to main recently enough to read.`,
		};
	}
	const pending = inWindow.filter((run) => run.conclusion === null);
	if (pending.length === inWindow.length) {
		return {
			ok: true,
			unverified: true,
			message: `every in-window Supabase check run (${pending.length} of them) is still in progress, so none of them has concluded anything yet.`,
		};
	}
	return {
		ok: true,
		message: `no Supabase check run acted on production (${commitsExamined} commit(s) examined, ${inWindow.length} in-window Supabase run(s)${stale > 0 ? `, ${stale} older run(s) ignored` : ""}${pending.length > 0 ? `, ${pending.length} still in progress` : ""}). NOTE: this does not establish that the setting is off -- see the function's docstring.`,
	};
}

/**
 * `vercel.json` must actually restrict automatic deploys to `main`.
 *
 * `{"main": true}` alone does NOT: per Vercel's git-configuration docs, "any
 * unspecified branch defaults to true", so naming `main` as enabled restricted
 * nothing and the file merely looked like it did. A catch-all is what expresses
 * the invariant. `main` keeps its explicit `true` because when a branch matches
 * several rules "a deployment will trigger if at least one rule evaluates to
 * true" -- that is what keeps production deploying while everything else stops.
 * `**` rather than `*`, because minimatch's `*` does not cross a `/` and every
 * branch here is `type/description`.
 *
 * WHAT THIS FILE WAS NOT DOING. Previews were already not deploying under the
 * no-op version (the last 20 deployments are all target=production from `main`,
 * and no open pull request head carries a Vercel status), which means the
 * enforcement lives in a project setting on Vercel that nothing here reads --
 * the same blind spot the Supabase toggle created. This file now ALSO expresses
 * the invariant, so the repo is an authority for it; it is not the thing that
 * has been enforcing it.
 *
 * The rule set is compared EXACTLY, like the required-check list: an extra
 * truthy pattern (`{"main": true, "**": false, "feat/*": true}`) would hand
 * preview deploys back to a whole class of branches while every other check
 * here still passed.
 */
export function assertVercelConfigDeclaresMainOnly(
	config: VercelConfig,
	documented: Readonly<Record<string, boolean>> = DOCUMENTED_DEPLOYMENT_RULES,
): AssertionResult {
	const enabled = config.git?.deploymentEnabled;
	if (enabled === undefined || enabled === null) {
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
	for (const [pattern, value] of Object.entries(documented)) {
		if (enabled[pattern] !== value) {
			problems.push(
				`\`${pattern}\` should be ${String(value)}, is ${String(enabled[pattern])}${pattern === "**" ? " -- and any branch Vercel finds no rule for defaults to TRUE, so without this catch-all the file restricts nothing" : " -- matching rules are OR-ed, and an explicit true is what keeps production deploying past the catch-all"}`,
			);
		}
	}
	const extra = Object.keys(enabled).filter(
		(pattern) => !(pattern in documented),
	);
	if (extra.length > 0) {
		problems.push(
			`undocumented pattern(s) ${extra.map((pattern) => `\`${pattern}\`=${String(enabled[pattern])}`).join(", ")} -- a truthy one hands preview deploys back to those branches, and previews run against PRODUCTION Supabase. Update DOCUMENTED_DEPLOYMENT_RULES in the same commit if deliberate.`,
		);
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
 *
 * The main-commit window has to be generous: `GET /commits?sha=main` lists every
 * commit REACHABLE from main in date order, so merge commits pull in branch
 * commits that never deployed, and this repo already has runs of five
 * consecutive Vercel-less ones.
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
	const previews = state.pullRequestHeads.filter(hasVercel);
	if (previews.length > 0) {
		return {
			ok: false,
			message: `Vercel deployed a branch other than main: ${previews.map((pr) => `#${pr.number} (${pr.sha.slice(0, 9)})`).join(", ")}. The repo documents main-only, and a preview URL built from a PR branch runs against PRODUCTION Supabase. A commit status is never removed, so this stays red until that pull request is closed or its head is replaced -- fix the deploy rules first, then close or re-push the branch.`,
		};
	}
	if (!state.mainCommits.some(hasVercel)) {
		return {
			ok: true,
			unverified: true,
			message: `none of the last ${state.mainCommits.length} commits reachable from main carries a Vercel status. That is expected for a few minutes after a push, while Vercel has not reported yet; if it persists, either the Git integration is gone or production has stopped deploying -- check that the \`**\` catch-all in vercel.json did not also stop main. The last deploy stays live, so the site would be stale rather than down.`,
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
