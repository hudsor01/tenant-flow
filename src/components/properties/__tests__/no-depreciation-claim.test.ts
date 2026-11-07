/**
 * No owner surface says TenantFlow calculates depreciation (66.2-39 fix round
 * 1, part Q).
 *
 * The property form's Acquisition Details said "Used for accurate
 * depreciation calculations in your tax documents." Nothing reads the purchase
 * price or date (the form stores them), and the tax documents' depreciation
 * section was always empty, so it went with them (2be47d753). The form now says
 * what the fields are for. Read from the source text of every non-test
 * .ts/.tsx file under src/.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") out.push(...collect(abs));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.(test|spec)\./.test(entry.name)
		) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

describe("depreciation", () => {
	it("is claimed as calculated nowhere in src/", () => {
		const files = collect(join(ROOT, "src"));
		expect(files.length).toBeGreaterThan(900);
		const claims = files.flatMap((file) =>
			readFileSync(join(ROOT, file), "utf8")
				.split("\n")
				.map((line, at) => ({ line, at }))
				.filter(
					({ line }) =>
						/depreciation calculation|(calculates?|tracks?) depreciation/i.test(
							line,
						) && !/doesn(&apos;|')t calculate depreciation/i.test(line),
				)
				.map(({ at }) => `${file}:${at + 1}`),
		);
		expect(claims).toEqual([]);
	});

	it("catches the shapes it names (positive controls)", () => {
		const claim = (line: string) =>
			/depreciation calculation|(calculates?|tracks?) depreciation/i.test(
				line,
			) && !/doesn(&apos;|')t calculate depreciation/i.test(line);
		expect(claim("Used for accurate depreciation calculations")).toBe(true);
		expect(claim("TenantFlow calculates depreciation.")).toBe(true);
		expect(claim("We track depreciation for you")).toBe(true);
		expect(claim("TenantFlow doesn&apos;t calculate depreciation.")).toBe(
			false,
		);
		expect(claim("Property depreciation basis")).toBe(false);
	});
});
