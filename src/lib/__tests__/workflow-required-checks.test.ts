/**
 * Drift guard: every required status check must be reported on EVERY pull
 * request, and the doc-only companion must stay the exact inverse of the real
 * CI.
 *
 * Branch protection matches a required check by JOB NAME, and a workflow that
 * skips on `paths-ignore` reports nothing at all -- the check stays in
 * "expected" forever and the PR cannot merge. ci-cd-doc-only.yml exists only to
 * answer that: it fires on the inverse path set and declares a same-named no-op
 * job for each of ci-cd.yml's. Its own header says "keep the path list here in
 * lockstep with paths-ignore in ci-cd.yml. Adding a path to one without the
 * other re-introduces the bug" -- and until this file, nothing checked that.
 * The same is true of `rls-security`, which needs no twin ONLY because
 * rls-security-tests.yml carries no path filter; adding one would strand a
 * required check on every doc-only PR.
 *
 * The required-check list is shared with scripts/verify-platform-config.ts,
 * which asserts branch protection still requires exactly these. One list, two
 * guards: this one offline on every commit, that one against live GitHub.
 *
 * Sibling guard: workflow-pins.test.ts, for action SHA pinning.
 *
 * Pure filesystem read -- never touches the DOM.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { REQUIRED_CHECK_CONTEXTS } from "../../../scripts/platform-config-assertions";

const WORKFLOWS_DIR = join(process.cwd(), ".github", "workflows");

interface TriggerPaths {
	readonly paths: readonly string[] | null;
	readonly pathsIgnore: readonly string[] | null;
}

interface Workflow extends TriggerPaths {
	readonly file: string;
	readonly jobs: readonly string[];
	readonly triggersOnPullRequest: boolean;
	/** `on.push` path filters, kept separately so the lockstep covers both events. */
	readonly push: TriggerPaths | null;
}

/**
 * Minimal shape of the parts of a workflow file this guard reads. The `on` key
 * survives as a string key because YAML 1.2 dropped `on` as a boolean, which is
 * what the `yaml` package implements.
 */
interface RawWorkflow {
	readonly on?: {
		readonly push?: RawTrigger | null;
		readonly pull_request?: RawTrigger | null;
	} | null;
	readonly jobs?: Readonly<Record<string, RawJob | null>> | null;
}

interface RawJob {
	/**
	 * A job's `name:`, which is what it reports as a check and therefore what
	 * branch protection matches. Reading the KEY instead is a real defect: this
	 * repo's codeql.yml has the key `analyze` and reports as
	 * `Analyze (javascript-typescript)`, so adding `name: Checks` to ci-cd.yml's
	 * `checks` job would strand a required check while a key-based guard stayed
	 * green.
	 */
	readonly name?: string;
}

interface RawTrigger {
	readonly paths?: readonly string[] | null;
	readonly "paths-ignore"?: readonly string[] | null;
}

function readTrigger(trigger: RawTrigger | null | undefined): TriggerPaths {
	return {
		paths: trigger?.paths ?? null,
		pathsIgnore: trigger?.["paths-ignore"] ?? null,
	};
}

function collectWorkflows(): Workflow[] {
	return readdirSync(WORKFLOWS_DIR)
		.filter((file) => file.endsWith(".yml"))
		.map((file) => {
			const raw = parse(
				readFileSync(join(WORKFLOWS_DIR, file), "utf8"),
			) as RawWorkflow;
			const pullRequest = raw.on?.pull_request;
			return {
				file,
				jobs: Object.entries(raw.jobs ?? {}).map(([key, job]) =>
					typeof job?.name === "string" ? job.name : key,
				),
				triggersOnPullRequest: pullRequest !== undefined,
				push: raw.on?.push === undefined ? null : readTrigger(raw.on?.push),
				...readTrigger(pullRequest),
			};
		});
}

/** Order-insensitive comparison of two path lists. */
function samePaths(
	left: readonly string[] | null,
	right: readonly string[] | null,
): boolean {
	if (left === null || right === null) return false;
	return [...left].sort().join("\n") === [...right].sort().join("\n");
}

const workflows = collectWorkflows();
const byFile = (file: string): Workflow => {
	const found = workflows.find((workflow) => workflow.file === file);
	if (found === undefined) throw new Error(`${file} is missing`);
	return found;
};

describe("CI reports every required check on every pull request", () => {
	it("found workflows to guard", () => {
		// Without this, a parser that silently matched nothing would make every
		// assertion below pass vacuously.
		expect(workflows.length).toBeGreaterThan(0);
		expect(REQUIRED_CHECK_CONTEXTS.length).toBeGreaterThan(0);
		expect(workflows.some((workflow) => workflow.triggersOnPullRequest)).toBe(
			true,
		);
	});

	it.each(REQUIRED_CHECK_CONTEXTS)(
		"%s is reported whatever a pull request touches",
		(context) => {
			const providers = workflows.filter(
				(workflow) =>
					workflow.triggersOnPullRequest && workflow.jobs.includes(context),
			);
			expect(
				providers.map((provider) => provider.file),
				`No workflow triggering on pull_request declares a job named "${context}", so branch protection waits forever for a check nothing reports.`,
			).not.toEqual([]);

			// Unfiltered provider: it runs on every PR, nothing more is needed.
			if (
				providers.some(
					(provider) =>
						provider.paths === null && provider.pathsIgnore === null,
				)
			) {
				return;
			}

			// Otherwise the filters have to be complements: one workflow's
			// paths-ignore must be exactly another's paths.
			const complemented = providers.some((skipper) =>
				providers.some(
					(twin) =>
						twin !== skipper && samePaths(skipper.pathsIgnore, twin.paths),
				),
			);
			expect(
				complemented,
				`"${context}" is only reported by path-filtered workflows (${providers
					.map(
						(provider) =>
							`${provider.file} paths=${JSON.stringify(provider.paths)} paths-ignore=${JSON.stringify(provider.pathsIgnore)}`,
					)
					.join(
						"; ",
					)}) and no two of them are complements, so some pull request gets no report for a required check and cannot merge.`,
			).toBe(true);
		},
	);
});

describe("the doc-only companion mirrors the real CI", () => {
	const real = byFile("ci-cd.yml");
	const docOnly = byFile("ci-cd-doc-only.yml");

	it("has a non-empty path list on both sides, for both events", () => {
		// Without the push pair here, two deleted lists compare [] to [] and the
		// lockstep assertion below passes having compared nothing.
		for (const list of [
			real.pathsIgnore,
			docOnly.paths,
			real.push?.pathsIgnore,
			docOnly.push?.paths,
		]) {
			expect(list).not.toBeNull();
			expect(list).not.toEqual([]);
		}
	});

	it("fires on exactly the pull_request paths the real CI ignores", () => {
		expect([...(docOnly.paths ?? [])].sort()).toEqual(
			[...(real.pathsIgnore ?? [])].sort(),
		);
	});

	it("fires on exactly the push paths the real CI ignores", () => {
		expect([...(docOnly.push?.paths ?? [])].sort()).toEqual(
			[...(real.push?.pathsIgnore ?? [])].sort(),
		);
	});

	it("declares a twin job reporting every check name the real CI reports, and no others", () => {
		// Equality in both directions: a job added to ci-cd.yml without a twin
		// strands any required check it provides, and a twin with no counterpart
		// reports a check name that the real CI never produces.
		expect([...docOnly.jobs].sort()).toEqual([...real.jobs].sort());
	});
});

describe("rls-security needs no twin, and that is load-bearing", () => {
	it("rls-security-tests.yml filters no paths on pull_request", () => {
		const rls = byFile("rls-security-tests.yml");
		expect(rls.triggersOnPullRequest).toBe(true);
		// A path filter here would strand the `rls-security` required check on
		// every pull request the filter excluded, with no companion to report it.
		expect(rls.paths).toBeNull();
		expect(rls.pathsIgnore).toBeNull();
	});
});
