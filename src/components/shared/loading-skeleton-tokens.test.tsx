import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relPath: string): string {
	return readFileSync(join(process.cwd(), relPath), "utf8");
}

const CHART_SKELETON_SOURCE = readSource(
	"src/components/shared/chart-loading-skeleton.tsx",
);
const BLOG_SKELETON_SOURCE = readSource(
	"src/components/shared/blog-loading-skeleton.tsx",
);
const BLOG_EMPTY_STATE_SOURCE = readSource(
	"src/components/shared/blog-empty-state.tsx",
);

const NON_ZERO_MS_LITERAL = /"[1-9]\d*ms"/;
// blog-loading-skeleton keeps the inline-style token form.
const TOKENIZED_DELAY_INLINE = /animationDelay: "var\(--duration-/g;
// HYG-28/29 moved chart-loading-skeleton + blog-empty-state to the canonical
// Tailwind arbitrary-value form `[animation-delay:var(--duration-*)]`.
const TOKENIZED_DELAY_CLASS = /\[animation-delay:var\(--duration-/g;

describe("shared loading/empty-state skeleton duration tokens (TOKEN-02)", () => {
	it("chart-loading-skeleton has no non-zero inline-ms string literals", () => {
		expect(
			CHART_SKELETON_SOURCE,
			"TOKEN-02: chart-loading-skeleton.tsx must contain no non-zero inline-ms literals",
		).not.toMatch(NON_ZERO_MS_LITERAL);
	});

	it("chart-loading-skeleton has 4 tokenized animation-delay references", () => {
		expect(
			CHART_SKELETON_SOURCE.match(TOKENIZED_DELAY_CLASS)?.length ?? 0,
			"TOKEN-02: chart-loading-skeleton.tsx must have 4 var(--duration-*) delays",
		).toBe(4);
	});

	it("chart-loading-skeleton keeps the 0ms zero-case untouched", () => {
		expect(
			CHART_SKELETON_SOURCE,
			"0ms is the documented zero-case and must stay unedited",
		).toContain("[animation-delay:0ms]");
	});

	it("blog-loading-skeleton has no non-zero inline-ms string literals", () => {
		expect(
			BLOG_SKELETON_SOURCE,
			"TOKEN-02: blog-loading-skeleton.tsx must contain no non-zero inline-ms literals",
		).not.toMatch(NON_ZERO_MS_LITERAL);
	});

	it("blog-loading-skeleton has 6 tokenized animationDelay references", () => {
		expect(
			BLOG_SKELETON_SOURCE.match(TOKENIZED_DELAY_INLINE)?.length ?? 0,
			"TOKEN-02: blog-loading-skeleton.tsx must have 6 var(--duration-*) delays",
		).toBe(6);
	});

	it("blog-loading-skeleton keeps the 0ms zero-case untouched", () => {
		expect(
			BLOG_SKELETON_SOURCE,
			"0ms is the documented zero-case and must stay unedited",
		).toContain('animationDelay: "0ms"');
	});

	it("blog-empty-state has no non-zero inline-ms string literals", () => {
		expect(
			BLOG_EMPTY_STATE_SOURCE,
			"TOKEN-02: blog-empty-state.tsx must contain no non-zero inline-ms literals",
		).not.toMatch(NON_ZERO_MS_LITERAL);
	});

	it("blog-empty-state has 3 tokenized animation-delay references", () => {
		expect(
			BLOG_EMPTY_STATE_SOURCE.match(TOKENIZED_DELAY_CLASS)?.length ?? 0,
			"TOKEN-02: blog-empty-state.tsx must have 3 var(--duration-*) delays",
		).toBe(3);
	});

	it("blog-empty-state keeps the 0ms zero-case untouched", () => {
		expect(
			BLOG_EMPTY_STATE_SOURCE,
			"0ms is the documented zero-case and must stay unedited",
		).toContain("[animation-delay:0ms]");
	});
});
