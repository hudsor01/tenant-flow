/**
 * A `group` marker emits no CSS: it only names the element whose state the
 * `group-*` utilities inside it read. These files lost every such consumer
 * (66.2-39 part I removed the hover effects, fix round 3 F56 the logo glow)
 * or never had one (the FAQ item, the logo cloud item and the testimonial
 * card, pre-existing), so a marker left behind is dead (66.2-39 fix round 3,
 * F66 and the B3 sweep). Each marker here, bare or named (`group/<name>`),
 * must have a consumer among the element's descendants. The B3 sweep's one
 * other hit, the portfolio table's row, keeps its marker: its consumer is the
 * Actions cell portfolio-columns.tsx renders into it.
 */
import { readFileSync } from "node:fs";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";
import { escapeRegExp } from "#test/utils/regexp-source";

const FILES = [
	"src/app/auth/confirm-email/confirm-email-states.tsx",
	"src/components/inspections/inspection-room-card.tsx",
	"src/components/maintenance/detail/photos-card.tsx",
	"src/components/sections/how-it-works.tsx",
	"src/components/faq-accordion.tsx",
	"src/components/sections/logo-cloud.tsx",
	"src/components/sections/testimonials-section.tsx",
];

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

function childNodes(node: Node): Node[] {
	return Object.entries(node)
		.filter(([key]) => key !== "type" && key !== "start" && key !== "end")
		.flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
		.filter(isNode);
}

/** Each `group` marker in `source` with no `group-*` consumer below it. */
function orphanMarkers(path: string, source: string): string[] {
	const { program } = parseSync(path, source, { lang: "tsx" });
	const root: unknown = program;
	if (!isNode(root)) throw new Error(`${path}: no program`);
	const out: string[] = [];
	const classText = (el: Node) => {
		const opening = el.openingElement as Node;
		for (const a of (opening.attributes as Node[]) ?? []) {
			const name = a.name as Node | undefined;
			if (a.type === "JSXAttribute" && name?.name === "className") {
				const value = a.value as Node | null;
				return value ? source.slice(value.start, value.end) : "";
			}
		}
		return "";
	};
	const visit = (node: Node) => {
		if (node.type === "JSXElement") {
			const tokens = classText(node).split(/[\s"'`{}(),]+/);
			for (const marker of tokens.filter((t) => /^group(\/[\w-]+)?$/.test(t))) {
				const name = marker.slice("group".length);
				const consumer = new RegExp(
					`(?<![\\w-])group-[\\w\\[\\]=-]+${escapeRegExp(name)}:`,
				);
				const inner = source.slice((node.openingElement as Node).end, node.end);
				if (!consumer.test(inner)) {
					const line = source.slice(0, node.start).split("\n").length;
					out.push(`${path}:${line} ${marker}`);
				}
			}
		}
		for (const child of childNodes(node)) visit(child);
	};
	visit(root);
	return out;
}

describe("group markers have a consumer (66.2-39 fix round 3, F66)", () => {
	it("flags a marker nothing reads and passes one something does (fixtures)", () => {
		expect(
			orphanMarkers(
				"a.tsx",
				'<div className="group"><span className="block" /></div>',
			),
		).toEqual(["a.tsx:1 group"]);
		expect(
			orphanMarkers(
				"b.tsx",
				'<div className="group/row"><span className="group-hover/row:opacity-100" /></div>',
			),
		).toEqual([]);
	});

	it("leaves no orphaned marker in the swept files", () => {
		const orphans = FILES.flatMap((path) =>
			orphanMarkers(path, readFileSync(path, "utf8")),
		);
		expect(orphans).toEqual([]);
	});
});
