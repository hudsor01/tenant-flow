/**
 * A text field's border is its only boundary, so it is drawn in the input
 * token (3:1 on every surface, WCAG 1.4.11; the token is held by
 * state-fill-contrast.test.ts). A native <input>, <textarea> or <select> that
 * draws a border in `border-border` (the decoration token, 1.40:1 light and
 * 1.42:1 dark) is a field a low-vision user cannot find. Part 5b moved the raw
 * fields it rendered to border-input (fd773b713); the F1 gaps sweep found the
 * one it could not reach, the new-password field on /auth/update-password,
 * which renders only with a recovery session (66.2-39 fix round 4, Part 5c).
 * Checkboxes and radios are excluded: their boundary is the UA's own box.
 */
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";
import { collectG7SourceTexts } from "#test/utils/tailwind-guards";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

const isNode = (value: unknown): value is Node =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { type?: unknown }).type === "string";

function walk(node: Node, visit: (n: Node) => void) {
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		for (const child of Array.isArray(value) ? value : [value])
			if (isNode(child)) walk(child, visit);
	}
}

/** Every string literal inside a JSX attribute's value (cn() arguments included). */
function literals(value: Node | null): string[] {
	const out: string[] = [];
	if (!value) return out;
	walk(value, (n) => {
		if (n.type === "Literal" && typeof n.value === "string") out.push(n.value);
		if (n.type === "TemplateElement")
			out.push(String((n.value as { raw?: string })?.raw ?? ""));
	});
	return out;
}

const FIELD = new Set(["input", "textarea", "select"]);
const NOT_A_FIELD =
	/^(checkbox|radio|hidden|file|range|color|submit|button|image|reset)$/;

function decorationBordered(path: string, source: string): string[] {
	const { program } = parseSync(path, source, { lang: "tsx" });
	if (!isNode(program)) throw new Error(`${path}: no program`);
	const out: string[] = [];
	walk(program, (n) => {
		if (n.type !== "JSXOpeningElement") return;
		const name =
			(n.name as Node).type === "JSXIdentifier"
				? String((n.name as Node).name)
				: "";
		if (!FIELD.has(name)) return;
		let type = "";
		let classes = "";
		for (const a of (n.attributes as Node[]) ?? []) {
			if (a.type !== "JSXAttribute") continue;
			const attr = String((a.name as Node).name);
			if (attr === "type") type = literals(a.value as Node | null).join(" ");
			if (attr === "className")
				classes = literals(a.value as Node | null).join(" ");
		}
		if (NOT_A_FIELD.test(type)) return;
		const tokens = classes.split(/\s+/);
		const draws = tokens.some((t) => /^border(-[xytrbl])?(-\d+)?$/.test(t));
		if (
			draws &&
			tokens.includes("border-border") &&
			!tokens.includes("border-input")
		)
			out.push(
				`${path}:${source.slice(0, n.start).split("\n").length} <${name}>`,
			);
	});
	return out;
}

describe("a native text field draws its boundary in the input token (WCAG 1.4.11; 66.2-39 fix round 4, Part 5c)", () => {
	const files = collectG7SourceTexts(process.cwd()).filter(({ path }) =>
		path.endsWith(".tsx"),
	);

	it("finds the native fields it rules on", () => {
		expect(
			files.filter(({ text }) => /<(input|textarea|select)\b/.test(text))
				.length,
		).toBeGreaterThan(5);
	});

	it("leaves no native text field with a border-border boundary", () => {
		expect(
			files.flatMap(({ path, text }) => decorationBordered(path, text)),
		).toEqual([]);
	});
});
