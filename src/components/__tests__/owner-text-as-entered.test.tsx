/**
 * Text an owner entered renders as entered (66.2-39 fix round 1, part P).
 *
 * The expenses page's breakdown ran each vendor name through a first-letter
 * capitalizer ("acme plumbing" read "Acme plumbing"), keyed by a style map of
 * category names no vendor has. The sweep of case transforms over first-party
 * UI found two more owner values altered on screen: a lease's utilities, shown
 * as stored with CSS `capitalize` ("lawn_care" read "Lawn_care", a utility the
 * owner typed was re-cased), and a unit number inside the unit menu's upper-case
 * heading ("apt b" read "APT B").
 *
 * The guard reads every non-test .tsx under src/app and src/components and
 * fails on a `capitalize` / `uppercase` / `lowercase` class (or an h5/h6, which
 * globals.css upper-cases) whose element shows an expression, unless that
 * expression is in REVIEWED: each is a label the code writes, never an owner's
 * text. A new hit is either an owner value (render it as entered) or a label
 * (add it here with the reason).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExpenseCategoryBreakdown } from "#app/(owner)/reports/expenses/_components/expense-category-breakdown";
import { LeaseTermsTab } from "#components/leases/detail/lease-terms-tab";
import { DEFAULT_LEASE } from "#test/utils/test-data";

const ROOT = process.cwd();

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...collect(abs));
		else if (entry.name.endsWith(".tsx")) out.push(relative(ROOT, abs));
	}
	return out;
}

const TSX = ["src/app", "src/components"]
	.flatMap((root) => collect(join(ROOT, root)))
	.filter((f) => !/\.(test|spec)\.tsx$/.test(f) && !/\/__tests__\//.test(f));

const CASE_TRANSFORM =
	/\b(?:uppercase|capitalize|lowercase|typography-label)\b|<h[56]\b/;

/** Expressions under a case transform that are labels the code writes. */
const REVIEWED: Readonly<Record<string, string>> = {
	"stat.label": "pricing page stats, a constant list",
	"data.tagline": "compare page copy, a constant",
	categoryDisplayLabel: "blog category label map",
	PERIOD_LABEL: "a constant",
	title: "logo cloud heading, a prop the page writes",
	resourceType: "lead magnet copy, a constant",
	"headerToLabel(header)": "an import template's field names, a fixed set",
	"metric.label": "property performance metric names, a constant list",
	"TRADE_LABELS[vendor.trade] ?? vendor.trade":
		"vendor trade label map; vendors.trade is CHECK-constrained to its keys",
	'priority?.toLowerCase() ?? "low"':
		"maintenance priority, CHECK-constrained; the transform reads its label",
};

/** `file:line → expression` for a case-transformed element with an expression child. */
function transformedExpressions(): string[] {
	const out: string[] = [];
	for (const file of TSX) {
		const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
		lines.forEach((line, i) => {
			const trimmed = line.trim();
			if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
			if (!CASE_TRANSFORM.test(line)) return;
			// The element's children: the rest of this line after the opening
			// tag, then lines up to the first closing tag.
			const window = [
				line.includes(">") ? line.slice(line.indexOf(">") + 1) : "",
			];
			for (let k = i + 1; k < Math.min(i + 6, lines.length); k++) {
				const next = lines[k] ?? "";
				window.push(next);
				if (next.includes("</")) break;
			}
			for (const [, expression] of window.join(" ").matchAll(/\{([^{}]+)\}/g)) {
				const e = (expression ?? "").trim();
				if (e.startsWith("/*") || /^["'`]/.test(e)) continue;
				if (/^\s*errors\.push\(/.test(e)) continue;
				if (Object.hasOwn(REVIEWED, e)) continue;
				// Wrapped back to its own case inside the transformed element.
				if (window.join(" ").includes(`className="normal-case">{${e}}`))
					continue;
				out.push(`${file}:${i + 1} → ${e}`);
			}
		});
	}
	return out;
}

describe("owner text is not re-cased", () => {
	afterEach(() => cleanup());

	it("scans the UI (the sweep is not vacuous)", () => {
		expect(TSX.length).toBeGreaterThan(400);
	});

	it("puts no case transform over an expression it has not reviewed", () => {
		expect(transformedExpressions()).toEqual([]);
	});

	it("shows a vendor's name as entered, in one style for every vendor", () => {
		render(
			<ExpenseCategoryBreakdown
				categories={[
					{ category: "acme plumbing", amount: 120, percentage: 60 },
					{ category: "maintenance", amount: 80, percentage: 40 },
				]}
			/>,
		);
		const acme = screen.getByText("acme plumbing");
		const named = screen.getByText("maintenance");
		expect(screen.queryByText("Acme plumbing")).toBeNull();
		expect(screen.queryByText("Maintenance")).toBeNull();
		// A vendor that happens to be named like a category gets no other style.
		expect(named.className).toBe(acme.className);
		expect(acme.className).not.toMatch(/capitalize|uppercase/);
	});

	it("names a lease's utilities by their labels, and an owner's own as typed", () => {
		render(
			<LeaseTermsTab
				lease={{
					...DEFAULT_LEASE,
					utilities_included: ["lawn_care", "solar panels"],
					tenant_responsible_utilities: ["hoa_fees"],
				}}
			/>,
		);
		const typed = screen.getByText("solar panels");
		expect(screen.getByText("Lawn Care")).toBeInTheDocument();
		expect(screen.getByText("HOA Fees")).toBeInTheDocument();
		expect(typed.className).not.toMatch(/capitalize/);
	});

	it("keeps the unit number out of the unit menu's upper-casing", () => {
		const source = readFileSync(
			join(
				ROOT,
				"src/app/(owner)/properties/units/components/unit-actions.tsx",
			),
			"utf8",
		);
		expect(source).toContain(
			'Unit <span className="normal-case">{unit.unit_number}</span>',
		);
	});

	it("catches the shapes it names (positive controls)", () => {
		expect(CASE_TRANSFORM.test('className="capitalize"')).toBe(true);
		expect(CASE_TRANSFORM.test("<h6 className='x'>")).toBe(true);
		expect(CASE_TRANSFORM.test('className="normal-case"')).toBe(false);
	});
});
