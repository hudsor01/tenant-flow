/**
 * No declaration in src repeats a `src/types` type member for member
 * (CLAUDE.md zero-tolerance rule 3, "No duplicate types"; the Type Lookup
 * Order starts in `src/types`). A local interface with the members of one
 * `src/types` declares, each of the same type, is that type under a second
 * name: the next change reaches one copy and not the other.
 *
 * 66.2-39 fix round 4 (G9): the expenses breakdown declared `VendorSummary`,
 * and removing `deductible` and `notes` left `TaxExpenseCategory`, each field
 * for field `ExpenseCategorySummary`, the type of the get_expense_summary
 * categories both were handed. Both are gone.
 *
 * The scan parses every tracked non-test `.ts`/`.tsx` file under `src/` but
 * the generated `src/types/supabase.ts` and the `src/test/` helpers (oxc,
 * through `rolldown/utils`): each interface without `extends` and each object
 * type alias, neither generic, of two members or more, all of them property
 * signatures. A declaration's shape is its members' names, optional marks and
 * type text, sorted. A shape two declarations share, one of them in
 * `src/types`, is a duplicate. `RATCHET` holds the older ones, each as its
 * declarations (`Name@path`), as they stood when the scan landed: one was
 * identical at d9c7329f0, and two pair records of different things that
 * happen to share their fields (a year-end vendor total with a maintenance
 * cost line, a financial metric with an unread export). A group may leave it
 * or lose a declaration, and nothing may join it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function children(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) out.push(v);
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
}

/** A member's `name[?]: type`, or null for anything but a property. */
function memberShape(member: Node, source: string): string | null {
	if (member.type !== "TSPropertySignature" || !isNode(member.key)) {
		return null;
	}
	const key = member.key;
	const name =
		key.type === "Identifier"
			? String(key.name)
			: key.type === "Literal"
				? String(key.value)
				: null;
	const annotation = member.typeAnnotation;
	if (name === null || !isNode(annotation)) return null;
	const type = annotation.typeAnnotation;
	if (!isNode(type)) return null;
	const text = source.slice(type.start, type.end).replace(/\s+/g, " ");
	return `${name}${member.optional ? "?" : ""}: ${text}`;
}

interface Declaration {
	/** `Name@path`. */
	id: string;
	shape: string;
}

/** The interfaces and object type aliases of one file, with their shapes. */
function declarations(path: string, source: string): Declaration[] {
	const { program, errors } = parseSync(path, source, {
		lang: path.endsWith(".tsx") ? "tsx" : "ts",
	});
	if (errors.length > 0) throw new Error(`${path}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${path}: the parser returned no program`);
	const out: Declaration[] = [];
	const add = (id: unknown, members: unknown) => {
		if (!isNode(id) || !Array.isArray(members) || members.length < 2) return;
		const shapes = members.map((m) =>
			isNode(m) ? memberShape(m, source) : null,
		);
		if (shapes.some((s) => s === null)) return;
		out.push({
			id: `${String(id.name)}@${path}`,
			shape: shapes.sort().join("; "),
		});
	};
	const visit = (node: Node) => {
		if (
			node.type === "TSInterfaceDeclaration" &&
			!node.typeParameters &&
			(!Array.isArray(node.extends) || node.extends.length === 0) &&
			isNode(node.body)
		) {
			add(node.id, node.body.body);
		}
		if (
			node.type === "TSTypeAliasDeclaration" &&
			!node.typeParameters &&
			isNode(node.typeAnnotation) &&
			node.typeAnnotation.type === "TSTypeLiteral"
		) {
			add(node.id, node.typeAnnotation.members);
		}
		for (const child of children(node)) visit(child);
	};
	visit(root);
	return out;
}

/** Each shared shape with a `src/types` declaration in it, as sorted ids. */
function duplicateShapes(
	files: ReadonlyArray<readonly [path: string, source: string]>,
): string[][] {
	const byShape = new Map<string, string[]>();
	for (const [path, source] of files) {
		for (const { id, shape } of declarations(path, source)) {
			byShape.set(shape, [...(byShape.get(shape) ?? []), id]);
		}
	}
	return [...byShape.values()]
		.filter(
			(ids) => ids.length > 1 && ids.some((id) => id.includes("@src/types/")),
		)
		.map((ids) => [...ids].sort())
		.sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));
}

/** The older shared shapes: their declarations, one line per shape. */
const RATCHET = `
ExpenseCategoryTotal@src/components/reports/sections/year-end-report-section-utils.ts MaintenanceCostBreakdownEntry@src/types/analytics.ts
MonthlyData@src/types/financial-statements.ts MonthlyFinancialMetric@src/types/analytics.ts
OwnerProfile@src/components/profiles/owner/profile-card.tsx UserProfileOwnerData@src/types/api-contracts.ts
`;

function ratchet(): string[] {
	return RATCHET.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function trackedSourceFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z", "--", "src"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => /\.(ts|tsx)$/.test(path))
		.filter((path) => path !== "src/types/supabase.ts")
		.filter((path) => !path.startsWith("src/test/"))
		.filter((path) => !/(^|\/)__tests__\/|\.test\.tsx?$/.test(path));
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		// Tracked but deleted in the working tree: nothing to scan.
		return null;
	}
}

describe("no declaration repeats a src/types type member for member", () => {
	it("groups same-member declarations with a src/types one (fixtures)", () => {
		const found = duplicateShapes([
			[
				"src/types/a.ts",
				"export interface Row { id: string; amount: number }\nexport interface Pair<T> { a: T; b: T }",
			],
			[
				"src/x.tsx",
				"interface Local { amount: number; id: string }\ntype Alias = { id: string; amount: number };\ninterface Wider { id: string; amount: number; note?: string }\ninterface Typed { id: number; amount: number }\ninterface Both { a: string; b: string }",
			],
			["src/y.ts", "interface Both { b: string; a: string }"],
		]);
		expect(found).toEqual([
			["Alias@src/x.tsx", "Local@src/x.tsx", "Row@src/types/a.ts"],
		]);
	});

	it("adds no shared shape beyond the ratchet, and keeps the ratchet current", () => {
		const files = trackedSourceFiles()
			.map((path) => [path, readOrNull(path)] as const)
			.filter((entry): entry is readonly [string, string] => entry[1] !== null);
		expect(files.length).toBeGreaterThan(500);
		const found = duplicateShapes(files).map((ids) => ids.join(" "));
		const older = ratchet();
		const added = found.filter((group) => !older.includes(group));
		expect(
			added,
			`a declaration with a src/types type's members (rule 3): use that type instead:\n${added.join("\n")}`,
		).toEqual([]);
		const stale = older.filter((group) => !found.includes(group));
		expect(
			stale,
			`no longer shared as RATCHET says; update or remove its line:\n${stale.join("\n")}`,
		).toEqual([]);
	});
});
