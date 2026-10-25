/**
 * Negative controls for the platform-config drift gate.
 *
 * This gate exists because "Deploy to production" was on in Supabase while
 * CLAUDE.md said migrations are never applied on merge, and nothing could tell.
 * A gate written to catch that is worth exactly as much as the proof that it
 * fails when the condition returns -- so every assertion here is fed the live
 * state recorded on 2026-10-25 and then the drifted version of it.
 */
import { describe, expect, it } from "vitest";
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
	REQUIRED_CHECK_CONTEXTS,
} from "./platform-config-assertions";

/** `GET /branches/main` as it answered on 2026-10-25. */
const LIVE_BRANCH: BranchSummary = {
	protected: true,
	protection: {
		enabled: true,
		required_status_checks: {
			contexts: ["checks", "e2e-smoke", "rls-security"],
			enforcement_level: "non_admins",
		},
	},
};

/** The admin-only endpoint, as it answered for a user token the same day. */
const LIVE_PROTECTION: BranchProtection = {
	allow_force_pushes: { enabled: false },
	allow_deletions: { enabled: false },
};

const LIVE_CONTEXTS = LIVE_BRANCH.protection?.required_status_checks?.contexts;

describe("assertProtectionEnforced", () => {
	it("passes on the live branch", () => {
		expect(assertProtectionEnforced(LIVE_BRANCH).ok).toBe(true);
	});

	it("fails when main is not protected at all", () => {
		const result = assertProtectionEnforced({ protected: false });
		expect(result.ok).toBe(false);
		expect(result.message).toContain("not a protected branch");
	});

	it("fails when the enforcement level drifts from what is documented", () => {
		const result = assertProtectionEnforced({
			...LIVE_BRANCH,
			protection: {
				enabled: true,
				required_status_checks: { contexts: [], enforcement_level: "everyone" },
			},
		});
		expect(result.ok).toBe(false);
		// Including a tightening: undocumented is undocumented.
		expect(result.message).toContain("DOCUMENTED_ADMIN_ENFORCEMENT");
	});

	it("fails rather than passes when the response shape is unreadable", () => {
		expect(assertProtectionEnforced({}).ok).toBe(false);
	});
});

describe("assertRequiredChecks", () => {
	it("passes on the documented set", () => {
		const result = assertRequiredChecks(LIVE_CONTEXTS);
		expect(result.ok).toBe(true);
	});

	it("is checking a non-empty list", () => {
		// Guards the guard: an empty expectation would make every protection
		// state pass.
		expect(REQUIRED_CHECK_CONTEXTS.length).toBeGreaterThan(0);
	});

	it("fails when a required check is dropped", () => {
		const result = assertRequiredChecks(["checks", "e2e-smoke"]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("no longer required");
		expect(result.message).toContain("rls-security");
	});

	it("fails when a check nobody documented becomes required", () => {
		const result = assertRequiredChecks([
			...REQUIRED_CHECK_CONTEXTS,
			"some-new-job",
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("some-new-job");
	});

	it("fails when protection requires nothing", () => {
		const result = assertRequiredChecks(null);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("no status checks at all");
	});
});

describe("assertHistoryProtected", () => {
	it("passes when force pushes and deletion are blocked", () => {
		expect(assertHistoryProtected(LIVE_PROTECTION).ok).toBe(true);
	});

	it("fails when force pushes are allowed", () => {
		const result = assertHistoryProtected({
			...LIVE_PROTECTION,
			allow_force_pushes: { enabled: true },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("force pushes");
	});

	it("fails when deletion is allowed", () => {
		const result = assertHistoryProtected({
			...LIVE_PROTECTION,
			allow_deletions: { enabled: true },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("deletion");
	});

	it("fails rather than passes when the shape is unreadable", () => {
		const result = assertHistoryProtected({});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("unverified rather than satisfied");
	});
});

describe("assertSupabaseHasNoProductionAuthority", () => {
	/** What main's commits look like with the production branch cleared. */
	const SKIPPED: readonly CommitCheckRun[] = [
		{
			sha: "754c91802acc97ec96ef939b7eceedcd8893a0cb",
			app: "supabase",
			name: "Supabase Preview",
			conclusion: "skipped",
		},
	];

	it("passes when every Supabase check run skipped", () => {
		const result = assertSupabaseHasNoProductionAuthority(5, SKIPPED);
		expect(result.ok).toBe(true);
	});

	it("passes when the integration posts nothing at all", () => {
		expect(assertSupabaseHasNoProductionAuthority(5, []).ok).toBe(true);
	});

	it("fails on the state that actually shipped: a check run that executed", () => {
		// 25cef7b2b, 2026-10-25 06:09Z, before the production branch was cleared.
		const result = assertSupabaseHasNoProductionAuthority(5, [
			{
				sha: "25cef7b2b326b237d48c32194932e318b21ed4d0",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("Deploy to production");
		// The disable control is not where it looks like it should be, so the
		// message has to say where it is.
		expect(result.message).toContain("Project Settings -> Integrations");
	});

	it("fails on a successful Supabase run too, not only a failing one", () => {
		// A green Supabase check is WORSE: it means migrations were applied.
		const result = assertSupabaseHasNoProductionAuthority(5, [
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "success",
			},
		]);
		expect(result.ok).toBe(false);
	});

	it("ignores check runs from every other app", () => {
		const result = assertSupabaseHasNoProductionAuthority(5, [
			{
				sha: "abc1234567",
				app: "github-actions",
				name: "checks",
				conclusion: "success",
			},
			...SKIPPED,
		]);
		expect(result.ok).toBe(true);
	});

	it("refuses to pass vacuously when no commits were examined", () => {
		const result = assertSupabaseHasNoProductionAuthority(0, []);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("proves nothing");
	});
});

describe("assertVercelConfigDeclaresMainOnly", () => {
	it("passes on an explicit main plus a false catch-all", () => {
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { main: true, "**": false } },
		});
		expect(result.ok).toBe(true);
	});

	it("fails on the no-op this repo actually shipped", () => {
		// `{"main": true}` reads like "main only" and restricts nothing: any
		// unspecified branch defaults to true.
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { main: true } },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("defaults to TRUE");
	});

	it("fails when the catch-all would also stop main", () => {
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { "**": false } },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("`main` is not explicitly true");
	});

	it("fails when git.deploymentEnabled is absent", () => {
		expect(assertVercelConfigDeclaresMainOnly({}).ok).toBe(false);
	});

	it("fails on the blanket boolean form, which also disables main", () => {
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: false },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("every branch including main");
	});
});

describe("assertVercelDeploysOnlyMain", () => {
	const MAIN_DEPLOYED = [
		{ sha: "754c91802acc97ec96ef939b7eceedcd8893a0cb", contexts: ["Vercel"] },
		{ sha: "96f408efecd51362b0b189ea154689e31287e2ef", contexts: ["Vercel"] },
	];

	it("passes when main deploys and no PR head does", () => {
		const result = assertVercelDeploysOnlyMain({
			mainCommits: MAIN_DEPLOYED,
			pullRequestHeads: [
				{
					number: 1037,
					sha: "2913b39fd33557f13aad3aa97d06ff7f73fb2e06",
					contexts: [],
				},
			],
		});
		expect(result.ok).toBe(true);
	});

	it("passes with no open pull requests, and says so", () => {
		const result = assertVercelDeploysOnlyMain({
			mainCommits: MAIN_DEPLOYED,
			pullRequestHeads: [],
		});
		expect(result.ok).toBe(true);
		expect(result.message).toContain("no open pull requests");
	});

	it("fails when a PR head got a preview deployment", () => {
		const result = assertVercelDeploysOnlyMain({
			mainCommits: MAIN_DEPLOYED,
			pullRequestHeads: [
				{
					number: 1037,
					sha: "2913b39fd33557f13aad3aa97d06ff7f73fb2e06",
					contexts: ["Vercel"],
				},
			],
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("#1037");
		expect(result.message).toContain("PRODUCTION Supabase");
	});

	it("fails when main has stopped deploying", () => {
		// The failure mode a `**: false` catch-all could introduce if Vercel did
		// not OR the matching rules the way its docs say it does.
		const result = assertVercelDeploysOnlyMain({
			mainCommits: [{ sha: "754c91802a", contexts: ["checks"] }],
			pullRequestHeads: [],
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("stopped deploying");
	});

	it("refuses to pass vacuously with no main commits", () => {
		const result = assertVercelDeploysOnlyMain({
			mainCommits: [],
			pullRequestHeads: [],
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("proves nothing");
	});

	it("matches the Vercel context case-insensitively and by prefix", () => {
		const result = assertVercelDeploysOnlyMain({
			mainCommits: MAIN_DEPLOYED,
			pullRequestHeads: [
				{ number: 9, sha: "deadbeef00", contexts: ["vercel - tenant-flow"] },
			],
		});
		expect(result.ok).toBe(false);
	});
});
