import { describe, expect, it } from "vitest";
import type { CalendarEntry } from "./fb-append-post";
import {
	DAILY_SLOTS,
	dayAfter,
	lintFbCopy,
	mapCalendarEntry,
	nextFreeSlot,
	renderCalendarDoc,
	slotSortKey,
} from "./fb-append-post";

const entry = (
	date: string,
	time: string,
	slug = `post-${date}-${time.replace(/[^0-9]/g, "")}`,
): CalendarEntry => ({
	date,
	time,
	title: `Title for ${slug}`,
	slug,
	category: "lease-law",
	copy: "copy",
	first_comment: `https://tenantflow.app/blog/${slug}`,
});

const CLEAN_COPY = `One for the Colorado landlords here.

Your default deposit return window is one month, not 60 days.

We wrote up the rules, nothing locked behind an email. The breakdown is linked in the comments.

Anyone here with Colorado rentals? Tell me what your lease says and I'll tell you which deadline you're on.

#SecurityDeposit #LandlordTips #LandlordLife`;

describe("dayAfter", () => {
	it("advances one day", () => {
		expect(dayAfter("2026-06-12")).toBe("2026-06-13");
	});

	it("crosses month boundaries", () => {
		expect(dayAfter("2026-06-30")).toBe("2026-07-01");
	});
});

describe("nextFreeSlot", () => {
	it("starts at the first slot of the day after fromYmd", () => {
		expect(nextFreeSlot([], "2026-06-12")).toEqual({
			date: "2026-06-13",
			time: "9:00 AM",
		});
	});

	it("fills the next slot on a partially used day", () => {
		const taken = [entry("2026-06-13", "9:00 AM")];
		expect(nextFreeSlot(taken, "2026-06-12")).toEqual({
			date: "2026-06-13",
			time: "1:00 PM",
		});
	});

	it("rolls to the next day when all slots are taken", () => {
		const taken = DAILY_SLOTS.map((t) => entry("2026-06-13", t));
		expect(nextFreeSlot(taken, "2026-06-12")).toEqual({
			date: "2026-06-14",
			time: "9:00 AM",
		});
	});

	it("ignores legacy 10:00 AM anchors when counting slots", () => {
		const taken = [entry("2026-06-15", "10:00 AM")];
		expect(nextFreeSlot(taken, "2026-06-14")).toEqual({
			date: "2026-06-15",
			time: "9:00 AM",
		});
	});

	it("fills gap days before extending the tail", () => {
		const taken = [
			...DAILY_SLOTS.map((t) => entry("2026-06-13", t)),
			entry("2026-06-14", "9:00 AM"),
			...DAILY_SLOTS.map((t) => entry("2026-06-15", t)),
		];
		expect(nextFreeSlot(taken, "2026-06-12")).toEqual({
			date: "2026-06-14",
			time: "1:00 PM",
		});
	});
});

describe("lintFbCopy", () => {
	it("passes clean copy", () => {
		expect(lintFbCopy(CLEAN_COPY)).toEqual([]);
	});

	it("flags em-dashes", () => {
		expect(
			lintFbCopy(CLEAN_COPY.replace("not 60 days", "not 60 days — ever")),
		).toContain("em/en dash");
	});

	it("flags exclamation marks", () => {
		expect(lintFbCopy(CLEAN_COPY.replace("here.", "here!"))).toContain(
			"exclamation mark",
		);
	});

	it("flags persona leaks", () => {
		expect(
			lintFbCopy(CLEAN_COPY.replace("landlords", "property owners")),
		).toContain("'property owner' persona leak");
	});

	it("flags wrong hashtag count", () => {
		expect(lintFbCopy(CLEAN_COPY.replace(" #LandlordLife", ""))).toContain(
			"hashtags=2 (need exactly 3)",
		);
	});

	it("flags engagement-bait verbs", () => {
		expect(
			lintFbCopy(
				CLEAN_COPY.replace("Tell me what", "Drop your state and what"),
			),
		).toContain("engagement-bait verb");
	});

	it("flags crutch phrases", () => {
		expect(
			lintFbCopy(CLEAN_COPY.replace("One for the", "Quick gut check for the")),
		).toContain("overused crutch phrase");
	});

	it("flags a missing closing question", () => {
		const noQuestion = CLEAN_COPY.replace(
			"Anyone here with Colorado rentals? Tell me what your lease says and I'll tell you which deadline you're on.",
			"Worth checking your lease today.",
		);
		expect(lintFbCopy(noQuestion)).toContain("no closing question");
	});

	it("flags a missing comments pointer", () => {
		const noPointer = CLEAN_COPY.replace(
			"The breakdown is linked in the comments.",
			"The breakdown is on the blog.",
		);
		expect(lintFbCopy(noPointer)).toContain("no linked-in-comments pointer");
	});
});

describe("mapCalendarEntry", () => {
	it("maps a full entry", () => {
		const e = mapCalendarEntry({
			date: "2026-06-13",
			time: "1:00 PM",
			title: "T",
			slug: "s",
			category: "tax-prep",
			copy: "c",
			first_comment: "f",
		});
		expect(e.time).toBe("1:00 PM");
	});

	it("defaults missing time to the legacy 10:00 AM anchor", () => {
		const e = mapCalendarEntry({
			date: "2026-06-15",
			title: "T",
			slug: "s",
			category: "tax-prep",
			copy: "c",
			first_comment: "f",
		});
		expect(e.time).toBe("10:00 AM");
	});

	it("throws on a malformed entry", () => {
		expect(() => mapCalendarEntry({ date: "2026-06-13" })).toThrow(
			"calendar.json: malformed entry",
		);
	});
});

describe("slotSortKey + renderCalendarDoc", () => {
	it("orders anchors before slots within a day", () => {
		expect(
			slotSortKey({ date: "2026-06-15", time: "10:00 AM" }) <
				slotSortKey({ date: "2026-06-15", time: "9:00 AM" }),
		).toBe(true);
	});

	it("renders chronologically regardless of array order", () => {
		const doc = renderCalendarDoc([
			entry("2026-06-14", "9:00 AM", "later"),
			entry("2026-06-13", "9:00 AM", "earlier"),
		]);
		expect(doc.indexOf("earlier")).toBeLessThan(doc.indexOf("later"));
		expect(doc).toContain("| 2026-06-13 | Sat | 9:00 AM |");
	});
});
