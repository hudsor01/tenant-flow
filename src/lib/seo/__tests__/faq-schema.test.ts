import { describe, expect, it } from "vitest";

import { createFaqJsonLd, parseFaqSection } from "../faq-schema";

/** Convert schema-dts readonly result to plain JSON for easier assertions */
function toPlain(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

describe("createFaqJsonLd", () => {
	const sampleItems = [
		{
			question: "What is TenantFlow?",
			answer: "Property management software.",
		},
		{ question: "How much does it cost?", answer: "Free plan available." },
	];

	it("returns object with @type FAQPage", () => {
		const result = toPlain(createFaqJsonLd(sampleItems));
		expect(result["@type"]).toBe("FAQPage");
	});

	it("mainEntity array has correct length", () => {
		const result = toPlain(createFaqJsonLd(sampleItems));
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>;
		expect(mainEntity).toHaveLength(2);
	});

	it("each item is @type Question with acceptedAnswer of @type Answer", () => {
		const result = toPlain(createFaqJsonLd(sampleItems));
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>;

		for (const item of mainEntity) {
			expect(item["@type"]).toBe("Question");
			const answer = item.acceptedAnswer as Record<string, unknown>;
			expect(answer["@type"]).toBe("Answer");
		}
	});

	it("question and answer text match inputs exactly", () => {
		const result = toPlain(createFaqJsonLd(sampleItems));
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>;

		expect(mainEntity[0]?.name).toBe("What is TenantFlow?");
		const firstAnswer = mainEntity[0]?.acceptedAnswer as Record<
			string,
			unknown
		>;
		expect(firstAnswer.text).toBe("Property management software.");

		expect(mainEntity[1]?.name).toBe("How much does it cost?");
		const secondAnswer = mainEntity[1]?.acceptedAnswer as Record<
			string,
			unknown
		>;
		expect(secondAnswer.text).toBe("Free plan available.");
	});

	it("empty array returns FAQPage with empty mainEntity", () => {
		const result = toPlain(createFaqJsonLd([]));
		expect(result["@type"]).toBe("FAQPage");
		const mainEntity = result.mainEntity as Array<Record<string, unknown>>;
		expect(mainEntity).toHaveLength(0);
	});
});

describe("parseFaqSection", () => {
	const body = [
		"# Title",
		"",
		"Intro paragraph that is not a FAQ.",
		"",
		"## FAQ",
		"",
		"### What is TenantFlow?",
		"",
		"Property management software for independent landlords.",
		"",
		"### How much does it cost?",
		"",
		"Plans start at $19/mo with a 14-day free trial.",
		"",
		"### Do tenants log in?",
		"",
		"No. Tenants are records, not users — there is no tenant portal.",
		"",
	].join("\n");

	it("extracts every question/answer pair under a `## FAQ` heading", () => {
		const items = parseFaqSection(body);
		expect(items).toHaveLength(3);
		expect(items[0]).toEqual({
			question: "What is TenantFlow?",
			answer: "Property management software for independent landlords.",
		});
		expect(items[2]?.question).toBe("Do tenants log in?");
	});

	it("recognizes `## Frequently Asked Questions` (case-insensitive)", () => {
		const content = [
			"## frequently asked questions",
			"",
			"### Q1",
			"A1 answer.",
			"",
			"### Q2",
			"A2 answer.",
		].join("\n");
		const items = parseFaqSection(content);
		expect(items).toHaveLength(2);
		expect(items[1]).toEqual({ question: "Q2", answer: "A2 answer." });
	});

	it("returns [] when there is no FAQ section", () => {
		const content = "## Overview\n\n### Not a FAQ\n\nBody text.";
		expect(parseFaqSection(content)).toEqual([]);
	});

	it("stops at the next `## ` heading after the FAQ section", () => {
		const content = [
			"## FAQ",
			"### Q1",
			"A1.",
			"## Conclusion",
			"### Not a question",
			"Wrap-up prose.",
		].join("\n");
		const items = parseFaqSection(content);
		expect(items).toHaveLength(1);
		expect(items[0]?.question).toBe("Q1");
	});

	it("joins multi-paragraph answers and trims whitespace", () => {
		const content = [
			"## FAQ",
			"### Multi",
			"First paragraph.",
			"",
			"Second paragraph.",
		].join("\n");
		const items = parseFaqSection(content);
		expect(items[0]?.answer).toBe("First paragraph.\n\nSecond paragraph.");
	});

	it("skips a question with no answer body", () => {
		const content = ["## FAQ", "### Lonely question", "", "### Q2", "A2."].join(
			"\n",
		);
		const items = parseFaqSection(content);
		expect(items).toHaveLength(1);
		expect(items[0]?.question).toBe("Q2");
	});
});
