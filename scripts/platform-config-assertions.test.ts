/**
 * Negative controls for the platform-config drift gate.
 *
 * This gate exists because "Deploy to production" was on in Supabase while
 * CLAUDE.md said migrations are never applied on merge, and nothing could tell.
 * A gate written to catch that is worth exactly as much as the proof that it
 * fails when the condition returns -- so every assertion here is fed the live
 * state recorded on 2026-10-25 and then the drifted version of it.
 *
 * Two assertions read a PROXY rather than the setting itself, and the controls
 * pin the limits of each proxy as carefully as its successes: `skipped` on a
 * Supabase check run is silence rather than proof, and a main commit with no
 * Vercel status is "not yet" rather than "never".
 */
import { describe, expect, it } from "vitest";
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
	REQUIRED_CHECK_CONTEXTS,
	SUPABASE_AUTHORITY_REVOKED_AT,
} from "./platform-config-assertions";

/** Fixed evaluation time, so the Supabase window bounds are deterministic. */
const NOW = new Date("2026-10-25T16:30:00Z");

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
			protected: true,
			protection: {
				enabled: true,
				required_status_checks: { contexts: [], enforcement_level: "everyone" },
			},
		});
		expect(result.ok).toBe(false);
		// Including a tightening: undocumented is undocumented.
		expect(result.message).toContain("DOCUMENTED_ADMIN_ENFORCEMENT");
		expect(result.message).toContain("everyone");
	});

	it("fails rather than passes when the response shape is unreadable", () => {
		expect(assertProtectionEnforced({}).ok).toBe(false);
	});
});

describe("assertRequiredChecks", () => {
	it("passes on the documented set", () => {
		expect(assertRequiredChecks(LIVE_CONTEXTS).ok).toBe(true);
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

	it("reports UNVERIFIED on an unreadable 200, matching the 403 path", () => {
		// "I do not understand this response" is the same epistemic state as the
		// 403 the caller handles. Returning opposite verdicts -- and opposite
		// exit codes -- for one state is what this module's thesis forbids.
		const result = assertHistoryProtected({});
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("unchecked rather than broken");
	});
});

describe("assertSupabaseBranchingHasNoGitLink", () => {
	it("passes on the live state after the production branch was cleared", () => {
		const result = assertSupabaseBranchingHasNoGitLink([
			{ name: "main", git_branch: "", is_default: true },
		]);
		expect(result.ok).toBe(true);
	});

	it("fails on the state that actually shipped for four months", () => {
		// git_branch held "main" while "Deploy to production" was on.
		const result = assertSupabaseBranchingHasNoGitLink([
			{ name: "main", git_branch: "main", is_default: true },
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("deploy to production on merge again");
		// The disable control is not where it looks like it should be, so the
		// message has to say where it is.
		expect(result.message).toContain("Project Settings -> Integrations");
	});

	it("fails on a link to any branch, not only main", () => {
		const result = assertSupabaseBranchingHasNoGitLink([
			{ name: "main", git_branch: "", is_default: true },
			{ name: "preview", git_branch: "develop" },
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("preview -> develop");
	});

	it("treats a null git_branch as unbound", () => {
		expect(
			assertSupabaseBranchingHasNoGitLink([{ name: "main", git_branch: null }])
				.ok,
		).toBe(true);
	});

	it("refuses to pass vacuously on an empty response", () => {
		const result = assertSupabaseBranchingHasNoGitLink([]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("no rows");
	});
});

describe("assertSupabaseDidNotActOnProduction", () => {
	const skipped = (sha: string, completedAt: string): CommitCheckRun => ({
		sha,
		app: "supabase",
		name: "Supabase Preview",
		conclusion: "skipped",
		completedAt,
	});
	const check = (
		runs: readonly CommitCheckRun[],
		extra: { readonly truncated?: boolean } = {},
	) => assertSupabaseDidNotActOnProduction(20, runs, { now: NOW, ...extra });

	it("passes when every in-window run skipped, while SAYING that is not proof", () => {
		// d0077d3ac concluded `skipped` on a merge to main TEN HOURS before the
		// production branch was cleared, with a summary byte-identical to the
		// post-fix commits. So this pass must not claim the setting is off.
		const result = check([
			skipped(
				"754c91802acc97ec96ef939b7eceedcd8893a0cb",
				"2026-10-25T08:08:17Z",
			),
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBeUndefined();
		expect(result.message).toContain(
			"does not establish that the setting is off",
		);
	});

	it("fails on a run that concluded failure -- the integration acting", () => {
		const result = check([
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: "2026-10-25T16:00:00Z",
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("ACTED");
		expect(result.message).toContain("Project Settings -> Integrations");
	});

	it("fails on a successful run too, which is the worse case", () => {
		// A green Supabase run means migrations were applied to production.
		const result = check([
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "success",
				completedAt: "2026-10-25T16:00:00Z",
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("migrations were applied");
	});

	it("ignores the pre-fix era, feeding two of this repo's four real failures", () => {
		// 18ff5f9a8 at 06:48:21Z and 25cef7b2b at 06:10:25Z both concluded
		// `failure` BEFORE the production branch was cleared at 07:11:58Z.
		// Reporting those as a live regression is reporting a resolved event.
		const result = check([
			{
				sha: "18ff5f9a8ee570a4d0f01ebe18c014bbfd12bd3c",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: "2026-10-25T06:48:21Z",
			},
			{
				sha: "25cef7b2b326b237d48c32194932e318b21ed4d0",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: "2026-10-25T06:10:25Z",
			},
			skipped(
				"754c91802acc97ec96ef939b7eceedcd8893a0cb",
				"2026-10-25T08:08:17Z",
			),
		]);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("2 older run(s) ignored");
	});

	it("still catches a failure run one second after the revocation", () => {
		// The bound must exclude the pre-fix era and nothing else.
		const justAfter = new Date(
			Date.parse(SUPABASE_AUTHORITY_REVOKED_AT) + 1000,
		).toISOString();
		const result = check([
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: justAfter,
			},
		]);
		expect(result.ok).toBe(false);
	});

	it("clears itself once an acting run ages past the freshness window", () => {
		// A re-enable that was caught and fixed must stop being reported, rather
		// than reddening the gate for as long as the commit stays in the window.
		const result = assertSupabaseDidNotActOnProduction(
			20,
			[
				{
					sha: "abc1234567",
					app: "supabase",
					name: "Supabase Preview",
					conclusion: "failure",
					completedAt: "2026-10-25T16:00:00Z",
				},
			],
			{ now: new Date("2026-11-05T16:00:00Z"), freshnessHours: 168 },
		);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("2026-10-29T16:00:00.000Z");
	});

	it("does not call an in-progress run an acting one", () => {
		// `conclusion: null` means it has concluded nothing yet. Failing here
		// would redden the gate with a wrong diagnosis whenever the schedule
		// overlaps a merge.
		const result = check([
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: null,
				completedAt: null,
			},
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("still in progress");
	});

	it("still reports a concluded run when another is in progress", () => {
		const result = check([
			{
				sha: "aaa1111111",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: null,
				completedAt: null,
			},
			{
				sha: "bbb2222222",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: "2026-10-25T16:00:00Z",
			},
		]);
		expect(result.ok).toBe(false);
	});

	it("reports UNVERIFIED, not a pass, when no Supabase run appears at all", () => {
		// The app posts a run on every commit here, so an empty set means the
		// slug changed or the app went away -- not that the invariant holds.
		const result = check([
			{
				sha: "abc1234567",
				app: "github-actions",
				name: "checks",
				conclusion: "success",
				completedAt: "2026-10-25T16:00:00Z",
			},
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("SUPABASE_APP_SLUG");
	});

	it("fails when the check-run page was truncated", () => {
		const result = check([skipped("abc1234567", "2026-10-25T16:00:00Z")], {
			truncated: true,
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("truncated");
	});

	it("reports UNVERIFIED on an empty window, which a `since` fetch makes routine", () => {
		// This was a failure when the caller handed over a fixed window of the
		// last N commits, where zero could only mean a broken listing. With
		// `since=<this floor>` it is a quiet week, and this repo's main has five
		// inter-commit gaps over 168h.
		const result = assertSupabaseDidNotActOnProduction(0, [], { now: NOW });
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("nothing to read");
	});

	it("returns a result rather than throwing when the bound is not a date", () => {
		// A NaN floor excludes every run and then throws RangeError out of
		// `new Date(NaN).toISOString()`, past the layer that turns a failure
		// into an annotation.
		//
		// The input needs a ZONE and still be unparseable, or the zone check
		// below fires first and this branch is unreachable -- which is exactly
		// what the mutation sweep reported when the two checks were added in
		// that order with only a zoneless fixture.
		expect(Number.isNaN(Date.parse("not-a-date+00:00"))).toBe(true);
		const result = assertSupabaseDidNotActOnProduction(
			20,
			[skipped("abc1234567", "2026-10-25T16:00:00Z")],
			{ now: NOW, revokedAt: "not-a-date+00:00" },
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("is not a date");
	});

	it("rejects a zoneless bound, which PARSES and silently moves the floor", () => {
		// The hazard a NaN check cannot see: Date.parse reads
		// "2026-10-25T07:11:58" as LOCAL time -- measured as 12:11:58Z on a
		// UTC-5 box -- so the floor shifts by the machine's offset and five
		// hours of acting runs disappear. It is a valid number, so the
		// Number.isNaN branch never fires.
		expect(Number.isNaN(Date.parse("2026-10-25T07:11:58"))).toBe(false);
		const result = assertSupabaseDidNotActOnProduction(
			20,
			[skipped("abc1234567", "2026-10-25T16:00:00Z")],
			{ now: NOW, revokedAt: "2026-10-25T07:11:58" },
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("no time zone");
	});

	it("accepts an offset bound, not only Z", () => {
		const result = assertSupabaseDidNotActOnProduction(
			20,
			[skipped("abc1234567", "2026-10-25T16:00:00Z")],
			{ now: NOW, revokedAt: "2026-10-25T02:11:58-05:00" },
		);
		expect(result.ok).toBe(true);
	});

	it("ignores concluded runs from every other app", () => {
		const result = check([
			{
				sha: "abc1234567",
				app: "github-actions",
				name: "checks",
				conclusion: "failure",
				completedAt: "2026-10-25T16:00:00Z",
			},
			skipped("abc1234567", "2026-10-25T16:00:00Z"),
		]);
		expect(result.ok).toBe(true);
	});

	it("treats an unparseable completion time as in-window rather than dropping it", () => {
		// Failing closed: a shape change must not silently remove runs from the
		// set this reads.
		const result = check([
			{
				sha: "abc1234567",
				app: "supabase",
				name: "Supabase Preview",
				conclusion: "failure",
				completedAt: "not-a-date",
			},
		]);
		expect(result.ok).toBe(false);
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

	it("fails when an extra truthy pattern hands previews back to a class of branches", () => {
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { main: true, "**": false, "feat/*": true } },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("feat/*");
		expect(result.message).toContain("PRODUCTION Supabase");
	});

	it("fails on an undocumented pattern even when it is false", () => {
		// Harmless today, but this gate's premise is that config matches the
		// documentation, and the fix is one line in either direction.
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { main: true, "**": false, "wip/*": false } },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("wip/*");
	});

	it("fails on a rule keyed like an Object prototype member", () => {
		// `pattern in documented` walks the prototype chain, so a branch rule
		// named `constructor` or `toString` would be treated as documented and
		// skipped by both loops -- a truthy extra rule reported as compliant.
		const result = assertVercelConfigDeclaresMainOnly({
			git: {
				deploymentEnabled: JSON.parse(
					'{"main":true,"**":false,"constructor":true}',
				) as Readonly<Record<string, boolean>>,
			},
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("constructor");
	});

	it("fails when the catch-all would also stop main", () => {
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: { "**": false } },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("`main` should be true");
	});

	it("fails when git.deploymentEnabled is absent", () => {
		expect(assertVercelConfigDeclaresMainOnly({}).ok).toBe(false);
	});

	it("returns a result rather than throwing on an explicit null", () => {
		// JSON can carry this, and a stack trace instead of an annotation is a
		// diagnosis defect even though the gate still goes red.
		const result = assertVercelConfigDeclaresMainOnly({
			git: { deploymentEnabled: null },
		});
		expect(result.ok).toBe(false);
		expect(result.message).toContain("declares no git.deploymentEnabled");
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
	const vercel = (state: string) => ({ context: "Vercel", state });
	/** Five minutes before NOW: inside the reporting grace. */
	const JUST_NOW = "2026-10-25T16:25:00Z";
	/** Six and a half hours before NOW: Vercel has had its chance. */
	const SETTLED = "2026-10-25T10:00:00Z";
	const OLDER = "2026-10-24T10:00:00Z";

	type Commit = {
		sha: string;
		committedAt: string;
		statuses: readonly { context: string; state: string }[];
	};
	const head = (
		number: number,
		sha: string,
		statuses: readonly { context: string; state: string }[],
	) => ({ number, sha, committedAt: SETTLED, statuses });
	const check = (
		mainCommits: readonly Commit[],
		pullRequestHeads: readonly (Commit & { number: number })[] = [],
	) => assertVercelDeploysOnlyMain({ mainCommits, pullRequestHeads, now: NOW });

	/**
	 * REAL API ORDER, AND THAT IS LOAD-BEARING. `GET /commits?sha=main` starts
	 * its walk at the requested sha, so main's tip is element 0. Every fixture
	 * below follows that: with them in ascending order instead, reading
	 * `mainCommits[mainCommits.length - 1]` -- which against the real ordering
	 * means "read the OLDEST commit" -- passed the whole suite.
	 *
	 * Here the tip deployed and an older commit in the window did not.
	 */
	const TIP_DEPLOYED: Commit[] = [
		{ sha: "tiptiptip1", committedAt: SETTLED, statuses: [vercel("success")] },
		{ sha: "oldoldold1", committedAt: OLDER, statuses: [] },
	];

	it("passes when main's tip deployed, whatever the older ones did", () => {
		const result = check(TIP_DEPLOYED, [head(1037, "2913b39fd3", [])]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBeUndefined();
		// The pass has to say what it could not see: Vercel deploys on push, so
		// a preview on a branch with no open PR is invisible here.
		expect(result.message).toContain("not visible to this check");
	});

	it("passes with no open pull request heads, and says so", () => {
		const result = check(TIP_DEPLOYED);
		expect(result.ok).toBe(true);
		expect(result.message).toContain("no open pull request heads");
	});

	it("reads element 0 when the tip did NOT deploy", () => {
		// Catches `mainCommits[length - 1]`: it would find the older success
		// here and pass.
		const result = check([
			{ sha: "tiptiptip1", committedAt: SETTLED, statuses: [] },
			{ sha: "oldoldold1", committedAt: OLDER, statuses: [vercel("success")] },
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("tiptiptip");
		expect(result.message).not.toContain("oldoldold");
	});

	it("reads element 0 when the tip DID deploy", () => {
		// The mirror: the only success is on the tip, so any form reading some
		// other element fails.
		const result = check([
			{
				sha: "tiptiptip1",
				committedAt: SETTLED,
				statuses: [vercel("success")],
			},
			{ sha: "oldoldold1", committedAt: OLDER, statuses: [] },
			{ sha: "oldoldold2", committedAt: "2026-10-23T10:00:00Z", statuses: [] },
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBeUndefined();
	});

	it("reads the tip even when a later committer date sits deeper in the window", () => {
		// A rebased or cherry-picked commit can carry any committer date, and a
		// committer-second tie is common here -- 106 of 6,940 historical windows,
		// 4 of them on real tips. ORDER decides which commit is the tip, not
		// date arithmetic, which is why the max-by-date reduce was removed.
		const result = check([
			{ sha: "tiptiptip1", committedAt: SETTLED, statuses: [] },
			{
				sha: "weirddate1",
				committedAt: JUST_NOW,
				statuses: [vercel("success")],
			},
			{
				sha: "tieditem01",
				committedAt: SETTLED,
				statuses: [vercel("success")],
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("tiptiptip");
	});

	it("FAILS when the tip never deployed although older commits did", () => {
		// THE STATE THAT USED TO PASS CLEANLY. Asking whether ANY of twenty
		// commits deployed is nearly always yes, so a merge that stopped main
		// deploying went green until the window rolled over.
		const result = check([
			{ sha: "newnewnew1", committedAt: SETTLED, statuses: [] },
			{ sha: "oldoldold1", committedAt: OLDER, statuses: [vercel("success")] },
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain(
			"it is the current tip that is not deploying",
		);
		expect(result.message).toContain("catch-all");
	});

	it("FAILS differently when nothing in the window deployed at all", () => {
		const result = check([
			{ sha: "newnewnew1", committedAt: SETTLED, statuses: [] },
			{ sha: "oldoldold1", committedAt: OLDER, statuses: [] },
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("PRODUCTION HAS STOPPED DEPLOYING");
	});

	it("FAILS toward the build log when the tip's build ran and did not succeed", () => {
		// A run of failed production builds leaves the site stale, and the
		// remedy is the deployment log, not vercel.json.
		const result = check([
			{
				sha: "newnewnew1",
				committedAt: SETTLED,
				statuses: [vercel("failure")],
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("The build ran and did not succeed");
		expect(result.message).toContain("it carries one in another state");
	});

	it("reports UNVERIFIED while the tip is inside the grace", () => {
		// Routine for a few minutes after a push. Calling that "production has
		// stopped deploying" would be a wrong diagnosis on a race.
		const result = check([
			{ sha: "newnewnew1", committedAt: JUST_NOW, statuses: [] },
			{ sha: "oldoldold1", committedAt: OLDER, statuses: [vercel("success")] },
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("may simply not have reported yet");
	});

	it("reports UNVERIFIED rather than failing on an unreadable commit time", () => {
		const result = check([
			{ sha: "newnewnew1", committedAt: "not-a-date", statuses: [] },
		]);
		expect(result.ok).toBe(true);
		expect(result.ok && result.unverified).toBe(true);
		expect(result.message).toContain("an unreadable time");
	});

	it("fails when a PR head got a preview deployment", () => {
		const result = check(TIP_DEPLOYED, [
			head(1037, "2913b39fd33557f13aad3aa97d06ff7f73fb2e06", [
				vercel("success"),
			]),
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("#1037");
		expect(result.message).toContain("PRODUCTION Supabase");
		// A commit status is never removed, so the message has to say how to
		// clear it or the gate looks permanently broken.
		expect(result.message).toContain("closed or its head is replaced");
	});

	it("fails on a FAILED preview too -- it still ran against production", () => {
		const result = check(TIP_DEPLOYED, [
			head(9, "deadbeef00", [vercel("failure")]),
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("failure");
	});

	it("reports a preview even while the tip has no status yet", () => {
		// The preview half must not be masked by the liveness half.
		const result = check(
			[{ sha: "newnewnew1", committedAt: JUST_NOW, statuses: [] }],
			[head(9, "deadbeef00", [vercel("success")])],
		);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("#9");
	});

	it("refuses to pass vacuously with no main commits", () => {
		const result = check([]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain("proves nothing");
	});

	it("matches the Vercel context case-insensitively and by prefix", () => {
		const result = check(TIP_DEPLOYED, [
			head(9, "deadbeef00", [
				{ context: "vercel - tenant-flow", state: "success" },
			]),
		]);
		expect(result.ok).toBe(false);
	});
});
