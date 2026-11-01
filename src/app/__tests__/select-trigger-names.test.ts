/**
 * Every first-party SelectTrigger has an accessible name (66.2-39).
 *
 * A Radix SelectTrigger is a `combobox` button whose text is the selected
 * value, so without a name a screen reader announces a bare "combobox". The
 * report headers shipped eight such triggers and four more forms and filters
 * had one each. Each trigger needs an `aria-label` (starting with the value it
 * shows, WCAG 2.5.3), an `aria-labelledby`, or an `id` a `<Label htmlFor>`
 * points at.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const OPENING_TAG = /<SelectTrigger\b((?:=>|[^>])*)>/g;
const NAMED = /\baria-label(?:ledby)?=|\bid=/;

function sources(): { path: string; text: string }[] {
	return readdirSync(SRC, { recursive: true, encoding: "utf8" })
		.filter((rel) => rel.endsWith(".tsx"))
		.filter((rel) => !/(^|\/)__tests__\/|\.test\.tsx$/.test(rel))
		.filter((rel) => rel !== join("components", "ui", "select.tsx"))
		.map((rel) => ({
			path: relative(process.cwd(), join(SRC, rel)),
			text: readFileSync(join(SRC, rel), "utf8"),
		}));
}

describe("SelectTrigger accessible names", () => {
	it("names every first-party SelectTrigger", () => {
		const unnamed: string[] = [];
		let checked = 0;
		for (const { path, text } of sources()) {
			for (const match of text.matchAll(OPENING_TAG)) {
				checked += 1;
				if (!NAMED.test(match[1] ?? "")) {
					const line = text.slice(0, match.index).split("\n").length;
					unnamed.push(`${path}:${line}`);
				}
			}
		}
		expect(checked).toBeGreaterThan(30);
		expect(
			unnamed,
			`SelectTrigger(s) with no aria-label, aria-labelledby or id:\n${unnamed.join("\n")}`,
		).toEqual([]);
	});
});
