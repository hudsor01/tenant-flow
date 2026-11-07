/**
 * Pin {@link useNavSectionState} and its pure helpers (66.2 CONTEXT D-50,
 * RESEARCH P10).
 *
 * The owner sidebar's two collapsible sections keep their open state in this
 * hook, held by the AppShell inner child, so the state outlives the mobile
 * Sheet unmounting its content. These tests pin:
 *
 * 1. `isNavPathActive`: `/dashboard` matches exactly, every other href by prefix.
 * 2. `resolveSectionOpen`: a manual override wins, else the section is open when
 *    it holds the active route.
 * 3. `clearEnteredSectionOverrides`: entering a section drops its override, and
 *    an unchanged result keeps the input reference (no needless state update).
 * 4. The hook: default-open, manual toggles persisting across navigation, a
 *    section reopening on entry, and no render loop on an unchanged pathname.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
	clearEnteredSectionOverrides,
	isNavPathActive,
	resolveSectionOpen,
	type SectionOverrides,
	useNavSectionState,
} from "#hooks/use-nav-section-state";

describe("isNavPathActive", () => {
	it("matches /dashboard exactly", () => {
		expect(isNavPathActive("/dashboard", "/dashboard")).toBe(true);
		expect(isNavPathActive("/dashboard", "/dashboard/x")).toBe(false);
	});

	it("matches every other href by prefix", () => {
		expect(isNavPathActive("/reports", "/reports/cash-flow")).toBe(true);
		expect(isNavPathActive("/reports", "/properties")).toBe(false);
		expect(isNavPathActive("/settings", "/settings/billing")).toBe(true);
	});
});

describe("resolveSectionOpen", () => {
	it("opens the section that holds the active route when nothing is overridden", () => {
		expect(resolveSectionOpen({}, "/reports", "/reports/cash-flow")).toBe(true);
		expect(resolveSectionOpen({}, "/analytics", "/reports/cash-flow")).toBe(
			false,
		);
	});

	it("lets a manual override win over the active route", () => {
		expect(
			resolveSectionOpen(
				{ "/reports": false },
				"/reports",
				"/reports/cash-flow",
			),
		).toBe(false);
		expect(
			resolveSectionOpen({ "/analytics": true }, "/analytics", "/dashboard"),
		).toBe(true);
	});
});

describe("clearEnteredSectionOverrides", () => {
	it("returns the same reference when no override belongs to the entered path", () => {
		const overrides: SectionOverrides = {
			"/reports": false,
			"/analytics": true,
		};
		expect(clearEnteredSectionOverrides(overrides, "/dashboard")).toBe(
			overrides,
		);
	});

	it("drops only the override of the section being entered", () => {
		expect(
			clearEnteredSectionOverrides(
				{ "/reports": false, "/analytics": true },
				"/reports/expenses",
			),
		).toEqual({ "/analytics": true });
	});
});

describe("useNavSectionState", () => {
	it("starts with both sections closed outside them and keeps a manual open across navigation", () => {
		const { result, rerender } = renderHook(
			(pathname: string) => useNavSectionState(pathname),
			{ initialProps: "/dashboard" },
		);

		expect(result.current.isSectionOpen("/analytics")).toBe(false);
		expect(result.current.isSectionOpen("/reports")).toBe(false);

		act(() => result.current.setSectionOpen("/analytics", true));
		rerender("/properties");

		expect(result.current.isSectionOpen("/analytics")).toBe(true);
	});

	it("opens the active section, honours a manual close, and reopens it on entry", () => {
		const { result, rerender } = renderHook(
			(pathname: string) => useNavSectionState(pathname),
			{ initialProps: "/reports/cash-flow" },
		);

		expect(result.current.isSectionOpen("/reports")).toBe(true);

		act(() => result.current.setSectionOpen("/analytics", true));
		act(() => result.current.setSectionOpen("/reports", false));
		expect(result.current.isSectionOpen("/reports")).toBe(false);

		rerender("/reports/expenses");
		expect(result.current.isSectionOpen("/reports")).toBe(true);
		expect(result.current.isSectionOpen("/analytics")).toBe(true);
	});

	it("does not loop or change its result when the pathname is unchanged", () => {
		let renders = 0;
		const { result, rerender } = renderHook(
			(pathname: string) => {
				renders += 1;
				return useNavSectionState(pathname);
			},
			{ initialProps: "/dashboard" },
		);

		rerender("/dashboard");
		rerender("/dashboard");
		rerender("/dashboard");

		expect(renders).toBe(4);
		expect(result.current.isSectionOpen("/reports")).toBe(false);
	});
});
