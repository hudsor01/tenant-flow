/**
 * Confirmations say what happens, never "Are you sure" (66.2-39 fix round 4,
 * Part 8h).
 *
 * A confirmation names the act and the item in its title and says what the
 * act does in its description: "Delete property "Maple Court"?", then "This
 * marks it as inactive, so it leaves your property list. Its units and leases
 * are kept." Ten lines asked "Are you sure…?" instead, and that question had
 * stood in for the facts: two of them called a soft delete permanent, and one
 * claimed a cascade to the property's units that the delete never makes.
 *
 * THE SCAN. Every tracked non-test `src/**\/*.{ts,tsx}`, parsed with oxc
 * (`rolldown/utils`): the text of each JSX element (its text children joined,
 * so a sentence wrapped across lines reads whole), every string literal and
 * every template's text. Comments are not copy and are not read. It fails on
 * "are you sure" in any case.
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

const ASKS = /\bare\s+you\s+sure\b/i;

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function childNodes(node: Node): Node[] {
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

function visit(node: Node, fn: (n: Node) => void) {
	fn(node);
	for (const child of childNodes(node)) visit(child, fn);
}

/** Each piece of copy in a source: an element's joined text, a string, a template's text. */
function copyIn(
	file: string,
	source: string,
): { line: number; text: string }[] {
	const { program, errors } = parseSync(file, source, {
		lang: file.endsWith(".ts") ? "ts" : "tsx",
	});
	if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${file}: no program`);
	const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;
	const out: { line: number; text: string }[] = [];
	visit(root, (node) => {
		if (
			(node.type === "JSXElement" || node.type === "JSXFragment") &&
			Array.isArray(node.children)
		) {
			const text = node.children
				.map((child: unknown) =>
					isNode(child) && child.type === "JSXText" ? String(child.value) : " ",
				)
				.join("")
				.replace(/\s+/g, " ")
				.trim();
			if (text) out.push({ line: lineOf(node.start), text });
		} else if (node.type === "Literal" && typeof node.value === "string") {
			out.push({ line: lineOf(node.start), text: node.value });
		} else if (
			node.type === "TemplateElement" &&
			typeof node.value === "object" &&
			node.value !== null
		) {
			const cooked = (node.value as { cooked?: unknown }).cooked;
			if (typeof cooked === "string")
				out.push({ line: lineOf(node.start), text: cooked });
		}
	});
	return out;
}

function asks(file: string, source: string): string[] {
	return copyIn(file, source)
		.filter((piece) => ASKS.test(piece.text.replace(/\s+/g, " ")))
		.map((piece) => `${file}:${piece.line} "${piece.text.slice(0, 80)}"`);
}

function trackedSources(): string[] {
	return execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
		.split("\n")
		.filter(
			(f) =>
				/\.(ts|tsx)$/.test(f) &&
				!/\.d\.ts$/.test(f) &&
				!/\.(test|spec)\.(ts|tsx)$/.test(f) &&
				!f.includes("/__tests__/") &&
				!f.startsWith("src/test/"),
		);
}

describe("the scan finds the question in every shape of copy (fixtures)", () => {
	it("reads JSX text wrapped across lines, strings and templates, not comments", () => {
		const source = [
			"// Are you sure? (a comment is not copy)",
			"export function F({ name }) {",
			"\tconst a = 'Are you sure you want to sign out?';",
			"\tconst b = `Are you sure you want to delete ${name}?`;",
			"\treturn (",
			"\t\t<p>",
			"\t\t\tThis keeps their data. Are",
			"\t\t\tyou sure you want to continue?",
			"\t\t</p>",
			"\t);",
			"}",
			"export const fine = <p>This marks it as inactive.</p>;",
		].join("\n");
		expect(asks("src/fixture.tsx", source)).toEqual([
			'src/fixture.tsx:3 "Are you sure you want to sign out?"',
			'src/fixture.tsx:4 "Are you sure you want to delete "',
			'src/fixture.tsx:6 "This keeps their data. Are you sure you want to continue?"',
		]);
	});
});

describe('no copy in src asks "Are you sure"', () => {
	it("reads the app's copy", () => {
		const files = trackedSources();
		// Positive control: the scan reads real copy.
		const pieces = files.flatMap((file) =>
			copyIn(file, readFileSync(file, "utf8")),
		);
		expect(files.length).toBeGreaterThan(800);
		expect(pieces.length).toBeGreaterThan(5000);
		expect(pieces.some((piece) => piece.text === "Cancel")).toBe(true);
	});

	it("finds none", () => {
		const hits = trackedSources().flatMap((file) =>
			asks(file, readFileSync(file, "utf8")),
		);
		expect(hits).toEqual([]);
	});
});
