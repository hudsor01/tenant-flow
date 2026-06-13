import { describe, expect, it } from "vitest";
import { nextUnwrittenTopic } from "./run-continuous-blog";
import type { BlogTopicEntry } from "./run-scheduled-blog";

const entry = (
	slug: string,
	tier: "reclaim" | "evergreen" = "evergreen",
): BlogTopicEntry => ({
	topic: `Topic for ${slug} with enough length`,
	category: "software-vault",
	slug,
	tier,
});

const bank = [entry("a-one"), entry("b-two"), entry("c-three")];

describe("nextUnwrittenTopic", () => {
	it("picks the first topic that is neither written nor skipped", () => {
		expect(nextUnwrittenTopic(bank, new Set(["a-one"]), new Set())?.slug).toBe(
			"b-two",
		);
	});

	it("treats a skipped slug as blocked (never re-picks a poison topic)", () => {
		// a-one written, b-two skipped -> next must be c-three, not b-two
		expect(
			nextUnwrittenTopic(bank, new Set(["a-one"]), new Set(["b-two"]))?.slug,
		).toBe("c-three");
	});

	it("picks the very first entry when nothing is written or skipped", () => {
		expect(nextUnwrittenTopic(bank, new Set(), new Set())?.slug).toBe("a-one");
	});

	it("returns undefined when every topic is written or skipped (loop terminates)", () => {
		expect(
			nextUnwrittenTopic(
				bank,
				new Set(["a-one", "b-two"]),
				new Set(["c-three"]),
			),
		).toBeUndefined();
	});
});
