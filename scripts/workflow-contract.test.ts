/**
 * Positive controls against the real workflows, and negative controls against
 * mutated copies.
 *
 * THE MUTATIONS ARE THE POINT. Earlier rounds of this work claimed "seven
 * mutations, applied to a copy, are each caught" -- true when it was run, but
 * the runner was a shell script in a scratch directory, so the claim had
 * nothing behind it a reader could execute, and one version of that script
 * restored with `git checkout -- .github/workflows` and silently discarded
 * uncommitted edits. Each mutation is a committed test now, operating on
 * fixtures in a temp directory: nothing in the repo is ever modified, and the
 * controls run in `checks` on every pull request.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { REQUIRED_CHECK_CONTEXTS } from "./platform-config-assertions";
import {
	assertDocOnlyCompanionMirrors,
	assertNoPathFilterOnPullRequest,
	assertRequiredCheckIsAlwaysReported,
	collectWorkflows,
} from "./workflow-contract";

const WORKFLOWS = join(process.cwd(), ".github", "workflows");
const temporary: string[] = [];

afterAll(() => {
	for (const dir of temporary) rmSync(dir, { recursive: true, force: true });
});

/** A workflow directory on disk, built from literal file bodies. */
function fixture(files: Readonly<Record<string, string>>): string {
	const dir = mkdtempSync(join(tmpdir(), "workflow-contract-"));
	temporary.push(dir);
	for (const [name, body] of Object.entries(files)) {
		writeFileSync(join(dir, name), body);
	}
	return dir;
}

const REAL = `name: CI
on:
  push:
    branches: [main]
    paths-ignore:
      - "**.md"
      - "docs/**"
  pull_request:
    branches: [main]
    paths-ignore:
      - "**.md"
      - "docs/**"
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - run: echo
  e2e-smoke:
    runs-on: ubuntu-latest
    steps:
      - run: echo
`;

const COMPANION = `name: CI
on:
  push:
    branches: [main]
    paths:
      - "**.md"
      - "docs/**"
  pull_request:
    branches: [main]
    paths:
      - "**.md"
      - "docs/**"
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - run: echo
  e2e-smoke:
    runs-on: ubuntu-latest
    steps:
      - run: echo
`;

const UNFILTERED = `name: RLS Security Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  rls-security:
    runs-on: ubuntu-latest
    steps:
      - run: echo
`;

const base = () => ({
	"ci-cd.yml": REAL,
	"ci-cd-doc-only.yml": COMPANION,
	"rls-security-tests.yml": UNFILTERED,
});

const mirrorOf = (dir: string) =>
	assertDocOnlyCompanionMirrors(
		collectWorkflows(dir),
		"ci-cd.yml",
		"ci-cd-doc-only.yml",
	);
const reportedIn = (dir: string, context: string) =>
	assertRequiredCheckIsAlwaysReported(collectWorkflows(dir), context);

describe("the real workflows satisfy the contract", () => {
	const workflows = collectWorkflows(WORKFLOWS);

	it("collected workflows to check", () => {
		// Without this, a parser that matched nothing would make every assertion
		// below pass on an empty list.
		expect(workflows.length).toBeGreaterThan(0);
		expect(REQUIRED_CHECK_CONTEXTS.length).toBeGreaterThan(0);
		expect(workflows.some((workflow) => workflow.pullRequest !== null)).toBe(
			true,
		);
	});

	it.each(REQUIRED_CHECK_CONTEXTS)(
		"%s is reported on every pull request",
		(context) => {
			const result = reportedIn(WORKFLOWS, context);
			expect(result.ok, result.message).toBe(true);
		},
	);

	it("ci-cd-doc-only.yml mirrors ci-cd.yml", () => {
		const result = mirrorOf(WORKFLOWS);
		expect(result.ok, result.message).toBe(true);
	});

	it("rls-security-tests.yml filters no paths, which is why it needs no companion", () => {
		const result = assertNoPathFilterOnPullRequest(
			workflows,
			"rls-security-tests.yml",
		);
		expect(result.ok, result.message).toBe(true);
	});
});

describe("the fixtures satisfy it too, so the mutations below mean something", () => {
	const dir = fixture(base());

	it("mirrors", () => {
		expect(mirrorOf(dir).ok, mirrorOf(dir).message).toBe(true);
	});

	it.each(["checks", "e2e-smoke"])("reports %s", (context) => {
		expect(reportedIn(dir, context).ok).toBe(true);
	});

	it("reports rls-security through an unfiltered workflow", () => {
		const result = reportedIn(dir, "rls-security");
		expect(result.ok).toBe(true);
		expect(result.message).toContain("no path filter");
	});
});

describe("mutations the contract must catch", () => {
	it("the real CI's push paths-ignore gains an entry the companion lacks", () => {
		const dir = fixture({
			...base(),
			"ci-cd.yml": REAL.replace(
				"  pull_request:",
				'      - "NEWTHING/**"\n  pull_request:',
			),
		});
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("push path lists are not complements");
	});

	it("the companion drops a pull_request path the real CI ignores", () => {
		const dir = fixture({
			...base(),
			"ci-cd-doc-only.yml": COMPANION.replace('      - "docs/**"\n', ""),
		});
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("push path lists are not complements");
	});

	it("a job is added to the real CI with no twin", () => {
		const dir = fixture({
			...base(),
			"ci-cd.yml": `${REAL}  brand-new-job:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n`,
		});
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("brand-new-job");
	});

	it("both push path LISTS are deleted", () => {
		const dir = fixture({
			...base(),
			"ci-cd.yml": REAL.replace(
				'    paths-ignore:\n      - "**.md"\n      - "docs/**"\n  pull_request:',
				"  pull_request:",
			),
			"ci-cd-doc-only.yml": COMPANION.replace(
				'    paths:\n      - "**.md"\n      - "docs/**"\n  pull_request:',
				"  pull_request:",
			),
		});
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("declares no push paths-ignore");
	});

	it("the whole push TRIGGER is deleted from both", () => {
		// The case the previous version missed: an absent `push:` key made both
		// sides `undefined`, a `.not.toBeNull()` guard on the LISTS passed, and
		// the lockstep then compared [] to [] and proved nothing.
		const withoutPush = (body: string) =>
			body.replace(
				/on:\n {2}push:\n(?: {4}.*\n| {6}.*\n)* {2}pull_request:/,
				"on:\n  pull_request:",
			);
		const dir = fixture({
			...base(),
			"ci-cd.yml": withoutPush(REAL),
			"ci-cd-doc-only.yml": withoutPush(COMPANION),
		});
		expect(collectWorkflows(dir)[0]?.push).toBeNull();
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("push trigger is absent entirely");
	});

	it("a name: is added to the checks job, changing the check name it reports", () => {
		// Branch protection matches the REPORTED name. codeql.yml already proves
		// key and name diverge in this repo.
		const dir = fixture({
			...base(),
			"ci-cd.yml": REAL.replace(
				"  checks:\n",
				"  checks:\n    name: Compile checks\n",
			),
		});
		expect(reportedIn(dir, "checks").ok).toBe(false);
		expect(reportedIn(dir, "checks").message).toContain("cannot merge");
		const result = mirrorOf(dir);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("Compile checks");
	});

	it("a required job is renamed on both sides", () => {
		const renamed = (body: string) =>
			body.replace("  e2e-smoke:\n", "  e2e-renamed:\n");
		const dir = fixture({
			...base(),
			"ci-cd.yml": renamed(REAL),
			"ci-cd-doc-only.yml": renamed(COMPANION),
		});
		// The pair still mirrors; what breaks is the required check.
		expect(mirrorOf(dir).ok).toBe(true);
		const result = reportedIn(dir, "e2e-smoke");
		expect(result.ok).toBe(false);
		expect(result.message).toContain("waits forever");
	});

	it("the unfiltered workflow gains a paths filter", () => {
		const dir = fixture({
			...base(),
			"rls-security-tests.yml": UNFILTERED.replace(
				"  pull_request:\n    branches: [main]\n",
				"  pull_request:\n    branches: [main]\n    paths:\n      - supabase/**\n",
			),
		});
		const result = assertNoPathFilterOnPullRequest(
			collectWorkflows(dir),
			"rls-security-tests.yml",
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("cannot merge");
		// And the required check it provides is no longer reported on every PR.
		expect(reportedIn(dir, "rls-security").ok).toBe(false);
	});

	it("the companion is deleted outright", () => {
		const files = base();
		const result = assertDocOnlyCompanionMirrors(
			collectWorkflows(fixture({ "ci-cd.yml": files["ci-cd.yml"] })),
			"ci-cd.yml",
			"ci-cd-doc-only.yml",
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("is missing");
	});

	it("an empty directory fails every assertion instead of passing vacuously", () => {
		const dir = fixture({});
		expect(collectWorkflows(dir)).toEqual([]);
		expect(reportedIn(dir, "checks").ok).toBe(false);
		expect(reportedIn(dir, "checks").message).toContain("proves nothing");
		expect(mirrorOf(dir).ok).toBe(false);
		expect(
			assertNoPathFilterOnPullRequest(collectWorkflows(dir), "x.yml").ok,
		).toBe(false);
	});
});

describe("the three legal spellings of on:, and both extensions", () => {
	it("reads a filterless trigger written as a bare scalar", () => {
		const dir = fixture({
			"x.yml":
				"name: X\non: pull_request\njobs:\n  rls-security:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n",
		});
		const result = reportedIn(dir, "rls-security");
		expect(result.ok, result.message).toBe(true);
	});

	it("reads a filterless trigger written as a list", () => {
		const dir = fixture({
			"x.yml":
				"name: X\non: [push, pull_request]\njobs:\n  rls-security:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n",
		});
		const result = reportedIn(dir, "rls-security");
		expect(result.ok, result.message).toBe(true);
	});

	it("reads a trigger declared with an empty body", () => {
		const dir = fixture({
			"x.yml":
				"name: X\non:\n  pull_request:\njobs:\n  rls-security:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n",
		});
		expect(collectWorkflows(dir)[0]?.pullRequest).toEqual({
			paths: null,
			pathsIgnore: null,
		});
		expect(reportedIn(dir, "rls-security").ok).toBe(true);
	});

	it("collects .yaml as well as .yml, because GitHub accepts both", () => {
		const dir = fixture({
			"a.yaml":
				"name: A\non: pull_request\njobs:\n  only-here:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo\n",
		});
		expect(collectWorkflows(dir).map((workflow) => workflow.file)).toEqual([
			"a.yaml",
		]);
		expect(reportedIn(dir, "only-here").ok).toBe(true);
	});
});
