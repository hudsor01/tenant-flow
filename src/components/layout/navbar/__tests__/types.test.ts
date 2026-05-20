/**
 * Pins the navbar nav config so a refactor can't re-introduce a dead/placeholder
 * href (CONS-11). The Resources parent href was '#' pre-fix (commit 7540ebe48);
 * all items now resolve to real App Router routes. Keyboard activation of the
 * dropdown items is a runtime concern verified manually (see 08-VALIDATION.md).
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

const PLACEHOLDER_HREFS = new Set(["#", "/#", "", "javascript:void(0)"]);

describe("DEFAULT_NAV_ITEMS", () => {
	it("no nav item uses a placeholder href (CONS-11)", () => {
		for (const item of DEFAULT_NAV_ITEMS) {
			expect(PLACEHOLDER_HREFS.has(item.href)).toBe(false);
			expect(item.href.startsWith("/")).toBe(true);
		}
	});

	it("no dropdown item uses a placeholder href (CONS-11)", () => {
		for (const item of DEFAULT_NAV_ITEMS) {
			for (const sub of item.dropdownItems ?? []) {
				expect(PLACEHOLDER_HREFS.has(sub.href)).toBe(false);
				expect(sub.href.startsWith("/")).toBe(true);
			}
		}
	});

	it("the Resources parent resolves to /resources (CONS-11)", () => {
		const resources = DEFAULT_NAV_ITEMS.find(
			(item) => item.name === "Resources",
		);
		expect(resources).toBeDefined();
		expect(resources?.href).toBe("/resources");
		// Resources is the dropdown owner — its dropdown must list real routes.
		expect(resources?.dropdownItems?.length ?? 0).toBeGreaterThan(0);
		for (const sub of resources?.dropdownItems ?? []) {
			expect(sub.href.startsWith("/")).toBe(true);
		}
	});
});
