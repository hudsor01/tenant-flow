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
 * the weaker reading is reported as UNVERIFIED rather than as a pass:
 *
 *   - Supabase's authority over production. The real field is `git_branch` on
 *     the project's branches, which needs a Supabase personal access token.
 *     Those are account-wide and cannot be scoped, so CI is deliberately not
 *     given one; when SUPABASE_ACCESS_TOKEN is absent this falls back to the
 *     integration's check runs, which can only show that it has not ACTED.
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
	warningAnnotation,
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
	type VercelConfig,
} from "./platform-config-assertions";

/**
 * How far back on main to look.
 *
 * `GET /commits?sha=main` lists every commit REACHABLE from main in date order,
 * not just first-parent, so a merge pulls in branch commits that never
 * deployed; this repo already has runs of five consecutive Vercel-less ones.
 * Twenty keeps the "main still deploys" half of the Vercel assertion out of
 * that hole while keeping this to about fifty API calls.
 */
const MAIN_COMMIT_WINDOW = 20;

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
	readonly statuses: readonly { readonly context: string }[];
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

const results: (readonly [string, AssertionResult])[] = [];
const add = (title: string, result: AssertionResult): void => {
	results.push([title, result]);
};

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

const mainCommits = await gh<readonly { readonly sha: string }[]>(
	`/commits?sha=main&per_page=${MAIN_COMMIT_WINDOW}`,
);

// Every app's runs: the Supabase filter is part of the assertion's tested
// contract, so it stays there rather than being applied here.
const checkRuns: CommitCheckRun[] = [];
const mainStatuses: CommitStatuses[] = [];
let checkRunsTruncated = false;
for (const commit of mainCommits) {
	const runs = await gh<CheckRunsResponse>(
		`/commits/${commit.sha}/check-runs?per_page=100`,
		"checks: read",
	);
	// A page that dropped rows could have dropped the one run this reads.
	if ((runs.total_count ?? runs.check_runs.length) > runs.check_runs.length) {
		checkRunsTruncated = true;
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
	const status = await gh<CombinedStatusResponse>(
		`/commits/${commit.sha}/status`,
		"statuses: read",
	);
	mainStatuses.push({
		sha: commit.sha,
		contexts: status.statuses.map((entry) => entry.context),
	});
}

// The real Supabase check when a token for it exists, the check-run proxy when
// it does not. Never both: the proxy's pass would pad the count with a weaker
// restatement of what the strong one already settled.
if (SUPABASE_TOKEN === "") {
	add(
		"Supabase has not acted on production",
		assertSupabaseDidNotActOnProduction(mainCommits.length, checkRuns, {
			truncated: checkRunsTruncated,
			now: new Date(),
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

const openPulls = await gh<
	readonly {
		readonly number: number;
		readonly head: { readonly sha: string };
	}[]
>("/pulls?state=open&per_page=100", "pull-requests: read");

const pullRequestHeads: PullRequestHead[] = [];
for (const pull of openPulls) {
	const status = await gh<CombinedStatusResponse>(
		`/commits/${pull.head.sha}/status`,
		"statuses: read",
	);
	pullRequestHeads.push({
		number: pull.number,
		sha: pull.head.sha,
		contexts: status.statuses.map((entry) => entry.context),
	});
}

add(
	"vercel.json declares main-only deploys",
	assertVercelConfigDeclaresMainOnly(
		JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig,
	),
);
add(
	"Vercel deploys main and nothing else",
	assertVercelDeploysOnlyMain({ mainCommits: mainStatuses, pullRequestHeads }),
);

let failed = 0;
let unverified = 0;
for (const [title, result] of results) {
	if (result.unverified === true) {
		unverified += 1;
		console.log(warningAnnotation(`UNVERIFIED  ${title}\n${result.message}`));
		console.log(`UNVERIFIED  ${title}: ${result.message}`);
		continue;
	}
	if (result.ok) {
		console.log(`PASS  ${title}: ${result.message}`);
		continue;
	}
	failed += 1;
	console.log(errorAnnotation(`${title}\n${result.message}`));
	console.log(`FAIL  ${title}: ${result.message}`);
}

const checked = results.length - unverified;
console.log(
	`\n${checked - failed} of ${checked} checked invariants hold${unverified > 0 ? `, ${unverified} unverified` : ""} (${mainCommits.length} main commit(s), ${pullRequestHeads.length} open pull request(s) examined${SUPABASE_TOKEN === "" ? "; no SUPABASE_ACCESS_TOKEN, so Supabase's setting itself was not read" : ""})`,
);
process.exit(failed === 0 ? 0 : 1);
