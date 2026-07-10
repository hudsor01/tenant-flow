import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { main, nextUnwrittenTopic } from "./run-continuous-blog";
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

describe("main kill-switch", () => {
	// The continuous runner shares run-scheduled-blog's DEFAULT_LOCK_PATH; that
	// constant is module-private there, so derive the identical path here.
	const SHARED_LOCK_PATH = join(tmpdir(), "tenantflow-blog-factory.lock");

	afterEach(() => {
		delete process.env.BLOG_FACTORY_OFF;
		rmSync(SHARED_LOCK_PATH, { force: true });
	});

	it("returns 0 and never acquires the shared lock when BLOG_FACTORY_OFF=1", async () => {
		rmSync(SHARED_LOCK_PATH, { force: true }); // start from a clean slate
		process.env.BLOG_FACTORY_OFF = "1";
		await expect(main()).resolves.toBe(0);
		// The kill-switch runs BEFORE acquireLock, so the shared lock is untouched.
		expect(existsSync(SHARED_LOCK_PATH)).toBe(false);
	});
});
