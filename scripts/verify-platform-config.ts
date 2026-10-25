/**
 * Fetches the platform configuration this repo depends on and asserts it still
 * matches what the repo says about itself.
 *
 * The assertions are in scripts/platform-config-assertions.ts, with their
 * negative controls in the test beside them. This file only gathers state, and
 * needs no credential beyond a GitHub token that can read this repository --
 * see the header of the assertions module for why the Supabase invariant is
 * read from the integration's own check runs rather than from Supabase's API.
 *
 *   GITHUB_TOKEN=$(gh auth token) bun scripts/verify-platform-config.ts
 *
 * In CI the workflow token needs: contents read, checks read, statuses read,
 * pull-requests read. One secondary invariant -- that main still blocks force
 * pushes and deletion -- can only be read from the admin-only protection
 * endpoint, and the workflow `permissions:` block has no `administration` key
 * to grant, so GITHUB_TOKEN cannot reach it. That one is reported UNVERIFIED
 * with a warning rather than counted as a pass; a user token (the local command
 * above) or a fine-grained PAT with Administration:read on this repo alone
 * upgrades it to a real assertion with no other change.
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
	assertSupabaseHasNoProductionAuthority,
	assertVercelConfigDeclaresMainOnly,
	assertVercelDeploysOnlyMain,
	type BranchProtection,
	type BranchSummary,
	type CommitCheckRun,
	type CommitStatuses,
	type PullRequestHead,
	type VercelConfig,
} from "./platform-config-assertions";

/**
 * How far back on main to look. Both platform signals are posted in response to
 * a push, so there is nothing to detect before the next one; a handful of
 * commits is enough to survive a merge that Vercel skipped while keeping this
 * to about twenty API calls.
 */
const MAIN_COMMIT_WINDOW = 5;

const TOKEN = process.env["GITHUB_TOKEN"] ?? "";
const REPO = process.env["GITHUB_REPOSITORY"] ?? "hudsor01/tenant-flow";

if (TOKEN === "") {
	console.log(
		errorAnnotation(
			"GITHUB_TOKEN is not set. Locally: GITHUB_TOKEN=$(gh auth token) bun scripts/verify-platform-config.ts",
		),
	);
	process.exit(2);
}

interface CheckRunsResponse {
	readonly check_runs: readonly {
		readonly name: string;
		readonly conclusion: string | null;
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

async function gh<T>(path: string, needs?: string): Promise<T> {
	const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${TOKEN}`,
			"x-github-api-version": "2022-11-28",
		},
	});
	if (!response.ok) {
		const hint =
			response.status === 403 || response.status === 404
				? ` The token may lack the permission this needs${needs === undefined ? "" : ` (${needs})`}.`
				: "";
		throw new HttpError(
			response.status,
			`GET ${path} answered ${response.status} ${response.statusText}.${hint}`,
		);
	}
	return (await response.json()) as T;
}

const branch = await gh<BranchSummary>("/branches/main", "contents: read");

// The admin-only endpoint. Attempted, never required: see the file header.
let protection: BranchProtection | null = null;
let protectionError = "";
try {
	protection = await gh<BranchProtection>("/branches/main/protection");
} catch (error) {
	if (
		error instanceof HttpError &&
		(error.status === 403 || error.status === 404)
	) {
		protectionError = error.message;
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
for (const commit of mainCommits) {
	const runs = await gh<CheckRunsResponse>(
		`/commits/${commit.sha}/check-runs?per_page=100`,
		"checks: read",
	);
	for (const run of runs.check_runs) {
		checkRuns.push({
			sha: commit.sha,
			app: run.app?.slug ?? "",
			name: run.name,
			conclusion: run.conclusion,
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

const vercelConfig = JSON.parse(
	readFileSync("vercel.json", "utf8"),
) as VercelConfig;

const results: readonly (readonly [string, AssertionResult])[] = [
	["main is a protected branch", assertProtectionEnforced(branch)],
	[
		"branch protection requires the documented checks",
		assertRequiredChecks(branch.protection?.required_status_checks?.contexts),
	],
	[
		"Supabase holds no production authority",
		assertSupabaseHasNoProductionAuthority(mainCommits.length, checkRuns),
	],
	[
		"vercel.json declares main-only deploys",
		assertVercelConfigDeclaresMainOnly(vercelConfig),
	],
	[
		"Vercel deploys main and nothing else",
		assertVercelDeploysOnlyMain({
			mainCommits: mainStatuses,
			pullRequestHeads,
		}),
	],
];

let failed = 0;
let unverified = 0;

if (protection === null) {
	unverified += 1;
	console.log(
		warningAnnotation(
			`UNVERIFIED  main blocks force pushes and deletion -- this token cannot read the admin-only protection endpoint, so the invariant was not checked. ${protectionError} Run locally with GITHUB_TOKEN=$(gh auth token), or supply a fine-grained PAT with Administration:read on this repository.`,
		),
	);
} else {
	const history = assertHistoryProtected(protection);
	if (history.ok) {
		console.log(`PASS  main's history is protected: ${history.message}`);
	} else {
		failed += 1;
		console.log(
			errorAnnotation(`main's history is protected\n${history.message}`),
		);
		console.log(`FAIL  main's history is protected: ${history.message}`);
	}
}

for (const [title, result] of results) {
	if (result.ok) {
		console.log(`PASS  ${title}: ${result.message}`);
		continue;
	}
	failed += 1;
	console.log(errorAnnotation(`${title}\n${result.message}`));
	console.log(`FAIL  ${title}: ${result.message}`);
}

const checked = results.length + (protection === null ? 0 : 1);
console.log(
	`\n${checked - failed} of ${checked} checked invariants hold${unverified > 0 ? `, ${unverified} unverified` : ""} (${mainCommits.length} main commit(s), ${pullRequestHeads.length} open pull request(s) examined)`,
);
process.exit(failed === 0 ? 0 : 1);
