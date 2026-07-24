/**
 * Money-boundary static guard for the rent-ledger surface (LEDGER-01, D-00,
 * T-55-05).
 *
 * Every ledger amount is `numeric(10,2)` DOLLARS from the database through to
 * the rendered figure. The single integer->numeric conversion happens once, in
 * SQL, at charge generation (`rent_amount::numeric(10,2)`). There is no cents
 * representation anywhere in this subsystem, so any hundredfold scaling
 * (`* 100`, `/ 100`) or `formatCents(` on a ledger path is by definition the
 * v8.0 MONEY-01/02 100x bug class reappearing.
 *
 * This test recursively scans the ledger source paths and fails on those
 * tokens. It is a live regression gate from Wave 1 onward: it passes trivially
 * while a path does not yet exist, and fails the moment a later plan introduces
 * cents math on a ledger file. `formatCents` (`src/lib/utils/currency.ts`) is
 * legitimate for Stripe cents — it must simply never touch a ledger value.
 *
 * Comments are stripped before matching, so a source comment restating this
 * rule does not self-invalidate the file it documents. Test files are skipped,
 * so this file's own fixture strings never self-trigger the scan.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Ledger source paths (directories are scanned recursively, files directly).
 * A path that does not exist yet is skipped — the guard is authored in Wave 1
 * ahead of the hooks/UI it will police.
 */
const LEDGER_PATHS: readonly string[] = [
	"src/lib/ledger",
	"src/components/ledger",
	"src/hooks/api/use-rent-ledger.ts",
	"src/hooks/api/query-keys/rent-ledger-keys.ts",
];

/**
 * Forbidden money-scale tokens. `\s*` makes each one match the spaced AND
 * unspaced form, so `rent_amount * 100` and `rentAmount*100` are both caught.
 */
const FORBIDDEN_MONEY_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
	{ name: "cents formatter (formatCents)", pattern: /formatCents\s*\(/ },
	{ name: "hundredfold multiply (* 100)", pattern: /\*\s*100/ },
	{ name: "hundredfold divide (/ 100)", pattern: /\/\s*100/ },
];

const cwd = process.cwd();

function isTestPath(relPath: string): boolean {
	return (
		relPath.includes("/__tests__/") ||
		relPath.includes(".test.") ||
		relPath.includes(".spec.") ||
		relPath.endsWith(".d.ts")
	);
}

/** Strip block and line comments so documentation cannot trip the guard. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, "");
}

/** Names of every forbidden pattern present in the code (comments excluded). */
function findMoneyScaleViolations(source: string): string[] {
	const code = stripComments(source);
	return FORBIDDEN_MONEY_PATTERNS.filter(({ pattern }) =>
		pattern.test(code),
	).map(({ name }) => name);
}

/** Every non-test .ts/.tsx file under the configured ledger paths. */
function collectLedgerSourceFiles(): string[] {
	const files: string[] = [];

	for (const ledgerPath of LEDGER_PATHS) {
		const abs = join(cwd, ledgerPath);
		// Not built yet (Wave 1) — an absent path contributes nothing and still passes.
		if (!existsSync(abs)) continue;

		if (statSync(abs).isFile()) {
			files.push(abs);
			continue;
		}

		for (const entry of readdirSync(abs, {
			recursive: true,
			withFileTypes: true,
		})) {
			if (!entry.isFile()) continue;
			if (!/\.(ts|tsx)$/.test(entry.name)) continue;
			const parentPath =
				(entry as { parentPath?: string; path?: string }).parentPath ??
				(entry as { path?: string }).path ??
				abs;
			files.push(join(parentPath, entry.name));
		}
	}

	return files.filter((abs) => !isTestPath(abs.replace(/\\/g, "/")));
}

const ledgerFiles = collectLedgerSourceFiles();

describe("rent-ledger money boundary: no cents math on ledger paths", () => {
	it("tolerates ledger paths that do not exist yet", () => {
		// The scan never throws on a missing directory/file; it simply yields
		// fewer files, so this guard is green from Wave 1 onward.
		expect(collectLedgerSourceFiles()).toEqual(ledgerFiles);
		expect(Array.isArray(ledgerFiles)).toBe(true);
	});

	for (const abs of ledgerFiles) {
		const rel = relative(cwd, abs).replace(/\\/g, "/");
		it(`${rel} has no hundredfold scaling or cents formatting`, () => {
			expect(findMoneyScaleViolations(readFileSync(abs, "utf8"))).toEqual([]);
		});
	}
});

describe("rent-ledger money guard detector", () => {
	it.each([
		["spaced multiply", "const cents = charge.rent_amount * 100;"],
		["unspaced multiply", "const cents = rentAmount*100;"],
		["spaced divide", "const dollars = raw.amount / 100;"],
		["unspaced divide", "const dollars = raw.amount/100;"],
		["cents formatter", 'return formatCents(row.amount, { currency: "USD" });'],
		["spaced cents formatter", "return formatCents (row.amount);"],
	])("flags %s", (_label, source) => {
		expect(findMoneyScaleViolations(source).length).toBeGreaterThan(0);
	});

	it("flags every forbidden token present in one file", () => {
		const source = [
			"const a = amount * 100;",
			"const b = amount / 100;",
			"const c = formatCents(amount);",
		].join("\n");
		expect(findMoneyScaleViolations(source)).toHaveLength(
			FORBIDDEN_MONEY_PATTERNS.length,
		);
	});

	it("does not flag a comment that merely documents the rule", () => {
		const source = [
			"// Ledger amounts are dollars: never * 100, never / 100, never formatCents(.",
			"/* Do not scale by * 100 or divide / 100 here. */",
			"const balance = charges - receipts;",
		].join("\n");
		expect(findMoneyScaleViolations(source)).toEqual([]);
	});

	it("does not flag legitimate dollar math", () => {
		const source = [
			"const remaining = charge.amount - receiptsSum;",
			"const balance = toLedgerScale(previous + entry.amount);",
			"return formatCurrency(balance);",
		].join("\n");
		expect(findMoneyScaleViolations(source)).toEqual([]);
	});

	it("scans the ledger-math module that already exists", () => {
		// Proves the scan is non-trivial today: src/lib/ledger is populated, so a
		// regression there would actually be caught rather than silently skipped.
		expect(ledgerFiles.some((abs) => abs.endsWith("ledger-math.ts"))).toBe(
			true,
		);
	});
});
