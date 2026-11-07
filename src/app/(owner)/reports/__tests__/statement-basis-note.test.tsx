/**
 * The basis the three statements are presented on is stated once (66.2-39 fix
 * round 1, part P): STATEMENT_BASIS_NOTE in #lib/reports/statement-basis,
 * rendered by StatementBasisNote under each statement's figures and written by
 * each statement's CSV. A copy of an entry anywhere else in src/ fails here,
 * so the screens and the files cannot drift apart.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatementBasisNote } from "#app/(owner)/reports/statement-basis-note";
import * as statementBasis from "#lib/reports/statement-basis";
import {
	STATEMENT_BASIS_HEADING,
	STATEMENT_BASIS_NOTE,
} from "#lib/reports/statement-basis";
import { computeListCascade } from "#test/utils/base-rule-cascade";

const ROOT = process.cwd();

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...collect(abs));
		else if (/\.tsx?$/.test(entry.name)) out.push(relative(ROOT, abs));
	}
	return out;
}

describe("the statements' basis of presentation", () => {
	it("says what Cash, the owner's funds and the income statement's revenue are", () => {
		expect(STATEMENT_BASIS_HEADING).toBe("Basis of Presentation");
		expect(STATEMENT_BASIS_NOTE).toEqual([
			"Cash is what your rent ledger records as received.",
			"TenantFlow doesn't record which account paid an expense, so expenses are shown as paid from your own funds: the cash flow's Owner Funds for Expenses line and the balance sheet's Owner Capital.",
			"The income statement counts each charge in the period it was entered, net of reversals and credits. Opening balances are carried in Owner Capital.",
		]);
	});

	it("exports the heading and the entries, the two things a reader uses", () => {
		// Every page, CSV and generated report reads the entries one by one;
		// a one-paragraph copy of the note had no reader (cycle 2, F6).
		expect(Object.keys(statementBasis).sort()).toEqual([
			"STATEMENT_BASIS_HEADING",
			"STATEMENT_BASIS_NOTE",
		]);
	});

	it("names the lines the statements now carry, and none part N removed", () => {
		const text = STATEMENT_BASIS_NOTE.join(" ");
		expect(text).toContain("Owner Funds for Expenses");
		expect(text).toContain("Owner Capital");
		expect(text).not.toMatch(
			/investing|depreciation|security deposit|mortgage|bank balance/i,
		);
	});

	it("renders as a named region with its heading and each entry", () => {
		render(<StatementBasisNote />);
		const region = screen.getByRole("region", {
			name: STATEMENT_BASIS_HEADING,
		});
		expect(
			screen.getByRole("heading", { level: 2, name: STATEMENT_BASIS_HEADING }),
		).toBeInTheDocument();
		expect(region.querySelectorAll("li")).toHaveLength(
			STATEMENT_BASIS_NOTE.length,
		);
	});

	// globals.css' `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` sat the
	// entries 24px right of the heading, swallowed the heading's mb-2 and left
	// 32px under the list against 16px above it (cycle 2, F19).
	it("defeats the base list rules, so the entries sit under the heading", () => {
		const { container } = render(<StatementBasisNote />);
		const list = container.querySelector("ul");
		if (!list) throw new Error("the note rendered no <ul>");
		const { neutralized, baseline } = computeListCascade(list);
		expect(baseline).toMatchObject({
			paddingLeft: "24px",
			marginTop: "16px",
			marginBottom: "16px",
			firstChildMarginBottom: "4px",
		});
		expect(neutralized).toEqual({
			paddingLeft: "0px",
			marginTop: "0px",
			marginBottom: "0px",
			firstChildTag: "li",
			firstChildMarginBottom: "0px",
		});
	});

	it("is written once: no other source file copies an entry", () => {
		const copies = collect(join(ROOT, "src"))
			.filter(
				(f) =>
					f !== "src/lib/reports/statement-basis.ts" &&
					!/\.(test|spec)\.tsx?$/.test(f) &&
					!/\/__tests__\//.test(f),
			)
			.filter((f) => {
				const source = readFileSync(join(ROOT, f), "utf8");
				return STATEMENT_BASIS_NOTE.some((entry) =>
					source.includes(entry.slice(0, 40)),
				);
			});
		expect(copies).toEqual([]);
	});
});
