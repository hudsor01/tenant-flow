/**
 * The contract between this repo's workflows and branch protection, as pure
 * functions over a directory of workflow files.
 *
 * WHY IT IS A CONTRACT. Branch protection matches a required check by the name
 * the JOB REPORTS, and a workflow that skips on `paths-ignore` reports nothing
 * at all -- the check stays in "expected" state forever and the pull request
 * cannot merge. `ci-cd-doc-only.yml` exists only to answer that: it fires on
 * the inverse path set and declares a same-named no-op job for each of
 * `ci-cd.yml`'s. Its own header says "keep the path list here in lockstep with
 * paths-ignore in ci-cd.yml. Adding a path to one without the other
 * re-introduces the bug" -- and nothing checked that. `rls-security` needs no
 * companion ONLY because `rls-security-tests.yml` carries no path filter at
 * all; adding one would strand a required check on every doc-only PR.
 *
 * TAKES A DIRECTORY, so the negative controls in workflow-contract.test.ts can
 * point it at mutated copies in a temp directory instead of editing the real
 * workflows. An earlier version of those controls was a shell script that
 * mutated `.github/workflows` in place and restored with `git checkout --`,
 * which silently discarded two uncommitted edits; worse, it lived outside the
 * repo, so "seven mutations are each caught" was a claim with nothing behind it
 * that a reader could run. They are committed tests now.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { AssertionResult } from "./assertion-result";

/** Path filters on one trigger. `null` means the trigger declares none. */
export interface TriggerPaths {
	readonly paths: readonly string[] | null;
	readonly pathsIgnore: readonly string[] | null;
}

export interface WorkflowSummary {
	readonly file: string;
	/**
	 * The check names this workflow's jobs report: a job's `name:` when it has
	 * one, else its key.
	 *
	 * Reading the key alone is a real defect, not a hypothetical: `codeql.yml`
	 * has the key `analyze` and reports as `Analyze (javascript-typescript)`, so
	 * adding `name: Compile checks` to `ci-cd.yml`'s `checks` job would strand a
	 * required check while a key-based guard stayed green.
	 */
	readonly jobs: readonly string[];
	/** `null` when the workflow has no such trigger at all. */
	readonly pullRequest: TriggerPaths | null;
	readonly push: TriggerPaths | null;
}

interface RawTrigger {
	readonly paths?: readonly string[] | null;
	readonly "paths-ignore"?: readonly string[] | null;
}

interface RawJob {
	readonly name?: string;
}

interface RawWorkflow {
	readonly on?:
		| string
		| readonly string[]
		| Readonly<Record<string, RawTrigger | null>>
		| null;
	readonly jobs?: Readonly<Record<string, RawJob | null>> | null;
}

/**
 * `on:` has three legal spellings and only one of them is a mapping.
 *
 * `on: pull_request` and `on: [pull_request, push]` declare the trigger with no
 * filters; reading only the mapping form made every provider disappear and
 * turned a held invariant into a red gate.
 */
function normalizeTriggers(
	on: RawWorkflow["on"],
): Readonly<Record<string, RawTrigger | null>> {
	if (on === undefined || on === null) return {};
	if (typeof on === "string") return { [on]: null };
	if (Array.isArray(on)) {
		return Object.fromEntries(on.map((event) => [event, null]));
	}
	return on as Readonly<Record<string, RawTrigger | null>>;
}

/**
 * A declared trigger always yields a TriggerPaths, even when its value is
 * empty. Returning `null` for `push:` with no body made an absent trigger and a
 * filterless one indistinguishable, so a `.not.toBeNull()` guard on the lists
 * passed on `undefined` and the lockstep below compared `[]` to `[]`.
 */
function readTrigger(
	triggers: Readonly<Record<string, RawTrigger | null>>,
	event: string,
): TriggerPaths | null {
	if (!Object.hasOwn(triggers, event)) return null;
	const trigger = triggers[event];
	return {
		paths: trigger?.paths ?? null,
		pathsIgnore: trigger?.["paths-ignore"] ?? null,
	};
}

/** Every workflow in `dir`. `.yaml` counts: GitHub accepts both extensions. */
export function collectWorkflows(dir: string): WorkflowSummary[] {
	return readdirSync(dir)
		.filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
		.sort()
		.map((file) => {
			const raw = parse(readFileSync(join(dir, file), "utf8")) as RawWorkflow;
			const triggers = normalizeTriggers(raw.on);
			return {
				file,
				jobs: Object.entries(raw.jobs ?? {}).map(([key, job]) =>
					typeof job?.name === "string" ? job.name : key,
				),
				pullRequest: readTrigger(triggers, "pull_request"),
				push: readTrigger(triggers, "push"),
			};
		});
}

/** Order-insensitive comparison of two path lists. Absent never equals absent. */
function samePaths(
	left: readonly string[] | null,
	right: readonly string[] | null,
): boolean {
	if (left === null || right === null) return false;
	return [...left].sort().join("\n") === [...right].sort().join("\n");
}

const describeFilters = (workflow: WorkflowSummary): string =>
	`${workflow.file} paths=${JSON.stringify(workflow.pullRequest?.paths)} paths-ignore=${JSON.stringify(workflow.pullRequest?.pathsIgnore)}`;

/**
 * A required check has to be reported on EVERY pull request: either by a
 * workflow with no path filter, or by two whose filters are exact complements.
 */
export function assertRequiredCheckIsAlwaysReported(
	workflows: readonly WorkflowSummary[],
	context: string,
): AssertionResult {
	if (workflows.length === 0) {
		return {
			ok: false,
			message:
				"no workflows were collected, so this proves nothing about any required check. The directory is wrong or the parser matched nothing.",
		};
	}
	const providers = workflows.filter(
		(workflow) =>
			workflow.pullRequest !== null && workflow.jobs.includes(context),
	);
	if (providers.length === 0) {
		return {
			ok: false,
			message: `no workflow triggering on pull_request reports a check named "${context}", so branch protection waits forever for a check nothing produces. A job's REPORTED name is its \`name:\` when it has one, else its key.`,
		};
	}
	if (
		providers.some(
			(provider) =>
				provider.pullRequest?.paths === null &&
				provider.pullRequest?.pathsIgnore === null,
		)
	) {
		return {
			ok: true,
			message: `"${context}" is reported by a workflow with no path filter (${providers.map((p) => p.file).join(", ")})`,
		};
	}
	const complemented = providers.some((skipper) =>
		providers.some(
			(twin) =>
				twin !== skipper &&
				samePaths(
					skipper.pullRequest?.pathsIgnore ?? null,
					twin.pullRequest?.paths ?? null,
				),
		),
	);
	if (!complemented) {
		return {
			ok: false,
			message: `"${context}" is only reported by path-filtered workflows (${providers.map(describeFilters).join("; ")}) and no two of them are complements, so some pull request gets no report for a required check and cannot merge.`,
		};
	}
	return {
		ok: true,
		message: `"${context}" is reported by complementary workflows (${providers.map((p) => p.file).join(", ")})`,
	};
}

/**
 * The doc-only companion must fire on exactly the paths the real CI ignores, on
 * both events, and report exactly the same check names.
 */
export function assertDocOnlyCompanionMirrors(
	workflows: readonly WorkflowSummary[],
	realFile: string,
	companionFile: string,
): AssertionResult {
	const real = workflows.find((workflow) => workflow.file === realFile);
	const companion = workflows.find(
		(workflow) => workflow.file === companionFile,
	);
	if (real === undefined || companion === undefined) {
		return {
			ok: false,
			message: `${real === undefined ? realFile : companionFile} is missing, so the pair cannot be compared. Removing either one strands every required check it reports.`,
		};
	}

	const problems: string[] = [];
	// Presence of the TRIGGER, before its lists: an absent `push:` key used to
	// make both sides `undefined`, and `[] === []` then compared nothing.
	for (const [label, trigger] of [
		[`${realFile} pull_request`, real.pullRequest],
		[`${companionFile} pull_request`, companion.pullRequest],
		[`${realFile} push`, real.push],
		[`${companionFile} push`, companion.push],
	] as const) {
		if (trigger === null) problems.push(`${label} trigger is absent entirely`);
	}
	if (problems.length === 0) {
		for (const [event, realPaths, companionPaths] of [
			["pull_request", real.pullRequest, companion.pullRequest],
			["push", real.push, companion.push],
		] as const) {
			const ignored = realPaths?.pathsIgnore ?? null;
			const fired = companionPaths?.paths ?? null;
			if (ignored === null || ignored.length === 0) {
				problems.push(
					`${realFile} declares no ${event} paths-ignore, so there is nothing for the companion to mirror and this comparison would prove nothing`,
				);
				continue;
			}
			if (fired === null || fired.length === 0) {
				problems.push(
					`${companionFile} declares no ${event} paths, so it fires on nothing and reports no check for the changes ${realFile} skips`,
				);
				continue;
			}
			if (!samePaths(ignored, fired)) {
				problems.push(
					`${event} path lists are not complements: ${realFile} ignores ${JSON.stringify([...ignored].sort())}, ${companionFile} fires on ${JSON.stringify([...fired].sort())}`,
				);
			}
		}
	}
	// Equality in both directions: a job added to the real CI with no twin
	// strands any required check it reports, and a twin with no counterpart
	// reports a check name the real CI never produces.
	const sortedReal = [...real.jobs].sort();
	const sortedCompanion = [...companion.jobs].sort();
	if (sortedReal.join("\n") !== sortedCompanion.join("\n")) {
		problems.push(
			`reported check names differ: ${realFile} has ${JSON.stringify(sortedReal)}, ${companionFile} has ${JSON.stringify(sortedCompanion)}`,
		);
	}
	if (problems.length > 0) {
		return {
			ok: false,
			message: `${companionFile} no longer mirrors ${realFile}:\n${problems.map((line) => `- ${line}`).join("\n")}`,
		};
	}
	return {
		ok: true,
		message: `${companionFile} mirrors ${realFile} on both events (${sortedReal.join(", ")})`,
	};
}

/** A workflow that needs no companion must filter no paths on pull_request. */
export function assertNoPathFilterOnPullRequest(
	workflows: readonly WorkflowSummary[],
	file: string,
): AssertionResult {
	const workflow = workflows.find((entry) => entry.file === file);
	if (workflow === undefined) {
		return { ok: false, message: `${file} is missing.` };
	}
	if (workflow.pullRequest === null) {
		return {
			ok: false,
			message: `${file} has no pull_request trigger, so the check it reports is never produced on a pull request.`,
		};
	}
	const { paths, pathsIgnore } = workflow.pullRequest;
	if (paths !== null || pathsIgnore !== null) {
		return {
			ok: false,
			message: `${file} filters paths on pull_request (paths=${JSON.stringify(paths)}, paths-ignore=${JSON.stringify(pathsIgnore)}). It has no doc-only companion, so every pull request the filter excludes gets no report for the required check it provides -- and cannot merge.`,
		};
	}
	return {
		ok: true,
		message: `${file} filters no paths on pull_request, so it reports on every one`,
	};
}
