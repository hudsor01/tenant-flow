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

/** What the replay's property-performance fixture printed, and printed against
 * production's body (see the assertions' tests). */
const PERFORMANCE_LINE =
	'{"today": "2026-11-02", "execute": {"anon": false, "service_role": true, "authenticated": true}, "owner_a_30d": [{"timeframe": "2026-10-03/2026-11-02", "net_income": -119.75, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": -79.75, "occupancy_rate": 50.00, "total_expenses": 40.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 175.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 200.00, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_default": [{"timeframe": "2026-10-03/2026-11-02", "net_income": -119.75, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": -79.75, "occupancy_rate": 50.00, "total_expenses": 40.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 175.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 200.00, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2026-10-03/2026-11-02", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_limit_1": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 2550.25, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 2750.50, "occupancy_rate": 50.00, "total_expenses": 200.25}], "owner_a_tax_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 2550.25, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 2750.50, "occupancy_rate": 50.00, "total_expenses": 200.25}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 650.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 750.00, "occupancy_rate": 100.00, "total_expenses": 100.00}, {"timeframe": "2025-01-01/2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_b_tax_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 690.00, "property_id": "c1000000-0000-4000-8000-00000000b001", "property_name": "Bravo Place", "total_revenue": 700.00, "occupancy_rate": 100.00, "total_expenses": 10.00}], "owner_a_beta_2025": [{"timeframe": "2025-01-01/2025-12-31", "net_income": 650.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 750.00, "occupancy_rate": 100.00, "total_expenses": 100.00}], "backwards_range_sqlstate": "22023", "guard_refuses_another_owner": true}';
const PRODUCTION_PERFORMANCE_LINE =
	'{"today": "2026-11-02", "execute": {"anon": true, "service_role": true, "authenticated": true}, "owner_a_30d": [{"timeframe": "30d", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "30d", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "30d", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_default": [{"timeframe": "30d", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "30d", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "30d", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_a_limit_1": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}], "owner_a_tax_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -106.00, "property_id": "c1000000-0000-4000-8000-00000000a001", "property_name": "Alpha Court", "total_revenue": 0, "occupancy_rate": 50.00, "total_expenses": 106.00}, {"timeframe": "2025-01-01..2025-12-31", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}, {"timeframe": "2025-01-01..2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000a003", "property_name": "Delta Lot", "total_revenue": 0, "occupancy_rate": 0.00, "total_expenses": 0}], "owner_b_tax_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": 0, "property_id": "c1000000-0000-4000-8000-00000000b001", "property_name": "Bravo Place", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 0}], "owner_a_beta_2025": [{"timeframe": "2025-01-01..2025-12-31", "net_income": -25.00, "property_id": "c1000000-0000-4000-8000-00000000a002", "property_name": "Beta House", "total_revenue": 0, "occupancy_rate": 100.00, "total_expenses": 25.00}], "backwards_range_sqlstate": null, "guard_refuses_another_owner": true}';

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

	it("exits 0 on the property-performance line the replayed stack printed", () => {
		const { status, out } = run(
			["property-performance"],
			`${PERFORMANCE_LINE}\n`,
		);
		expect(status).toBe(0);
		expect(out).not.toContain("::error::");
	});

	it("exits 1 on production's property-performance rows, with an error annotation", () => {
		const { status, out } = run(
			["property-performance"],
			`${PRODUCTION_PERFORMANCE_LINE}\n`,
		);
		expect(status).toBe(1);
		expect(out).toContain("::error::");
		expect(out).toContain("hard-coded body before 20261102163709");
	});

	it("exits 1 when the property-performance fixture printed nothing", () => {
		expect(run(["property-performance"], "").status).toBe(1);
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
