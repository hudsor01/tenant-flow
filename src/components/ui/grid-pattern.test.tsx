import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GRID_PATTERN_SOURCE = readFileSync(
	join(process.cwd(), "src/components/ui/grid-pattern.tsx"),
	"utf8",
);
const LOADING_SPINNER_SOURCE = readFileSync(
	join(process.cwd(), "src/components/ui/loading-spinner.tsx"),
	"utf8",
);

describe("grid-pattern.tsx / loading-spinner.tsx duration token alignment (TOKEN-02)", () => {
	it("grid-pattern uses var(--duration-500) for the SVG-level animationDuration", () => {
		expect(
			GRID_PATTERN_SOURCE,
			"TOKEN-02: grid-pattern.tsx SVG animationDuration must reference var(--duration-500)",
		).toContain(
			'animationDuration: animated ? "var(--duration-500)" : undefined',
		);
	});

	it("grid-pattern uses var(--duration-200) for the per-square animationDuration", () => {
		expect(
			GRID_PATTERN_SOURCE,
			"TOKEN-02: grid-pattern.tsx per-square animationDuration must reference var(--duration-200)",
		).toContain(
			'animationDuration: animated ? "var(--duration-200)" : undefined',
		);
	});

	it("grid-pattern keeps the computed template-literal stagger untouched", () => {
		expect(
			GRID_PATTERN_SOURCE,
			"computed staggers are not static drift and must not be edited",
		).toContain("`${(x + y) * 100}ms`");
	});

	it("grid-pattern has no non-zero inline-ms string literals", () => {
		expect(
			GRID_PATTERN_SOURCE,
			"TOKEN-02: grid-pattern.tsx must contain no non-zero inline-ms literals",
		).not.toMatch(/"[1-9]\d*ms"/);
	});

	it("loading-spinner uses var(--duration-200) for the second dot delay", () => {
		expect(
			LOADING_SPINNER_SOURCE,
			"TOKEN-02: loading-spinner.tsx second dot delay must reference var(--duration-200)",
		).toContain("[animation-delay:var(--duration-200)]");
	});

	it("loading-spinner uses var(--duration-300) for the third dot delay (400ms snap)", () => {
		expect(
			LOADING_SPINNER_SOURCE,
			"TOKEN-02: loading-spinner.tsx third dot delay must snap to var(--duration-300)",
		).toContain("[animation-delay:var(--duration-300)]");
	});

	it("loading-spinner keeps the 0ms zero-case untouched", () => {
		expect(
			LOADING_SPINNER_SOURCE,
			"0ms is the documented zero-case and must stay unedited",
		).toContain("[animation-delay:0ms]");
	});

	it("loading-spinner has no non-zero inline-ms arbitrary-value durations", () => {
		expect(
			LOADING_SPINNER_SOURCE,
			"TOKEN-02: loading-spinner.tsx must contain no non-zero [animation-delay:NNNms] literals",
		).not.toMatch(/\[animation-delay:[1-9]\d*ms\]/);
	});
});
