/**
 * Exit-code controls for the replay gate's CLI.
 *
 * THE SWEEP DOES NOT REACH THIS FILE EITHER, and that is load-bearing: review
 * showed that changing `process.exit(1)` to `process.exit(0)` in `finish` makes
 * the replay gate report GREEN on a 246-of-348 replay while the mutation sweep
 * still reports a clean sweep. The assertions were
 * covered; the thing that turns an assertion into a verdict was not.
 *
 * Spawns the real CLI, because the exit code IS the contract with the workflow.
 */
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const CLI = "scripts/assert-migration-replay.ts";

function run(
	args: readonly string[],
	stdin = "",
): { status: number; out: string } {
	const result = spawnSync("bun", [CLI, ...args], {
		cwd: process.cwd(),
		encoding: "utf8",
		input: stdin,
	});
	return {
		status: result.status ?? -1,
		out: `${result.stdout}${result.stderr}`,
	};
}

const CORRECT_CAST = [
	"e2e-admin@tenantflow.app|true|active|1",
	"e2e-owner-a@tenantflow.app|false|active|1",
	"e2e-owner-b@tenantflow.app|false|active|1",
].join("\n");

/** What the replay's billing-insights fixture printed (see the assertions' tests). */
const BILLING_LINE =
	'{"execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a": {"mrr": 2500, "churnRate": 0.00, "creditTotal": -100.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 1185.50, "chargedTotal": 4225.50, "lateFeeTotal": 115.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3440.00, "rentChargedTotal": 3500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 390.50, "lateFeeChargedTotal": 135.00}, "owner_b": {"mrr": 700, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 1, "unpaidCount": 2, "unpaidTotal": 720.00, "chargedTotal": 720.00, "lateFeeTotal": 20.00, "openingTotal": 0, "totalRevenue": 8400, "collectedTotal": 0, "rentChargedTotal": 700.00, "creditBalanceTotal": 0, "manualChargedTotal": 0, "lateFeeChargedTotal": 20.00}, "owner_a_february": {"mrr": 2500, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 960.50, "chargedTotal": 1360.50, "lateFeeTotal": 110.00, "openingTotal": 0, "totalRevenue": 30000, "collectedTotal": 400.00, "rentChargedTotal": 1000.00, "creditBalanceTotal": 0, "manualChargedTotal": 250.50, "lateFeeChargedTotal": 110.00}, "owner_a_as_of_march": {"mrr": 2500, "churnRate": 0.00, "creditTotal": -100.00, "tenantCount": 2, "unpaidCount": 4, "unpaidTotal": 145.50, "chargedTotal": 4260.50, "lateFeeTotal": 150.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 4515.00, "rentChargedTotal": 3500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 390.50, "lateFeeChargedTotal": 170.00}, "owner_a_as_of_january": {"mrr": 2500, "churnRate": 0.00, "creditTotal": 0, "tenantCount": 2, "unpaidCount": 1, "unpaidTotal": 360.00, "chargedTotal": 3000.00, "lateFeeTotal": 40.00, "openingTotal": 300.00, "totalRevenue": 30000, "collectedTotal": 3040.00, "rentChargedTotal": 2500.00, "creditBalanceTotal": 400.00, "manualChargedTotal": 140.00, "lateFeeChargedTotal": 60.00}, "guard_refuses_another_owner": true}';

describe("exit codes", () => {
	it("exits 0 and annotates nothing when the chain is complete", () => {
		const { status, out } = run(["applied", "348", "348"]);
		expect(status).toBe(0);
		expect(out).not.toContain("::error::");
	});

	it("exits 1 with an error annotation on an incomplete replay", () => {
		const { status, out } = run(["applied", "348", "246"]);
		expect(status).toBe(1);
		expect(out).toContain("::error::");
		expect(out).toContain("246 of 348");
	});

	it("exits 1 when the count could not be read", () => {
		expect(run(["applied", "348", ""]).status).toBe(1);
	});

	it("exits 1 on zero migration files rather than passing vacuously", () => {
		expect(run(["applied", "0", "0"]).status).toBe(1);
	});

	it("exits 0 when the Stripe FDW steps skipped", () => {
		expect(run(["no-network", "1", "0", "0"]).status).toBe(0);
	});

	it("exits 1 when a migration created the Stripe server", () => {
		expect(run(["no-network", "1", "1", "0"]).status).toBe(1);
	});

	it("exits 0 on the correct seeded cast, read from stdin", () => {
		const { status, out } = run(["test-cast"], `${CORRECT_CAST}\n`);
		expect(status).toBe(0);
		expect(out).toContain("the test cast is correct");
	});

	it("exits 1 on the t/f spelling, naming psql's || rendering", () => {
		const tf = CORRECT_CAST.replace("|true|", "|t|").replaceAll(
			"|false|",
			"|f|",
		);
		const { status, out } = run(["test-cast"], `${tf}\n`);
		expect(status).toBe(1);
		expect(out).toContain("concatenated with `||`");
	});

	it("exits 1 on empty stdin rather than treating no rows as no problem", () => {
		expect(run(["test-cast"], "").status).toBe(1);
	});

	it("exits 0 on the billing-insights line the replayed stack printed", () => {
		const { status, out } = run(["billing-insights"], `${BILLING_LINE}\n`);
		expect(status).toBe(0);
		expect(out).not.toContain("::error::");
	});

	it("exits 1 on the hard-coded zeros, with an error annotation", () => {
		const zeros = BILLING_LINE.replace('"unpaidCount": 4', '"unpaidCount": 0')
			.replace('"unpaidTotal": 1185.50', '"unpaidTotal": 0')
			.replace('"lateFeeTotal": 115.00', '"lateFeeTotal": 0');
		const { status, out } = run(["billing-insights"], `${zeros}\n`);
		expect(status).toBe(1);
		expect(out).toContain("::error::");
		expect(out).toContain("hard-coded body");
	});

	it("exits 1 when the billing-insights fixture printed nothing", () => {
		expect(run(["billing-insights"], "").status).toBe(1);
	});

	it("exits 2 on misuse, which is neither a pass nor a gate failure", () => {
		expect(run(["applied", "348"]).status).toBe(2);
		expect(run(["no-network", "1", "0"]).status).toBe(2);
		expect(run(["nonsense"]).status).toBe(2);
		expect(run([]).status).toBe(2);
	});

	it("prints the usage text on misuse", () => {
		expect(run(["nonsense"]).out).toContain(
			"bun scripts/assert-migration-replay.ts",
		);
	});
});
