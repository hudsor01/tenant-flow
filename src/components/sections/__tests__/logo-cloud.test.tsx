/**
 * LogoCloud component test — Phase 9 CONS-13 regression pin.
 *
 * CONS-13's faded-Supabase-logo fix shipped in source already (PR #693 /
 * commit e86a82709, 2026-05-11): the per-logo wrapper class
 * `grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all`
 * was replaced with `opacity-90 hover:opacity-100 transition-opacity`. This
 * test locks all 5 Trusted Integrations logos at one shared opacity class
 * with no grayscale filter so a future edit can't silently re-fade one.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LogoCloud } from "#components/sections/logo-cloud";

describe("LogoCloud — CONS-13 consistent logo weight", () => {
	it("renders all 5 integration logos (coverage + headline pin)", () => {
		render(<LogoCloud />);
		for (const description of [
			"Payments",
			"Database",
			"Hosting",
			"E-Signatures",
			"Email",
		]) {
			expect(screen.getByText(description)).toBeInTheDocument();
		}
	});

	it("applies no grayscale filter to any logo wrapper (CONS-13)", () => {
		// Symptom pin: the pre-fix bug was a `grayscale` class on the wrapper.
		const { container } = render(<LogoCloud />);
		expect(container.innerHTML).not.toMatch(/grayscale/);
	});

	it("applies one shared opacity-90 class to every logo wrapper (CONS-13)", () => {
		const { container } = render(<LogoCloud />);
		// Exactly 5 logo wrappers carry the shared opacity-90 class. Scoped to
		// the `h-8` + `opacity-90` combination that uniquely identifies the
		// logo wrapper, so the count stays robust if an unrelated future
		// element (e.g. a BlurFade preset) introduces a bare `opacity-90`.
		expect(container.querySelectorAll(".h-8.opacity-90")).toHaveLength(5);
		// None carry the old faded value.
		expect(container.querySelectorAll(".opacity-80")).toHaveLength(0);
	});
});
