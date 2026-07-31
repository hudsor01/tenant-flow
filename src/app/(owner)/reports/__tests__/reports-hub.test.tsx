/**
 * `/reports` hub composition pins (RPTHUB-01, D-31).
 *
 * `page.tsx` is a Server Component whose only client island is the summary
 * strip, so rendering it here would prove nothing about the directory it maps
 * over. These assertions therefore target `REPORTS_HUB_ENTRIES` and
 * `REPORTS_HUB_GROUPS` directly — the page is pure composition over both, so
 * pinning the data pins the rendered structure.
 *
 * The load-bearing invariant is D-29 FULL SEPARATION: there is no Analytics
 * group, no Analytics tile, and no entry pointing into `/analytics` or at the
 * deleted hub analytics route. A tile pointing at the latter would be a dead
 * door; a tile pointing at the former would rebuild inside the hub the exact
 * cross-section overlap this phase exists to remove.
 */

import { describe, expect, it } from "vitest";
import {
	hasGrowthBadge,
	REPORTS_HUB_ENTRIES,
	REPORTS_HUB_GROUPS,
} from "../reports-hub-entries";

const DELETED_HUB_ANALYTICS_HREF = "/reports/analytics";

describe("reports hub directory", () => {
	it("holds exactly 7 entries", () => {
		expect(REPORTS_HUB_ENTRIES).toHaveLength(7);
	});

	it("holds exactly 2 groups, ordered statements then exports", () => {
		expect(REPORTS_HUB_GROUPS.map((group) => group.id)).toEqual([
			"statements",
			"exports",
		]);
	});

	it("puts exactly 5 entries in statements and 2 in exports", () => {
		const statements = REPORTS_HUB_ENTRIES.filter(
			(entry) => entry.group === "statements",
		);
		const exports = REPORTS_HUB_ENTRIES.filter(
			(entry) => entry.group === "exports",
		);
		expect(statements).toHaveLength(5);
		expect(exports).toHaveLength(2);
	});

	it("gives every entry an href under /reports/", () => {
		const strays = REPORTS_HUB_ENTRIES.filter(
			(entry) => !entry.href.startsWith("/reports/"),
		).map((entry) => `${entry.id} -> ${entry.href}`);
		expect(strays).toEqual([]);
	});

	it("points no entry at the index, the deleted analytics route, or /analytics", () => {
		const forbidden = REPORTS_HUB_ENTRIES.filter(
			(entry) =>
				entry.href === "/reports" ||
				entry.href === DELETED_HUB_ANALYTICS_HREF ||
				entry.href.startsWith("/analytics"),
		).map((entry) => `${entry.id} -> ${entry.href}`);
		expect(forbidden).toEqual([]);
	});

	it("declares no analytics group", () => {
		const analyticsGroups = REPORTS_HUB_GROUPS.filter(
			(group) =>
				group.id.toLowerCase().includes("analytics") ||
				group.title.toLowerCase().includes("analytics") ||
				group.headingId.toLowerCase().includes("analytics"),
		).map((group) => group.id);
		expect(analyticsGroups).toEqual([]);
	});

	it("gives every entry a non-empty title and description", () => {
		const incomplete = REPORTS_HUB_ENTRIES.filter(
			(entry) =>
				entry.title.trim().length === 0 ||
				entry.description.trim().length === 0,
		).map((entry) => entry.id);
		expect(incomplete).toEqual([]);
	});

	it("gives every entry a unique id", () => {
		const ids = REPORTS_HUB_ENTRIES.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("badges exactly the two entries whose CTA reaches a gated report type", () => {
		// Matches the 56-UI-SPEC Tier Gate Contract evidence table: Tax Documents
		// posts reportType "financial" and Year-End posts "year-end", both members
		// of the edge functions' PREMIUM_REPORT_TYPES. Nothing else is badged,
		// because badging an ungated CTA is a false claim about what Growth buys.
		const badged = REPORTS_HUB_ENTRIES.filter(hasGrowthBadge).map(
			(entry) => entry.id,
		);
		expect(badged).toEqual(["tax-documents", "year-end"]);
	});
});

describe("reports hub groups", () => {
	it("gives every group a heading id that a section can label itself with", () => {
		const missing = REPORTS_HUB_GROUPS.filter(
			(group) => group.headingId.trim().length === 0,
		).map((group) => group.id);
		expect(missing).toEqual([]);
		expect(new Set(REPORTS_HUB_GROUPS.map((g) => g.headingId)).size).toBe(
			REPORTS_HUB_GROUPS.length,
		);
	});

	it("assigns every entry to a declared group", () => {
		const groupIds = new Set(REPORTS_HUB_GROUPS.map((group) => group.id));
		const unassigned = REPORTS_HUB_ENTRIES.filter(
			(entry) => !groupIds.has(entry.group),
		).map((entry) => entry.id);
		expect(unassigned).toEqual([]);
	});
});
