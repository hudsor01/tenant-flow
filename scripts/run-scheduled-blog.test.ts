import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { BlogTopicEntry } from "./run-scheduled-blog";
import {
	acquireLock,
	buildFbTriggerArgv,
	fetchAllSlugs,
	isFactoryStopped,
	mapTopicEntry,
	pickNextTopic,
	releaseLock,
	STOP_SENTINEL_PATH,
	triggerFbPostSession,
} from "./run-scheduled-blog";

const entry = (
	slug: string,
	tier: "reclaim" | "evergreen",
): BlogTopicEntry => ({
	topic: `Topic for ${slug} with enough length`,
	category: "software-vault",
	slug,
	tier,
});

describe("pickNextTopic", () => {
	const bank = [
		entry("a-one", "reclaim"),
		entry("b-two", "reclaim"),
		entry("c-three", "evergreen"),
	];

	it("picks the first topic whose slug is not yet written", () => {
		expect(pickNextTopic(bank, new Set(["a-one"]))?.slug).toBe("b-two");
	});

	it("picks the very first entry when nothing is written", () => {
		expect(pickNextTopic(bank, new Set())?.slug).toBe("a-one");
	});

	it("returns undefined when the bank is exhausted", () => {
		expect(
			pickNextTopic(bank, new Set(["a-one", "b-two", "c-three"])),
		).toBeUndefined();
	});
});

describe("mapTopicEntry", () => {
	it("maps a valid entry", () => {
		expect(
			mapTopicEntry({
				topic: "A valid topic title",
				category: "lease-law",
				slug: "a-valid-slug",
				tier: "evergreen",
			}),
		).toEqual({
			topic: "A valid topic title",
			category: "lease-law",
			slug: "a-valid-slug",
			tier: "evergreen",
		});
	});

	it("throws on a bad slug", () => {
		expect(() =>
			mapTopicEntry({
				topic: "t",
				category: "lease-law",
				slug: "Bad Slug!",
				tier: "evergreen",
			}),
		).toThrow(/bad slug/);
	});

	it("throws on a bad tier", () => {
		expect(() =>
			mapTopicEntry({
				topic: "t",
				category: "lease-law",
				slug: "ok-slug",
				tier: "weekly",
			}),
		).toThrow(/bad tier/);
	});
});

describe("fetchAllSlugs", () => {
	it("paginates until a short page and collects every slug", async () => {
		const pages = [
			{ data: [{ slug: "p1-a" }, { slug: "p1-b" }], error: null },
			{ data: [{ slug: "p2-a" }], error: null },
		];
		let call = 0;
		const result = await fetchAllSlugs(async () => {
			const page = pages[call] ?? { data: [], error: null };
			call++;
			return page;
		}, 2);
		expect(call).toBe(2);
		expect([...result].sort()).toEqual(["p1-a", "p1-b", "p2-a"]);
	});

	it("rejects on a page error — never a silent partial set", async () => {
		await expect(
			fetchAllSlugs(async () => ({
				data: null,
				error: { message: "permission denied" },
			})),
		).rejects.toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("overlap lock", () => {
	const lockPath = join(tmpdir(), `tf-blog-lock-test-${process.pid}.lock`);

	afterEach(() => {
		releaseLock(lockPath);
	});

	it("acquires when no lock exists and records the pid", () => {
		expect(acquireLock(process.pid, lockPath)).toBe(true);
		expect(readFileSync(lockPath, "utf8")).toBe(String(process.pid));
	});

	it("refuses while the holder process is alive", () => {
		expect(acquireLock(process.pid, lockPath)).toBe(true);
		// process.pid is this very test process — definitely alive
		expect(acquireLock(process.pid, lockPath)).toBe(false);
	});

	it("reclaims a stale lock left by a dead process", () => {
		// PID 4194304 exceeds the macOS/Linux default pid_max — never alive.
		writeFileSync(lockPath, "4194304");
		expect(acquireLock(process.pid, lockPath)).toBe(true);
		expect(readFileSync(lockPath, "utf8")).toBe(String(process.pid));
	});

	it("reclaims a corrupted lockfile", () => {
		writeFileSync(lockPath, "not-a-pid");
		expect(acquireLock(process.pid, lockPath)).toBe(true);
	});

	it("releaseLock removes the file and is idempotent", () => {
		expect(acquireLock(process.pid, lockPath)).toBe(true);
		releaseLock(lockPath);
		expect(existsSync(lockPath)).toBe(false);
		releaseLock(lockPath); // no throw on second call
	});
});

describe("isFactoryStopped (kill-switch)", () => {
	const sentinel = join(tmpdir(), `tf-blog-off-test-${process.pid}`);

	afterEach(() => {
		if (existsSync(sentinel)) rmSync(sentinel);
	});

	it("is false when neither the env flag nor the sentinel is present", () => {
		expect(isFactoryStopped({}, sentinel)).toBe(false);
	});

	it("is true when BLOG_FACTORY_OFF=1 (sentinel absent)", () => {
		expect(isFactoryStopped({ BLOG_FACTORY_OFF: "1" }, sentinel)).toBe(true);
	});

	it("ignores BLOG_FACTORY_OFF values other than '1'", () => {
		expect(isFactoryStopped({ BLOG_FACTORY_OFF: "0" }, sentinel)).toBe(false);
		expect(isFactoryStopped({ BLOG_FACTORY_OFF: "true" }, sentinel)).toBe(
			false,
		);
	});

	it("is true when the sentinel file exists (env flag absent)", () => {
		writeFileSync(sentinel, "paused");
		expect(isFactoryStopped({}, sentinel)).toBe(true);
	});

	it("defaults the sentinel path to a persistent home dotfile", () => {
		expect(STOP_SENTINEL_PATH).toMatch(/\.tenantflow-blog-factory\.off$/);
	});
});

describe("buildFbTriggerArgv", () => {
	it("builds a headless prompt pinned to the slug with a strict tool allowlist", () => {
		const argv = buildFbTriggerArgv("my-new-post");
		expect(argv[0]).toBe("-p");
		expect(argv[1]).toContain('"my-new-post"');
		expect(argv[1]).toContain("scripts/fb-post-voice-guide.md");
		const allowed = argv[argv.indexOf("--allowedTools") + 1];
		expect(allowed).toBe("Read,Write,Bash(bun:*)");
		expect(argv).toContain("--max-turns");
	});
});

describe("triggerFbPostSession", () => {
	it("is a no-op when FB_POST_TRIGGER=0", () => {
		const prev = process.env.FB_POST_TRIGGER;
		process.env.FB_POST_TRIGGER = "0";
		try {
			// Would throw on spawn of a nonexistent binary if the guard failed.
			process.env.CLAUDE_BIN = "/nonexistent/claude-binary";
			expect(() => triggerFbPostSession("any-slug")).not.toThrow();
		} finally {
			if (prev === undefined) delete process.env.FB_POST_TRIGGER;
			else process.env.FB_POST_TRIGGER = prev;
			delete process.env.CLAUDE_BIN;
		}
	});

	it("never throws even when the binary is missing (fail-open)", () => {
		const prev = process.env.FB_POST_TRIGGER;
		delete process.env.FB_POST_TRIGGER;
		process.env.CLAUDE_BIN = "/nonexistent/claude-binary";
		try {
			expect(() => triggerFbPostSession("any-slug")).not.toThrow();
		} finally {
			if (prev !== undefined) process.env.FB_POST_TRIGGER = prev;
			delete process.env.CLAUDE_BIN;
		}
	});
});
