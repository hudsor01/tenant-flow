/**
 * The mutation sweep's shards partition its rows.
 *
 * WHY. As one job the sweep outgrew its timeout (155 of 179 rows ran), so
 * `.github/workflows/mutation-sweep.yml` runs it as a matrix of shards. A
 * shard split can lose a row silently: a row no shard runs is a decision
 * point nothing breaks, and the run still reports every shard clean. So the
 * split is checked here, against the script's own listing mode
 * (`SWEEP_LIST=1`, which prints the rows a run would execute and touches
 * nothing) and against the workflow's real matrix.
 *
 * Spawns the real script: the shard arithmetic lives in bash.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = process.cwd();
const SCRIPT = join(ROOT, "scripts/mutation-sweep.sh");
const WORKFLOW = join(ROOT, ".github/workflows/mutation-sweep.yml");

interface Listing {
	readonly status: number | null;
	readonly output: string;
	/** `[row, label]` for every row the run would execute, in order. */
	readonly rows: ReadonlyArray<readonly [number, string]>;
}

/**
 * The script's listing under `env`. The sweep's own rows run this suite
 * inside a shard, so the inherited SWEEP_* variables are dropped first.
 */
function listing(env: Readonly<Record<string, string>>): Listing {
	const inherited = { ...process.env };
	for (const key of Object.keys(inherited)) {
		if (key.startsWith("SWEEP_")) delete inherited[key];
	}
	const result = spawnSync("bash", [SCRIPT], {
		cwd: ROOT,
		encoding: "utf8",
		env: { ...inherited, SWEEP_LIST: "1", ...env },
	});
	const output = `${result.stdout}${result.stderr}`;
	const rows = [...result.stdout.matchAll(/^ROW\t(\d+)\t(.*)$/gm)].map(
		(m) => [Number(m[1]), m[2] ?? ""] as const,
	);
	return { status: result.status, output, rows };
}

/** `value[key]` when `value` is an object, else undefined. */
function field(value: unknown, key: string): unknown {
	if (typeof value !== "object" || value === null) return undefined;
	return Object.entries(value).find(([name]) => name === key)?.[1];
}

/** The workflow's shard list and the env it hands each matrix job. */
function workflowMatrix(): {
	shards: unknown;
	failFast: unknown;
	env: unknown;
} {
	const sweep = field(
		field(parse(readFileSync(WORKFLOW, "utf8")), "jobs"),
		"sweep",
	);
	const strategy = field(sweep, "strategy");
	return {
		shards: field(field(strategy, "matrix"), "shard"),
		failFast: field(strategy, "fail-fast"),
		env: field(sweep, "env"),
	};
}

const SCRIPT_ROWS = [...readFileSync(SCRIPT, "utf8").matchAll(/^mutate /gm)]
	.length;
const ALL = listing({});

describe("the mutation sweep's shards", () => {
	it("lists every row once, in order, with no shard set", () => {
		expect(ALL.status, ALL.output).toBe(0);
		expect(SCRIPT_ROWS).toBeGreaterThan(100);
		expect(ALL.rows.map(([row]) => row)).toEqual(
			Array.from({ length: SCRIPT_ROWS }, (_, i) => i + 1),
		);
		expect(ALL.rows.every(([, label]) => label.trim() !== "")).toBe(true);
	});

	it("hands each matrix job its shard and the matrix size", () => {
		const { shards, failFast, env } = workflowMatrix();
		expect(Array.isArray(shards) && shards.length > 1).toBe(true);
		const count = (shards as unknown[]).length;
		expect(shards).toEqual(Array.from({ length: count }, (_, i) => i + 1));
		expect(failFast).toBe(false);
		expect(env).toEqual({
			SWEEP_SHARD: "${{ matrix.shard }}",
			SWEEP_SHARDS: "${{ strategy.job-total }}",
		});
	});

	it("splits the rows into disjoint, non-empty shards whose union is every row", () => {
		const { shards } = workflowMatrix();
		const count = Array.isArray(shards) ? shards.length : 0;
		const seen = new Map<number, string>();
		const sizes: number[] = [];
		for (let shard = 1; shard <= count; shard++) {
			const part = listing({
				SWEEP_SHARD: String(shard),
				SWEEP_SHARDS: String(count),
			});
			expect(part.status, part.output).toBe(0);
			expect(part.rows.length, `shard ${shard}/${count}`).toBeGreaterThan(0);
			for (const [row, label] of part.rows) {
				expect(seen.has(row), `row ${row} in two shards`).toBe(false);
				seen.set(row, label);
			}
			sizes.push(part.rows.length);
		}
		expect([...seen].sort(([a], [b]) => a - b)).toEqual(
			ALL.rows.map(([row, label]) => [row, label]),
		);
		expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
	});

	it("refuses a half-set, malformed or out-of-range shard", () => {
		for (const env of [
			{ SWEEP_SHARD: "1" },
			{ SWEEP_SHARDS: "8" },
			{ SWEEP_SHARD: "0", SWEEP_SHARDS: "8" },
			{ SWEEP_SHARD: "9", SWEEP_SHARDS: "8" },
			{ SWEEP_SHARD: "1.5", SWEEP_SHARDS: "8" },
			{ SWEEP_SHARD: "", SWEEP_SHARDS: "8" },
		]) {
			const refused = listing(env);
			expect(refused.status, JSON.stringify(env)).toBe(2);
			expect(refused.rows).toEqual([]);
		}
	});

	it("fails a shard that holds no row", () => {
		const shards = String(SCRIPT_ROWS + 1);
		const empty = listing({ SWEEP_SHARD: shards, SWEEP_SHARDS: shards });
		expect(empty.status).toBe(1);
		expect(empty.rows).toEqual([]);
		expect(empty.output).toContain("holds none of the");
	});
});
