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
