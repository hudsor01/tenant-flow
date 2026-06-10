import { describe, expect, it } from "vitest";
import { EVERGREEN_TOPICS } from "../evergreen-topics";

// Local copy of the valid categories — do NOT import from scripts/ (scripts must
// never become a runtime dependency of src/). Must match VALID_CATEGORIES in
// scripts/generate-blog-draft.ts (and the reclaim-queue drift guard).
const VALID_CATEGORIES = new Set([
	"lease-law",
	"tax-prep",
	"tenant-screening",
	"maintenance",
	"software-vault",
]);

describe("EVERGREEN_TOPICS", () => {
	it("is a non-empty list", () => {
		expect(EVERGREEN_TOPICS.length).toBeGreaterThan(0);
	});

	it("every entry uses a valid generator category", () => {
		for (const { topic, category } of EVERGREEN_TOPICS) {
			expect(
				VALID_CATEGORIES.has(category),
				`invalid category for "${topic}"`,
			).toBe(true);
		}
	});

	it("every topic is a non-empty, trimmed string", () => {
		for (const { topic } of EVERGREEN_TOPICS) {
			expect(topic.length).toBeGreaterThan(0);
			expect(topic).toBe(topic.trim());
		}
	});

	it("topics are unique (no duplicate seeds)", () => {
		const topics = EVERGREEN_TOPICS.map((entry) => entry.topic);
		expect(new Set(topics).size).toBe(topics.length);
	});
});
