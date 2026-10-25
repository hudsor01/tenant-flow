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
 * `scripts/workflow-contract.test.ts` guards that arrangement offline from this
 * same list, with eleven mutated-fixture controls.
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

/**
 * How long after a push Vercel may take to report before its silence counts as
 * production having stopped deploying.
 *
 * This is the one bound that decides whether the single catastrophic failure
 * mode of vercel.json's `**` catch-all -- main stops deploying too -- is a RED
 * gate or a warning nobody reads. Sixty minutes is generous against this app's
 * observed build (under two minutes), and because the check is on main's
 * NEWEST commit rather than on the whole window, it bounds detection to the
 * next scheduled run after the grace expires.
 */
const VERCEL_REPORT_GRACE_MINUTES = 60;

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
 * 36 hours = the gate's 24-hour schedule plus twelve of slack, so consecutive
 * runs OVERLAP and nothing can act in a gap between them. It was 168, which
 * was both more than needed and expensive: the caller fetches every commit in
 * this window and one check-run page each, and this repo's main has had 721
 * reachable commits in a 168-hour window, measured over 6,940 commits.
 *
 * It is also what lets this clear itself: a re-enable that is caught and then
 * turned off again stops being reported once its runs age out, instead of
 * reddening the gate for as long as the commit stays in view.
 */
const SUPABASE_RUN_FRESHNESS_HOURS = 36;

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

export interface CommitStatus {
	/** The context name, e.g. "Vercel". */
	readonly context: string;
	/** `success`, `failure`, `error` or `pending`. */
	readonly state: string;
}

export interface CommitStatuses {
	readonly sha: string;
	/** ISO 8601 committer date, used to tell "not yet" from "never". */
	readonly committedAt: string;
	readonly statuses: readonly CommitStatus[];
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
		// UNVERIFIED, not a failure. "The endpoint answered in a shape I do not
		// understand" is the same epistemic state as the 403 the caller handles,
		// and returning opposite verdicts and exit codes for one state is the
		// inconsistency this module's own thesis forbids.
		return {
			ok: true,
			unverified: true,
			message: `could not read main's force-push and deletion settings (got ${JSON.stringify({ force, deletion })}). The protection API answered 200 in a shape this does not understand, so the invariant is unchecked rather than broken -- look at the response before changing any setting.`,
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
 * WHAT `skipped` DOES NOT MEAN. It is tempting to read a `skipped` conclusion
 * as "the integration has no authority". It is wrong on this repo's own
 * history, in a way GitHub's default API view actively hides.
 *
 * `d0077d3ac` landed on main at 20:42:36Z on 2026-10-24, while "Deploy to
 * production" was ON. Under `filter=all` that one commit carries FOUR Supabase
 * runs:
 *
 *   failure  20:43:13Z  "Remote migration versions not found in local
 *                        migrations directory."   <- the deploy ACTING, 37s
 *                                                    after the merge
 *   skipped  21:29:20Z  "This git branch is not associated with any Supabase
 *                        Branch."                 <- 47 minutes later
 *   null     (in progress) x2
 *
 * Under the DEFAULT `filter=latest` -- one run per check name -- only the
 * `skipped` comes back. So a `skipped` conclusion can sit on top of an acting
 * run on the same commit, and reading it as proof would have reported "nothing
 * acted" during an active re-enable. That is why the caller passes
 * `filter=all`, and why a pass here is still not evidence the setting is off:
 * `754c91802` at 08:08:17Z, after the setting was cleared, carries exactly one
 * `skipped` run with a byte-identical summary.
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
export function supabaseWindowFloor(
	now: Date,
	revokedAt: string = SUPABASE_AUTHORITY_REVOKED_AT,
	freshnessHours: number = SUPABASE_RUN_FRESHNESS_HOURS,
): number {
	// The later bound is the more restrictive one, and Math.max is monotonic in
	// `now`, so the pre-fix runs can never re-enter the window as time passes.
	return Math.max(
		Date.parse(revokedAt),
		now.getTime() - freshnessHours * 3600_000,
	);
}

export function assertSupabaseDidNotActOnProduction(
	commitsExamined: number,
	runs: readonly CommitCheckRun[],
	options: {
		/**
		 * True when a page of commits or of check runs was cut short, so a run
		 * this reads may simply not have been on the page.
		 */
		readonly truncated?: boolean;
		/** Evaluation time; injected so the bounds below are testable. */
		readonly now: Date;
		readonly revokedAt?: string;
		readonly freshnessHours?: number;
	},
): AssertionResult {
	// UNVERIFIED, not a failure. This guard was a failure when the caller handed
	// over a fixed window of the last N commits, where zero could only mean a
	// broken listing. The caller now fetches `since=<this floor>`, which makes
	// zero a routine quiescent week -- and this repo's main has five
	// inter-commit gaps over 168h, the longest 290h. Reporting a quiet
	// fortnight as a failure every morning is the same "opposite verdicts for
	// one epistemic state" that the protection endpoint had, one function over.
	if (commitsExamined === 0) {
		return {
			ok: true,
			unverified: true,
			message:
				"no commit on main falls inside the window, so there is nothing to read: either nothing was pushed recently enough, or the commit listing came back empty. Nothing was checked either way.",
		};
	}
	if (options.truncated === true) {
		return {
			ok: false,
			message:
				"the commit or check-run listing was truncated, so a Supabase run may simply not have been on the page this assertion read. Paginate before trusting the result.",
		};
	}

	// The data is defended against an unparseable timestamp below; the BOUND
	// needs the same, because a NaN floor silently excludes every run and then
	// throws a RangeError out of `new Date(NaN).toISOString()`, past the layer
	// that turns a failure into an annotation.
	const floor = supabaseWindowFloor(
		options.now,
		options.revokedAt,
		options.freshnessHours,
	);
	const revokedAtRaw = options.revokedAt ?? SUPABASE_AUTHORITY_REVOKED_AT;
	// TWO WAYS THIS CONSTANT GOES WRONG, and only one of them is a NaN. A
	// zoneless instant parses FINE and Date.parse reads it as LOCAL time, so
	// the floor shifts silently by the machine's offset -- measured at +5h on a
	// UTC-5 box, which would hide five hours of acting runs on a local run.
	// Checked explicitly rather than inferred from the parse.
	if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(revokedAtRaw.trim())) {
		return {
			ok: false,
			message: `the Supabase window floor carries no time zone (revokedAt=${JSON.stringify(revokedAtRaw)}). Date.parse reads a zoneless instant as LOCAL time, which moves the floor by the machine's offset and hides acting runs. Give SUPABASE_AUTHORITY_REVOKED_AT its \`Z\`.`,
		};
	}
	if (Number.isNaN(floor)) {
		return {
			ok: false,
			message: `the Supabase window floor is not a date (revokedAt=${JSON.stringify(revokedAtRaw)}). SUPABASE_AUTHORITY_REVOKED_AT must be an ISO 8601 instant.`,
		};
	}

	const fromSupabase = runs.filter((run) => run.app === SUPABASE_APP_SLUG);
	const inWindow = fromSupabase.filter((run) => {
		if (run.completedAt === null) return true;
		const completed = Date.parse(run.completedAt);
		// Fail closed: a shape change must not silently remove runs from the set
		// this reads.
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
	// posted a run on 19 of the last 20 commits when this was measured
	// (2026-10-25), so an empty set means the slug changed, the app was removed,
	// or this stopped reading the right field.
	if (fromSupabase.length === 0) {
		return {
			ok: true,
			unverified: true,
			message: `no check run from the \`${SUPABASE_APP_SLUG}\` app appears on any of the ${commitsExamined} commit(s) examined, where it normally appears on nearly all of them. The app may have been removed (in which case delete this assertion) or its slug may have changed (in which case fix SUPABASE_APP_SLUG) -- either way nothing was checked.`,
		};
	}
	if (inWindow.length === 0) {
		return {
			ok: true,
			unverified: true,
			message: `all ${fromSupabase.length} Supabase check run(s) in the ${commitsExamined} commit(s) examined completed before ${new Date(floor).toISOString()}, so none of them says anything about the setting now. Nothing has been pushed to main recently enough to read.`,
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
		message: `no Supabase check run acted on production since ${new Date(floor).toISOString()} (${commitsExamined} commit(s) examined, ${inWindow.length} in-window Supabase run(s)${stale > 0 ? `, ${stale} older run(s) ignored` : ""}${pending.length > 0 ? `, ${pending.length} still in progress` : ""}). NOTE: this is a PROXY -- it does not establish that the setting is off, only that nothing has acted. See the function's docstring.`,
	};
}

/**
 * `vercel.json` must actually restrict automatic deploys to `main`.
 *
 * `{"main": true}` alone does NOT: per Vercel's git-configuration docs, "By
 * default, any unspecified branch is set to `true`", so naming `main` as
 * enabled restricted
 * nothing and the file merely looked like it did. A catch-all is what expresses
 * the invariant. `main` keeps its explicit `true` because, in the same docs, "If a
 * branch matches multiple rules and at least one rule is `true`, a deployment
 * will occur" -- that is what keeps production deploying while the rest stops.
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
	// Object.hasOwn, not `in`: `in` walks the prototype chain, so a branch rule
	// keyed `constructor` or `toString` would be treated as documented and
	// skipped by both loops.
	const extra = Object.keys(enabled).filter(
		(pattern) => !Object.hasOwn(documented, pattern),
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
 * head may carry a Vercel status (a preview deployed), AND MAIN'S TIP must
 * carry a successful one (production still deploys, and this signal is alive at
 * all). The second half is what catches a catch-all rule that went too far.
 *
 * The window's remaining commits are not what the liveness half reads -- only
 * `mainCommits[0]` is. They decide the REMEDY WORDING (whether older commits
 * deployed, which distinguishes "the tip alone stopped" from "nothing deploys")
 * and, in the caller, which pull-request heads are ancestors of main.
 */
export function assertVercelDeploysOnlyMain(state: {
	readonly mainCommits: readonly CommitStatuses[];
	readonly pullRequestHeads: readonly PullRequestHead[];
	/** Evaluation time; injected so the grace below is testable. */
	readonly now: Date;
	readonly graceMinutes?: number;
}): AssertionResult {
	// ANY state counts as "Vercel built this ref": a preview that failed to
	// build is still a preview, and Vercel still ran it against production
	// Supabase to get there.
	const built = (commit: CommitStatuses): boolean =>
		commit.statuses.some((status) => VERCEL_CONTEXT.test(status.context));
	// Liveness needs SUCCESS, though. A run of failed production builds leaves
	// the site stale, which is exactly what the failure message below describes
	// -- reading a `failure` status as "main deploys" would report the problem
	// as its own absence.
	const deployed = (commit: CommitStatuses): boolean =>
		commit.statuses.some(
			(status) =>
				VERCEL_CONTEXT.test(status.context) && status.state === "success",
		);

	const previews = state.pullRequestHeads.filter(built);
	if (previews.length > 0) {
		return {
			ok: false,
			message: `Vercel built a ref other than main: ${previews
				.map(
					(pr) =>
						`#${pr.number} (${pr.sha.slice(0, 9)}: ${pr.statuses
							.filter((status) => VERCEL_CONTEXT.test(status.context))
							.map((status) => status.state)
							.join(", ")})`,
				)
				.join(
					", ",
				)}. The repo documents main-only, and a preview built from a PR branch runs against PRODUCTION Supabase. A commit status is never removed, so this stays red until that pull request is closed or its head is replaced -- fix the deploy rules first, then close or re-push the branch.`,
		};
	}
	// MAIN'S TIP, NOT THE WHOLE WINDOW. Asking whether ANY of twenty commits
	// deployed is nearly always yes -- 8 of the last 20 carry a successful
	// Vercel status, because only the tips ever deploy and the rest are branch
	// commits a merge brought along. So a merge that stopped main deploying
	// passed cleanly, and kept passing until twenty further commits had flushed
	// every success out of the window. What the invariant asks is whether MAIN
	// AS IT STANDS NOW deployed.
	//
	// ELEMENT 0, not a max over the window's commit dates. GitHub's commit walk
	// starts at the requested `sha`, so `GET /commits?sha=main` returns main's
	// tip first -- verified against `git/ref/heads/main`. A max-by-date reduce
	// looked more defensive and was measurably WORSE: committer-second ties are
	// common here (106 of 6,940 historical windows, 4 of them on real tips from
	// multi-commit direct pushes), and whichever way the comparison resolved a
	// tie it could pick a commit that was never the tip -- a false red whose
	// remedy text talks about "the current tip", or a false GREEN on the one
	// catastrophic state this half exists to catch. The caller must preserve
	// the API's order; `committedAt` is read only for the grace clock below.
	const newest = state.mainCommits[0];
	// The empty-window guard, and the only one: a separate length check ahead of
	// the preview half was redundant with this and the sweep reported it as
	// such. An empty window is not a pass -- it is a listing that returned
	// nothing, and nothing was looked at.
	if (newest === undefined) {
		return {
			ok: false,
			message:
				"examined no main commits, so this proves nothing about where Vercel deploys from. The commit listing failed or came back empty.",
		};
	}
	if (!deployed(newest)) {
		const olderDeployed = state.mainCommits.some(deployed);
		const attempted = built(newest);
		const landed = Date.parse(newest.committedAt);
		const graceMs =
			(state.graceMinutes ?? VERCEL_REPORT_GRACE_MINUTES) * 60_000;
		// NaN lands here too: `NaN > graceMs` is false, so an unreadable commit
		// time reports unverified rather than failing on a parse.
		const settled = state.now.getTime() - landed > graceMs;
		const detail = `main's newest commit ${newest.sha.slice(0, 9)} carries no SUCCESSFUL Vercel status${attempted ? " (it carries one in another state)" : ""}.`;
		if (!settled) {
			return {
				ok: true,
				unverified: true,
				message: `${detail} It landed at ${Number.isNaN(landed) ? "an unreadable time" : new Date(landed).toISOString()}, inside the ${state.graceMinutes ?? VERCEL_REPORT_GRACE_MINUTES}-minute reporting grace, so Vercel may simply not have reported yet. The next run decides it.`,
			};
		}
		return {
			ok: false,
			message: `${detail} It landed at ${new Date(landed).toISOString()}, more than ${state.graceMinutes ?? VERCEL_REPORT_GRACE_MINUTES} minutes ago, so this is not Vercel being slow. ${
				attempted
					? "The build ran and did not succeed -- start with the Vercel deployment log."
					: olderDeployed
						? 'Older commits in this window did deploy, so the Git integration exists and it is the current tip that is not deploying -- check whether vercel.json\'s rules stopped matching main. Matching rules are OR-ed, so an explicit `"main": true` is what keeps it deploying past the `**` catch-all.'
						: "Nothing in this window deployed either, so either the Git integration is gone or PRODUCTION HAS STOPPED DEPLOYING. Check that the `**` catch-all in vercel.json did not also stop main."
			} The last good deploy stays live, so the site is stale rather than down.`,
		};
	}
	// SAYS WHAT IT LOOKED AT. This half can only see refs that have an open pull
	// request: Vercel deploys on push, so a preview on a branch with no PR is
	// invisible to it, and the title it is printed under is broader than its
	// reach.
	return {
		ok: true,
		message:
			state.pullRequestHeads.length === 0
				? "main deploys, and there are no open pull request heads to have been built (a branch with no open PR is not visible to this check)"
				: `main deploys, and none of the ${state.pullRequestHeads.length} open pull request head(s) was built (a branch with no open PR is not visible to this check)`,
	};
}
