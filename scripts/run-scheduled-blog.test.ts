import { describe, expect, it } from "vitest";
import type { BlogTopicEntry } from "./run-scheduled-blog";
import {
	fetchAllSlugs,
	mapTopicEntry,
	pickNextTopic,
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
