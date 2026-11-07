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
 *
 * Also: the job's timeout covers its fullest shard twice over, and neither
 * file's comments write the row count, which the workflow's did twice
 * ("179 rows", "at most 23" a shard) after rows were added.
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

/** The workflow's shard list, its timeout and the env it hands each job. */
function workflowMatrix(): {
	shards: unknown;
	failFast: unknown;
	env: unknown;
	timeoutMinutes: unknown;
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
		timeoutMinutes: field(sweep, "timeout-minutes"),
	};
}

const SCRIPT_ROWS = [...readFileSync(SCRIPT, "utf8").matchAll(/^mutate /gm)]
	.length;

/**
 * A row's runtime on a GitHub runner, and a shard's set-up and baseline
 * before its first row, as the workflow's timeout comment states them (the
 * rate is the unsharded run's that timed out).
 */
const RUNNER_SECONDS_PER_ROW = 17.3;
const SHARD_SETUP_SECONDS = 30;

/**
 * Row counts written into a comment go stale the day a row is added: the
 * workflow said "179 rows" and "at most 23" a shard while the script had 185
 * rows and a shard of 24. These are the shapes a count takes in prose.
 */
const ROW_COUNT_SHAPES: readonly RegExp[] = [
	/\b\d+\s+rows?\b/gi,
	/\brows?\s+\d+\b/gi,
	/\bat most \d+\b/gi,
	/\b\d+ of \d+\b/g,
	/\b\d+ x \d/g,
];

/**
 * Counts that are history, not a claim about now: each names a run that
 * happened. Each must still be in its file, so a stale entry fails too.
 */
const HISTORICAL_COUNTS: Readonly<Record<string, readonly string[]>> = {
	".github/workflows/mutation-sweep.yml": [
		"hit its 45-minute limit at row 155 of 179",
	],
	"scripts/mutation-sweep.sh": ["179 rows ran past the old 45-minute limit"],
};

/** A file's whole-line `#` comments (not the shebang), joined by spaces. */
function commentText(path: string): string {
	return readFileSync(join(ROOT, path), "utf8")
		.split("\n")
		.filter((line) => /^\s*#/.test(line) && !line.startsWith("#!"))
		.map((line) => line.replace(/^\s*#+\s?/, "").trim())
		.join(" ");
}

/**
 * The module variables each section's rows may mutate. `mutate` prints only
 * a row's label, so a row under another module's heading points a VACUOUS
 * reader at the wrong file. The verdict layer spans the result module and the
 * replay CLI's exit codes.
 */
const SECTION_MODULES: Readonly<Record<string, readonly string[]>> = {
	"migration-replay assertions": ["REPLAY"],
	"platform-config assertions": ["PLATFORM"],
	"workflow contract": ["CONTRACT"],
	"the verdict layer: annotations, reporting, tallying, exit codes": [
		"RESULT",
		"REPLAY_CLI",
	],
};

/** Every row as `[section heading, module variable, label line]`, in order. */
function sectionRows(): ReadonlyArray<readonly [string, string, string]> {
	const rows: [string, string, string][] = [];
	let section = "";
	for (const line of readFileSync(SCRIPT, "utf8").split("\n")) {
		const heading = /^section "([^"]*)"/.exec(line);
		if (heading) section = heading[1] ?? "";
		const row = /^mutate "\$([A-Z_]+)"/.exec(line);
		if (row) rows.push([section, row[1] ?? "", line]);
	}
	return rows;
}
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

	it("puts each row under its own module's section", () => {
		const rows = sectionRows();
		expect(rows).toHaveLength(SCRIPT_ROWS);
		const misplaced = rows
			.filter(
				([section, module]) => !SECTION_MODULES[section]?.includes(module),
			)
			.map(([section, module, line]) => `${section} <- $${module}: ${line}`);
		expect(misplaced).toEqual([]);
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

	it("gives the fullest shard a timeout of at least twice its runtime", () => {
		const { shards, timeoutMinutes } = workflowMatrix();
		const count = Array.isArray(shards) ? shards.length : 0;
		expect(count).toBeGreaterThan(1);
		expect(typeof timeoutMinutes).toBe("number");
		const fullest = Math.ceil(SCRIPT_ROWS / count);
		const seconds = fullest * RUNNER_SECONDS_PER_ROW + SHARD_SETUP_SECONDS;
		expect(
			2 * seconds,
			`a shard of ${fullest} rows needs ${seconds} s; add a shard to the matrix`,
		).toBeLessThanOrEqual(Number(timeoutMinutes) * 60);
	});
});

describe("the sweep's comments", () => {
	it.each(Object.keys(HISTORICAL_COUNTS))(
		"%s writes no current row count",
		(path) => {
			let text = commentText(path);
			for (const phrase of HISTORICAL_COUNTS[path] ?? []) {
				expect(text, `historical count "${phrase}"`).toContain(phrase);
				text = text.split(phrase).join(" ");
			}
			const counts = ROW_COUNT_SHAPES.flatMap((shape) =>
				[...text.matchAll(shape)].map((match) => match[0]),
			);
			const current = [...text.matchAll(/\b\d+\b/g)]
				.map((match) => match[0])
				.filter((number) => Number(number) === SCRIPT_ROWS);
			expect([...counts, ...current]).toEqual([]);
		},
	);
});
