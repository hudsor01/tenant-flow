/**
 * Controls for the layer that turns an AssertionResult into a gate verdict.
 *
 * THE MUTATION SWEEP DOES NOT REACH THIS FILE, and review found what that cost:
 * deleting the `%0A` escaping from both annotation helpers passed lint,
 * typecheck, the whole unit suite, the sweep's own summary and both gates --
 * after which the next real failure would have lost every line after its
 * first, which is the only thing those helpers exist for. A green gate never
 * calls them, so no end-to-end run could have noticed.
 *
 * The same was true of the pass/fail/unverified arithmetic, which lived inline
 * in a CLI: nothing checked that "5 of 5 checked invariants hold, 1 unverified"
 * agreed with the exit code, in the module whose thesis is that an unchecked
 * thing must not be counted as a passing one.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type AssertionResult,
	errorAnnotation,
	reportResult,
	summarizeResults,
	warningAnnotation,
} from "./assertion-result";

const pass: AssertionResult = { ok: true, message: "held" };
const unverified: AssertionResult = {
	ok: true,
	unverified: true,
	message: "could not look",
};
const fail: AssertionResult = { ok: false, message: "broken\nsecond line" };

afterEach(() => {
	vi.restoreAllMocks();
});

describe("annotation escaping", () => {
	it("escapes newlines, because GitHub keeps only the first line otherwise", () => {
		expect(errorAnnotation("a\nb")).toBe("::error::a%0Ab");
		expect(warningAnnotation("a\nb")).toBe("::warning::a%0Ab");
	});

	it("escapes every newline, not just the first", () => {
		expect(errorAnnotation("a\nb\nc")).toBe("::error::a%0Ab%0Ac");
	});

	it("leaves a single-line message alone", () => {
		expect(errorAnnotation("a")).toBe("::error::a");
	});
});

describe("reportResult", () => {
	it("annotates a failure as an error and says it failed", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		expect(reportResult("t", fail)).toBe(true);
		const lines = log.mock.calls.map((call) => String(call[0]));
		expect(lines.some((line) => line.startsWith("::error::"))).toBe(true);
		// Escaped in the annotation, readable in the plain line beneath it.
		expect(lines.some((line) => line.includes("%0A"))).toBe(true);
		expect(lines.some((line) => line.startsWith("FAIL  t:"))).toBe(true);
	});

	it("annotates an unverified result as a WARNING and does not call it a failure", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		expect(reportResult("t", unverified)).toBe(false);
		const lines = log.mock.calls.map((call) => String(call[0]));
		expect(lines.some((line) => line.startsWith("::warning::"))).toBe(true);
		expect(lines.some((line) => line.startsWith("::error::"))).toBe(false);
		expect(lines.some((line) => line.startsWith("UNVERIFIED  t:"))).toBe(true);
	});

	it("prints a pass with no annotation at all", () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
		expect(reportResult("t", pass)).toBe(false);
		const lines = log.mock.calls.map((call) => String(call[0]));
		expect(lines).toEqual(["PASS  t: held"]);
	});
});

describe("summarizeResults", () => {
	it("counts an unverified result out of `checked`, not into it", () => {
		// The whole point: "6 of 6" must not include something nothing checked.
		expect(summarizeResults([pass, pass, unverified])).toEqual({
			checked: 2,
			failed: 0,
			unverified: 1,
			exitCode: 0,
		});
	});

	it("exits 1 on a failure and 0 on an unverified result", () => {
		expect(summarizeResults([fail]).exitCode).toBe(1);
		expect(summarizeResults([unverified]).exitCode).toBe(0);
	});

	it("keeps checked - failed non-negative when everything fails", () => {
		const tally = summarizeResults([fail, fail]);
		expect(tally.checked - tally.failed).toBe(0);
	});

	it("handles an empty list without claiming anything held", () => {
		expect(summarizeResults([])).toEqual({
			checked: 0,
			failed: 0,
			unverified: 0,
			exitCode: 0,
		});
	});
});
