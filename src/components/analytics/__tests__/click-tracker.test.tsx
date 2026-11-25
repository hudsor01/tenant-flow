/**
 * @vitest-environment jsdom
 *
 * A click on a call to action marked by `ctaTrackAttributes()` records a
 * `cta_start_free` event with its location (2026-11-24 SEO audit T1).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("#lib/analytics/track", () => ({ track }));

import { ClickTracker } from "#components/analytics/click-tracker";
import { ctaTrackAttributes } from "#lib/analytics/cta-attributes";

describe("ClickTracker", () => {
	beforeEach(() => track.mockClear());

	it("records a marked CTA's click, with its location, from inner elements too", () => {
		render(
			<>
				<ClickTracker />
				<a href="/pricing" {...ctaTrackAttributes("home-hero")}>
					<span>Start free</span>
				</a>
			</>,
		);
		fireEvent.click(screen.getByText("Start free"));
		expect(track).toHaveBeenCalledWith({
			name: "cta_start_free",
			props: { location: "home-hero" },
		});
	});

	it("ignores unmarked links", () => {
		render(
			<>
				<ClickTracker />
				<a href="/pricing">See pricing</a>
			</>,
		);
		fireEvent.click(screen.getByText("See pricing"));
		expect(track).not.toHaveBeenCalled();
	});
});
