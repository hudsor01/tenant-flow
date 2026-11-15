import { describe, expect, it } from "vitest";
import { stripTitleHeading } from "./strip-title-heading";

const TITLE = "What to Look for During Inspections";

describe("stripTitleHeading", () => {
	it("drops an opening H1 that repeats the title, with the blank lines after it", () => {
		expect(
			stripTitleHeading(`# ${TITLE}\n\nIntro paragraph.\n\n## First`, TITLE),
		).toBe("Intro paragraph.\n\n## First");
	});

	it("matches the title regardless of case and spacing", () => {
		expect(
			stripTitleHeading(
				"#   what to look for  during INSPECTIONS  \nIntro.",
				TITLE,
			),
		).toBe("Intro.");
	});

	it("drops it after leading blank lines and handles CRLF", () => {
		expect(stripTitleHeading(`\n\n# ${TITLE}\r\n\r\nIntro.`, TITLE)).toBe(
			"Intro.",
		);
	});

	it("keeps an opening H1 that is not the title", () => {
		const body = "# Understanding Deposits\n\nIntro.";
		expect(stripTitleHeading(body, TITLE)).toBe(body);
	});

	it("keeps a body that opens with an H2", () => {
		const body = `## ${TITLE}\n\nIntro.`;
		expect(stripTitleHeading(body, TITLE)).toBe(body);
	});

	it("keeps a title H1 that is not the first line", () => {
		const body = `Intro.\n\n# ${TITLE}\n\nMore.`;
		expect(stripTitleHeading(body, TITLE)).toBe(body);
	});

	it("needs a space after the hash, as markdown does", () => {
		const body = `#${TITLE}\n\nIntro.`;
		expect(stripTitleHeading(body, TITLE)).toBe(body);
	});

	it("returns an empty body unchanged", () => {
		expect(stripTitleHeading("", TITLE)).toBe("");
	});
});
