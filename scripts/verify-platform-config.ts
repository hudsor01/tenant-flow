/**
 * Fetches the platform configuration this repo depends on and asserts it still
 * matches what the repo says about itself.
 *
 * The assertions are in scripts/platform-config-assertions.ts, with their
 * negative controls in the test beside them. This file only gathers state.
 *
 *   GITHUB_TOKEN=$(gh auth token) bun scripts/verify-platform-config.ts
 *
 * TWO INVARIANTS ARE READ AT WHATEVER STRENGTH THE AVAILABLE TOKEN ALLOWS, and
 * the weaker reading is reported UNVERIFIED rather than as a pass:
 *
 *   - Supabase's authority over production. The real field is `git_branch` on
 *     the project's branches, which needs a Supabase personal access token.
 *     Those are account-wide and cannot be scoped, so CI is deliberately not
 *     given one; without it this falls back to the integration's check runs,
 *     which can only show that it has not ACTED.
 *   - Force pushes and deletion on main, which live only on the admin-only
 *     protection endpoint. The workflow `permissions:` block has no
 *     `administration` key to grant, so GITHUB_TOKEN cannot read it at all.
 *
 * In CI the workflow token needs: contents read, checks read, statuses read,
 * pull-requests read.
 */
import { readFileSync } from "node:fs";
import {
	type AssertionResult,
	errorAnnotation,
	reportResult,
} from "./assertion-result";
import {
	assertHistoryProtected,
	assertProtectionEnforced,
	assertRequiredChecks,
	assertSupabaseBranchingHasNoGitLink,
	assertSupabaseDidNotActOnProduction,
	assertVercelConfigDeclaresMainOnly,
	assertVercelDeploysOnlyMain,
	type BranchProtection,
	type BranchSummary,
	type CommitCheckRun,
	type CommitStatuses,
	type PullRequestHead,
	type SupabaseBranch,
	supabaseWindowFloor,
	type VercelConfig,
} from "./platform-config-assertions";

/**
 * How many recent main commits the VERCEL half looks at.
 *
 * `GET /commits?sha=main` lists every commit REACHABLE from main in date order,
 * not first-parent, so a merge pulls in branch commits that never deployed;
 * this repo has had runs of five consecutive Vercel-less ones. Twenty keeps the
 * "main still deploys" half out of that hole.
 *
 * It is deliberately NOT what bounds the Supabase half. A fixed count is a
 * THIRD bound on a gate that already has two time bounds, and it is the
 * tightest of the three: twenty commits measured 16h23m of this repo's history
 * on 2026-10-25, against a 24h schedule -- so an acting run could scroll past
 * the end between two runs and be read by neither. That half fetches its own
 * commits with `since`, below.
 */
const VERCEL_COMMIT_WINDOW = 20;

/**
 * A page of commits this size means there may be more, and the Supabase half
 * must not treat a cut-off page as a clean one.
 */
const COMMIT_PAGE_LIMIT = 100;

/** The production project ref, as scripts/deploy-edge-functions.ts also pins it. */
const SUPABASE_PROJECT_REF = "bshjmbshupiibfiewpxb";

const TOKEN = process.env["GITHUB_TOKEN"] ?? "";
const REPO = process.env["GITHUB_REPOSITORY"] ?? "hudsor01/tenant-flow";
const SUPABASE_TOKEN = process.env["SUPABASE_ACCESS_TOKEN"] ?? "";

if (TOKEN === "") {
	console.log(
		errorAnnotation(
			"GITHUB_TOKEN is not set. Locally: GITHUB_TOKEN=$(gh auth token) bun scripts/verify-platform-config.ts",
		),
	);
	process.exit(2);
}

interface CheckRunsResponse {
	readonly total_count?: number;
	readonly check_runs: readonly {
		readonly name: string;
		readonly conclusion: string | null;
		readonly completed_at: string | null;
		readonly app?: { readonly slug?: string } | null;
	}[];
}

interface CombinedStatusResponse {
	readonly statuses: readonly {
		readonly context: string;
		readonly state: string;
	}[];
}

class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "HttpError";
	}
}

async function json<T>(
	url: string,
	headers: Readonly<Record<string, string>>,
	needs?: string,
): Promise<T> {
	const response = await fetch(url, { headers });
	if (!response.ok) {
		const hint =
			response.status === 403 || response.status === 404
				? ` The token may lack the permission this needs${needs === undefined ? "" : ` (${needs})`}.`
				: "";
		throw new HttpError(
			response.status,
			`GET ${url} answered ${response.status} ${response.statusText}.${hint}`,
		);
	}
	return (await response.json()) as T;
}

const gh = <T>(path: string, needs?: string): Promise<T> =>
	json<T>(
		`https://api.github.com/repos/${REPO}${path}`,
		{
			accept: "application/vnd.github+json",
			authorization: `Bearer ${TOKEN}`,
			"x-github-api-version": "2022-11-28",
		},
		needs,
	);

const statusesOf = async (sha: string): Promise<CommitStatuses> => {
	const status = await gh<CombinedStatusResponse>(
		`/commits/${sha}/status`,
		"statuses: read",
	);
	return {
		sha,
		statuses: status.statuses.map((entry) => ({
			context: entry.context,
			state: entry.state,
		})),
	};
};

const results: (readonly [string, AssertionResult])[] = [];
const add = (title: string, result: AssertionResult): void => {
	results.push([title, result]);
};

// ---------------------------------------------------------------- GitHub ----
const branch = await gh<BranchSummary>("/branches/main", "contents: read");
add("main is a protected branch", assertProtectionEnforced(branch));
add(
	"branch protection requires the documented checks",
	assertRequiredChecks(branch.protection?.required_status_checks?.contexts),
);

// The admin-only endpoint. Attempted, never required: see the file header.
try {
	add(
		"main blocks force pushes and deletion",
		assertHistoryProtected(
			await gh<BranchProtection>("/branches/main/protection"),
		),
	);
} catch (error) {
	if (
		error instanceof HttpError &&
		(error.status === 403 || error.status === 404)
	) {
		add("main blocks force pushes and deletion", {
			ok: true,
			unverified: true,
			message: `this token cannot read the admin-only protection endpoint, so the invariant was not checked. ${error.message} Run locally with GITHUB_TOKEN=$(gh auth token), or supply a fine-grained PAT with Administration:read on this repository.`,
		});
	} else {
		throw error;
	}
}

// -------------------------------------------------------------- Supabase ----
const now = new Date();
if (SUPABASE_TOKEN === "") {
	// Bounded by the SAME floor the assertion uses, so the window it reasons
	// about and the window that was fetched cannot drift apart.
	const since = new Date(supabaseWindowFloor(now)).toISOString();
	const windowCommits = await gh<readonly { readonly sha: string }[]>(
		`/commits?sha=main&since=${since}&per_page=${COMMIT_PAGE_LIMIT}`,
	);
	const checkRuns: CommitCheckRun[] = [];
	let truncated = windowCommits.length >= COMMIT_PAGE_LIMIT;
	for (const commit of windowCommits) {
		const runs = await gh<CheckRunsResponse>(
			`/commits/${commit.sha}/check-runs?per_page=100`,
			"checks: read",
		);
		// A page that dropped rows could have dropped the one run this reads.
		if ((runs.total_count ?? runs.check_runs.length) > runs.check_runs.length) {
			truncated = true;
		}
		for (const run of runs.check_runs) {
			checkRuns.push({
				sha: commit.sha,
				app: run.app?.slug ?? "",
				name: run.name,
				conclusion: run.conclusion,
				completedAt: run.completed_at,
			});
		}
	}
	add(
		"Supabase has not acted on production",
		assertSupabaseDidNotActOnProduction(windowCommits.length, checkRuns, {
			truncated,
			now,
		}),
	);
} else {
	add(
		"no Supabase branch is bound to a git branch",
		assertSupabaseBranchingHasNoGitLink(
			await json<readonly SupabaseBranch[]>(
				`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/branches`,
				{ authorization: `Bearer ${SUPABASE_TOKEN}` },
			),
		),
	);
}

// ---------------------------------------------------------------- Vercel ----
const recentCommits = await gh<readonly { readonly sha: string }[]>(
	`/commits?sha=main&per_page=${VERCEL_COMMIT_WINDOW}`,
);
const mainStatuses: CommitStatuses[] = [];
for (const commit of recentCommits) {
	mainStatuses.push(await statusesOf(commit.sha));
}

// `base=main`: a pull request FROM main into some other base carries main's own
// Vercel status on its head, which the preview half would report as a branch
// deploy. Reachable heads are skipped for the same reason.
const openPulls = await gh<
	readonly {
		readonly number: number;
		readonly head: { readonly sha: string };
	}[]
>(
	`/pulls?state=open&base=main&per_page=${COMMIT_PAGE_LIMIT}`,
	"pull-requests: read",
);
const reachable = new Set(recentCommits.map((commit) => commit.sha));
const pullRequestHeads: PullRequestHead[] = [];
for (const pull of openPulls) {
	if (reachable.has(pull.head.sha)) continue;
	pullRequestHeads.push({
		number: pull.number,
		...(await statusesOf(pull.head.sha)),
	});
}

add(
	"vercel.json declares main-only deploys",
	assertVercelConfigDeclaresMainOnly(
		JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig,
	),
);
add(
	"Vercel deploys main, and no open pull request head",
	openPulls.length >= COMMIT_PAGE_LIMIT
		? {
				ok: true,
				unverified: true,
				message: `${openPulls.length} open pull requests came back on one page, so there may be more that were not read. Paginate before trusting the preview half.`,
			}
		: assertVercelDeploysOnlyMain({
				mainCommits: mainStatuses,
				pullRequestHeads,
			}),
);

// ---------------------------------------------------------------- report ----
let failed = 0;
let unverified = 0;
for (const [title, result] of results) {
	if (reportResult(title, result)) {
		failed += 1;
		continue;
	}
	if (result.ok && result.unverified === true) unverified += 1;
}

const checked = results.length - unverified;
console.log(
	`\n${checked - failed} of ${checked} checked invariants hold${unverified > 0 ? `, ${unverified} unverified` : ""} (${recentCommits.length} recent main commit(s), ${pullRequestHeads.length} open pull request head(s) examined${SUPABASE_TOKEN === "" ? "; no SUPABASE_ACCESS_TOKEN, so Supabase's setting itself was not read -- only that nothing has acted" : ""})`,
);
process.exit(failed === 0 ? 0 : 1);
