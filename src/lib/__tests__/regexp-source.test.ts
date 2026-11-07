/**
 * The regex building blocks in `src/test/utils/regexp-source.ts`.
 *
 * This file sits here, beside the other source guards, and not in
 * `src/test/__tests__/`: `tsconfig.json` excludes `src/test/`, so a test there
 * is never type-checked. The module itself is, through the files importing it.
 */
import { describe, expect, it } from "vitest";
import {
	escapeRegExp,
	identifierSource,
	JSX_CHILD_GAP,
} from "#test/utils/regexp-source";

/** Every character that is special in a pattern outside a character class. */
const METACHARACTERS = "\\^$.*+?()[]{}|";

describe("escapeRegExp", () => {
	it("matches every metacharacter as itself, alone and together", () => {
		for (const text of [...METACHARACTERS, METACHARACTERS, "a.b$c(d)"]) {
			expect(new RegExp(`^${escapeRegExp(text)}$`).test(text), text).toBe(true);
		}
	});

	it("matches nothing a metacharacter would have stood for", () => {
		expect(new RegExp(escapeRegExp("a.b")).test("axb")).toBe(false);
		expect(new RegExp(escapeRegExp("a+")).test("aa")).toBe(false);
		expect(new RegExp(`^${escapeRegExp("$x")}`).test("$x")).toBe(true);
		expect(new RegExp(escapeRegExp("a|b")).test("b")).toBe(false);
	});

	it("stays valid source under the u and v flags", () => {
		for (const flags of ["u", "v"]) {
			expect(
				new RegExp(`^${escapeRegExp(METACHARACTERS)}$`, flags).test(
					METACHARACTERS,
				),
			).toBe(true);
		}
	});

	it("leaves every other character as it is", () => {
		expect(escapeRegExp("lease_status-1 /x")).toBe("lease_status-1 /x");
	});
});

describe("identifierSource", () => {
	it("matches a name holding `$` after a space and at a line start", () => {
		const pattern = new RegExp(identifierSource("$rows"), "m");
		expect(pattern.test("\t$rows.push(1)")).toBe(true);
		expect(pattern.test("$rows.push(1)")).toBe(true);
	});

	it("does not match inside a longer identifier", () => {
		const pattern = new RegExp(identifierSource("rows"));
		for (const text of ["$rows", "rows$", "_rows", "rowsTotal", "allrows"]) {
			expect(pattern.test(text), text).toBe(false);
		}
		expect(pattern.test("x.rows")).toBe(true);
	});

	it("takes a member path and a list of names", () => {
		expect(
			new RegExp(identifierSource("mutationKeys.reports")).test(
				"mutationKeysXreports",
			),
		).toBe(false);
		const either = new RegExp(`^${identifierSource(["a", "b$"])}$`);
		expect(either.test("a")).toBe(true);
		expect(either.test("b$")).toBe(true);
		expect(either.test("ab$")).toBe(false);
	});

	it("refuses an empty list, which would match at every boundary", () => {
		expect(() => identifierSource([])).toThrow("identifierSource needs a name");
	});
});

describe("JSX_CHILD_GAP", () => {
	const firstChild = new RegExp(`<A>${JSX_CHILD_GAP}<(\\w+)`);

	it("skips whitespace and comments to the first child", () => {
		expect(firstChild.exec("<A>\n\t<B>")?.[1]).toBe("B");
		expect(firstChild.exec("<A>{/* x */}\n\t{/* y */} <B>")?.[1]).toBe("B");
		expect(firstChild.exec("<A>{/* a * / } still a comment */}<B>")?.[1]).toBe(
			"B",
		);
	});

	it("ends a comment at its first `*/}`, so it cannot swallow a child", () => {
		expect(firstChild.exec("<A>{/* a */}<B>{/* b */}<C>")?.[1]).toBe("B");
		// A body that could run on past `*/}` read `<B>` as comment text here.
		const childC = new RegExp(`<A>${JSX_CHILD_GAP}<C\\b`);
		expect(childC.test("<A>{/* a */}<B>{/* b */}<C>")).toBe(false);
		expect(firstChild.test("<A>{/* a */}text<B>")).toBe(false);
	});

	it("fails in linear time on adversarial comment runs", () => {
		// A run of comments with nothing after it split 2^n ways under the old
		// `[\s\S]*?` body: 34 of them took seconds. Each input here takes about a
		// millisecond at most now; the bound only separates the two. The short
		// run comes first, so the old gap fails before the long ones.
		for (const input of [
			`<A>${"{/* x */}".repeat(34)}`,
			`<A>${"{/* x */}".repeat(20_000)}`,
			`<A>{/*${"*/}}{{/*".repeat(20_000)}`,
			`<A>{/*${" x".repeat(100_000)}`,
		]) {
			const start = performance.now();
			expect(firstChild.test(input)).toBe(false);
			expect(performance.now() - start).toBeLessThan(1000);
		}
	});
});
