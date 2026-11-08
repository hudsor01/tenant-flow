/**
 * @vitest-environment jsdom
 * Every `<ul>` and `<ol>` cancels the `@layer base` list rules (66.2-39 fix
 * round 3, part 7b).
 *
 * globals.css' `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` and
 * `li { margin-bottom: 0.25rem }` are prose styling, and preflight's
 * `list-style: none` leaves no marker for the inset to hang: an app list the
 * rule reaches sits 24px right of the heading above it, 16px further from
 * that heading than its classes declare, and 16px of empty space sits under
 * it inside every padded box it ends (the password checklist's popover, the
 * plan cards, the upgrade dialog, the checkout-cancelled panel).
 *
 * THE RULE. For each list in a non-test .tsx under src, the class string it is
 * written with is run through `computeListCascade` against the real base rules,
 * and each of the four values must come out 0 or be set by a utility of the
 * list's own: padding-left (`pl-*`, `px-*`, `p-*`), margin-top (`mt-*`, `my-*`,
 * `m-*`), margin-bottom (`mb-*`, `my-*`, `m-*`) and the items' margin-bottom
 * (`[&>li]:mb-*`). `space-y-*` cannot sit beside `[&>li]:mb-0`: its
 * specificity-0 `:where()` margin loses to the child variant, so the gap it
 * declares silently becomes 0 (`flex flex-col gap-*` is the canonical form).
 *
 * The class string is read from the source: a `className="…"` literal, or
 * every string literal in a `className={cn(…)}` call, which can only
 * over-count a conditional class. A list the parent spaces on purpose is in
 * INTENDED with its reason.
 *
 * RATCHET. The other hits sit in files this PR does not change and are
 * deferred (66.2 deferred-items); they are listed by file and count, so a new
 * hit fails and so does a fixed one until its entry goes. Each entry also holds
 * the file's git blob id at the PR's base, d9c7329f0 (`#test/utils/git-blob`):
 * a deferred file that changes fails the ratchet, so its hits are fixed in the
 * change that touches it rather than kept behind their entry (66.2-39 fix
 * round 4, Part 8b).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { computeListCascade } from "#test/utils/base-rule-cascade";
import { gitBlobId } from "#test/utils/git-blob";

const ROOT = process.cwd();

/** Hits in files this PR does not change: deferred, not fixed here, each with its blob at d9c7329f0. */
const DEFERRED: Record<string, readonly [hits: number, blob: string]> = {
	"src/app/privacy/page.tsx": [11, "b787e72998d6bfc3abcf221defd01320b1b825fe"],
	"src/app/security-policy/page.tsx": [
		6,
		"e573dca49e90859aae9b8708c2ed96240108116c",
	],
	"src/app/terms/page.tsx": [16, "a421bd86530a74e901f2d72519c31658eabaf6ab"],
	"src/components/dashboard/dashboard-activity-card.tsx": [
		1,
		"b19802c47ad4b87175aa27eeedd6f7e0085652f9",
	],
	"src/components/layout/footer.tsx": [
		1,
		"bcf99386eebfadd3fe25b5904671354ca7688ea4",
	],
	"src/components/leases/template/state-rule-summary.tsx": [
		1,
		"33d99e304a5182d78142103e845633f032b9f771",
	],
	"src/components/notifications/notification-popover-list.tsx": [
		1,
		"a93cbe45ea6dd284897823e6c7bfcf7632d002a1",
	],
	"src/components/notifications/notifications-inbox.client.tsx": [
		1,
		"9887cf96726efb1069afafe83a815b765115dbf2",
	],
	"src/components/ui/field.tsx": [
		1,
		"af8c9df150d91c52443dba4ea8d0a36520074682",
	],
};

/**
 * Lists whose open values are the design, by file and count. The recent
 * documents panel's list is a non-last child of a `space-y-4` wrapper, whose
 * utilities-layer `margin-block-end` replaces the base bottom margin (its
 * docblock says why it carries `mt-0` and not `my-0`).
 */
const INTENDED: Record<string, number> = {
	"src/app/(owner)/documents/recent-documents-panel.tsx": 1,
};

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			out.push(...collect(abs));
		} else if (
			entry.name.endsWith(".tsx") &&
			!/\.test\.tsx$/.test(entry.name)
		) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

/** Source with block comments (JSX `{/* … *\/}` included) and line comments blanked. */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(/^\s*\/\/.*$/gm, "");
}

interface ListTag {
	tag: "ul" | "ol";
	line: number;
	classes: string;
}

/** Each `<ul`/`<ol` opening tag, read to its closing `>` past strings and braces. */
function listTags(source: string): ListTag[] {
	const code = stripComments(source);
	const out: ListTag[] = [];
	for (const m of code.matchAll(/<(ul|ol)\b/g)) {
		let depth = 0;
		let quote: string | null = null;
		let end = m.index + m[0].length;
		for (; end < code.length; end++) {
			const c = code[end];
			if (quote) {
				if (c === quote) quote = null;
			} else if (c === '"' || c === "'" || c === "`") quote = c;
			else if (c === "{") depth++;
			else if (c === "}") depth--;
			else if (c === ">" && depth === 0) break;
		}
		const tag = code.slice(m.index, end + 1);
		out.push({
			tag: m[1] as "ul" | "ol",
			line: code.slice(0, m.index).split("\n").length,
			classes: classNameOf(tag),
		});
	}
	return out;
}

/** The class string a tag is written with (every literal of a `cn(…)` call). */
function classNameOf(tag: string): string {
	const literal = tag.match(/\bclassName="([^"]*)"/);
	if (literal) return literal[1] ?? "";
	const expression = tag.match(/\bclassName=\{([\s\S]*)\}/);
	if (!expression) return "";
	return [...(expression[1] ?? "").matchAll(/"([^"]*)"|`([^`]*)`/g)]
		.map((s) => s[1] ?? s[2] ?? "")
		.join(" ");
}

const DECLARES = {
	paddingLeft: /(?<![\w:[&>-])(?:pl|px|p)-/,
	marginTop: /(?<![\w:[&>-])(?:mt|my|m)-/,
	marginBottom: /(?<![\w:[&>-])(?:mb|my|m)-/,
	itemMarginBottom: /\[&>li\]:(?:mb|my|m)-/,
};

/** The base-rule values a list written with `classes` keeps (empty when none). */
function openValues(tag: "ul" | "ol", classes: string): string[] {
	const list = document.createElement(tag);
	list.setAttribute("class", classes);
	list.appendChild(document.createElement("li"));
	document.body.appendChild(list);
	try {
		const { neutralized } = computeListCascade(list);
		const open: string[] = [];
		const check = (name: keyof typeof DECLARES, value: string | null) => {
			if (value !== "0px" && !DECLARES[name].test(classes))
				open.push(`${name} ${value}`);
		};
		check("paddingLeft", neutralized.paddingLeft);
		check("marginTop", neutralized.marginTop);
		check("marginBottom", neutralized.marginBottom);
		check("itemMarginBottom", neutralized.firstChildMarginBottom);
		if (
			/(?<![\w:-])space-y-/.test(classes) &&
			DECLARES.itemMarginBottom.test(classes)
		)
			open.push("space-y-* beside [&>li]:mb-*");
		return open;
	} finally {
		list.remove();
	}
}

function offenders(): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const file of collect(join(ROOT, "src"))) {
		for (const list of listTags(readFileSync(join(ROOT, file), "utf8"))) {
			const open = openValues(list.tag, list.classes);
			if (open.length > 0)
				(out[file] ??= []).push(`:${list.line} ${open.join(", ")}`);
		}
	}
	return out;
}

describe("every list cancels the base ul, ol and li rules", () => {
	it("rests on the globals.css rules it guards against", () => {
		const probe = document.createElement("ul");
		probe.appendChild(document.createElement("li"));
		document.body.appendChild(probe);
		const { baseline } = computeListCascade(probe);
		probe.remove();
		expect(baseline).toMatchObject({
			paddingLeft: "24px",
			marginTop: "16px",
			marginBottom: "16px",
			firstChildMarginBottom: "4px",
		});
	});

	it("leaves no open list outside the deferred and intended files", () => {
		const counts = Object.fromEntries(
			Object.entries(offenders()).map(([file, hits]) => [file, hits.length]),
		);
		const deferred = Object.fromEntries(
			Object.entries(DEFERRED).map(([file, [hits]]) => [file, hits]),
		);
		expect(counts).toEqual({ ...deferred, ...INTENDED });
	});

	it("defers only files left as they were at the PR's base", () => {
		const changed = Object.entries(DEFERRED)
			.filter(([file, [, blob]]) => gitBlobId(join(ROOT, file)) !== blob)
			.map(([file]) => `${file} changed since d9c7329f0: fix its lists`);
		expect(changed).toEqual([]);
	});

	it("reads both className forms and flags each open value", () => {
		const tags = listTags(
			[
				'<ul className="space-y-2 text-sm">',
				'{/* <ul className="commented"> */}',
				'<ol data-slot="x" className={cn("flex flex-col gap-1 pl-0 mt-0 mb-0 [&>li]:mb-0", className)} {...props} />',
				'<ul className="mt-4 mb-0 pl-0 [&>li]:mb-0 flex">',
				'<ul className="space-y-1 pl-0 mt-0 mb-0 [&>li]:mb-0">',
			].join("\n"),
		);
		expect(tags.map((t) => t.line)).toEqual([1, 3, 4, 5]);
		expect(openValues(tags[0]!.tag, tags[0]!.classes)).toEqual([
			"paddingLeft 24px",
			"marginTop 16px",
			"marginBottom 16px",
			"itemMarginBottom 4px",
		]);
		expect(openValues(tags[1]!.tag, tags[1]!.classes)).toEqual([]);
		expect(openValues(tags[2]!.tag, tags[2]!.classes)).toEqual([]);
		expect(openValues(tags[3]!.tag, tags[3]!.classes)).toEqual([
			"space-y-* beside [&>li]:mb-*",
		]);
	});
});
