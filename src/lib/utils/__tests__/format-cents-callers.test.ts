/**
 * `formatCents` is called only where the input really is cents.
 *
 * CLAUDE.md: money is dollars everywhere (`formatCurrency`); only the lease
 * template's `*Cents` fields are cents (`formatCents`). Two shapes broke that:
 *   - OwnerPaymentSummary passed dollar totals straight to `formatCents`, which
 *     divides by 100, so every amount rendered a hundredfold too small;
 *   - the balance-sheet, cash-flow and income-statement pages wrote
 *     `formatCents(dollars * 100)`, a round trip through a unit nothing stores.
 * Every caller now uses `formatCurrency` except the lease template, whose
 * inputs are `*Cents` fields built with `dollarsToCents`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const ALLOWED_CALLERS = new Set([
	// The definition.
	"src/lib/utils/currency.ts",
	// Formats `rent_amountCents`, `security_depositCents`, `late_fee_amountCents`.
	"src/lib/templates/lease-template.ts",
]);

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			out.push(...sourceFiles(abs));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.(test|spec)\.tsx?$/.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

describe("formatCents callers", () => {
	const files = sourceFiles(SRC);

	it("scans the source tree", () => {
		expect(files.length).toBeGreaterThan(500);
	});

	it("is called only by the lease template", () => {
		const hits: string[] = [];
		for (const abs of files) {
			const rel = relative(process.cwd(), abs);
			if (ALLOWED_CALLERS.has(rel)) continue;
			readFileSync(abs, "utf8")
				.split("\n")
				.forEach((line, index) => {
					const code = line.trim();
					if (code.startsWith("//") || code.startsWith("*")) return;
					if (/\bformatCents\s*\(/.test(code)) {
						hits.push(`${rel}:${index + 1} ${code}`);
					}
				});
		}
		expect(
			hits,
			`formatCents on a dollar amount -- use formatCurrency:\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("still finds the lease template's cents fields", () => {
		const template = readFileSync(
			join(SRC, "lib/templates/lease-template.ts"),
			"utf8",
		);
		expect(template).toMatch(/formatCents\(\s*overrides\?\.rent_amountCents/);
	});
});
