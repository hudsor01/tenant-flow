/**
 * @vitest-environment jsdom
 * A heading's subtitle carries no base paragraph margin (66.2-39 fix round 3,
 * the G2 class in its card- and page-header shape).
 *
 * globals.css' `@layer base` `p { margin-bottom: 1rem }` cannot leave a flex
 * item: a heading + subtitle block that is itself a flex item (a `<div>`
 * directly inside a flex container), or a subtitle that is one, holds the
 * 16px inside it. The analytics cards' headers stood 40px above their charts
 * where `mb-6` declares 24, with the icon beside them 8px below the text's
 * centre, and every page header the same 16px further from its page.
 *
 * The guard reads every non-test .tsx under src and finds both shapes with a
 * subtitle `<p>` that declares no margin (`m-`, `mb-` or `my-`). The base rule
 * itself is read from globals.css (`computeParagraphCascade`'s probe), so the
 * premise is checked, not assumed.
 *
 * RATCHET. The sweep's other hits sit in files this PR does not change and are
 * deferred (66.2 deferred-items); they are listed by file and count, so a new
 * hit fails and so does a fixed one until its entry goes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

const ROOT = process.cwd();

/** Hits in files this PR does not change: deferred, not fixed here. */
const DEFERRED: Record<string, number> = {
	"src/app/(owner)/reports/generate/page.tsx": 1,
	"src/app/marketing-home.tsx": 1,
	"src/app/pricing/page.tsx": 1,
	"src/components/error-boundary/error-fallback.tsx": 1,
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

const FLEX = String.raw`<div className="[^"]*(?<![\w:-])(?:flex|inline-flex|flex-between|flex-center)(?![\w-])[^"]*">`;
const HEADING = String.raw`<h[1-6]\b[^>]*>(?:(?!</h[1-6]>)[\s\S])*</h[1-6]>`;
const JSX_COMMENT = String.raw`(?:\{/\*(?:(?!\*/\})[\s\S])*\*/\}\s*)?`;
const BARE_SUBTITLE = String.raw`<p className="(?![^"]*(?<![\w:-])(?:m|mb|my)-)[^"]*"`;

/** The block (heading + subtitle) is a flex item: a div inside a flex container. */
const BLOCK_IN_FLEX = new RegExp(
	String.raw`${FLEX}\s*<div(?: className="[^"]*")?>\s*${HEADING}\s*${JSX_COMMENT}${BARE_SUBTITLE}`,
	"g",
);
/** The heading and subtitle are flex or grid items themselves. */
const SUBTITLE_IN_FLEX = new RegExp(
	String.raw`<div className="[^"]*(?<![\w:-])(?:flex|inline-flex|flex-between|flex-center|grid)(?![\w-])[^"]*">\s*${HEADING}\s*${JSX_COMMENT}${BARE_SUBTITLE}`,
	"g",
);

function hits(source: string): number {
	const starts = new Set<number>();
	for (const pattern of [BLOCK_IN_FLEX, SUBTITLE_IN_FLEX]) {
		for (const match of source.matchAll(pattern)) {
			// Both shapes can match one subtitle; count each subtitle once.
			starts.add(match.index + match[0].lastIndexOf("<p "));
		}
	}
	return starts.size;
}

describe("heading subtitles carry no base paragraph margin", () => {
	it("rests on the globals.css rule it guards against", () => {
		const probe = document.createElement("p");
		document.body.appendChild(probe);
		const { baseline } = computeParagraphCascade(probe);
		probe.remove();
		expect(baseline.marginBottom).toBe("16px");
	});

	it("leaves no bare subtitle in a flex item outside the deferred files", () => {
		const offenders: Record<string, number> = {};
		for (const file of collect(join(ROOT, "src"))) {
			const count = hits(readFileSync(join(ROOT, file), "utf8"));
			if (count > 0) offenders[file] = count;
		}
		expect(offenders).toEqual(DEFERRED);
	});

	it("finds both shapes and skips a subtitle that declares its margin", () => {
		const block = `<div className="flex items-center justify-between mb-6">
			<div>
				<h3 className="font-medium">Title</h3>
				<p className="text-sm text-muted-foreground">Subtitle</p>
			</div>
		</div>`;
		const items = `<div className="flex flex-col gap-2 mb-6">
			<h1 className="typography-h1">Title</h1>
			<p className="text-muted-foreground">Subtitle</p>
		</div>`;
		expect(hits(block)).toBe(1);
		expect(hits(items)).toBe(1);
		expect(
			hits(block.replace("text-sm text-muted", "mb-0 text-sm text-muted")),
		).toBe(0);
		expect(
			hits(
				items.replace(
					'"text-muted-foreground"',
					'"mt-1 mb-0 text-muted-foreground"',
				),
			),
		).toBe(0);
		expect(
			hits(`<div className="space-y-2">${block.slice(block.indexOf("<div>"))}`),
		).toBe(0);
	});
});
