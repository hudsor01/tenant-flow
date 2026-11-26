import { describe, expect, it } from "vitest";
import { faqAnchor } from "#lib/seo/faq-anchor";
import { faqData } from "../../../data/faqs";

describe("faqAnchor (2026-11-24 SEO audit Q12)", () => {
	it("turns a question into the fragment a link would use", () => {
		expect(faqAnchor("Do my tenants create accounts or log in?")).toBe(
			"do-my-tenants-create-accounts-or-log-in",
		);
		expect(faqAnchor("Security & Compliance")).toBe("security-compliance");
	});

	it("gives every /faq question and group its own anchor", () => {
		const anchors = faqData.flatMap((group) => [
			faqAnchor(group.category),
			...group.questions.map((q) => faqAnchor(q.question)),
		]);
		expect(new Set(anchors).size).toBe(anchors.length);
		for (const anchor of anchors)
			expect(anchor).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});
});
