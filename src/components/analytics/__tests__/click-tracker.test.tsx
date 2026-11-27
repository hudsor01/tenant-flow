/**
 * @vitest-environment jsdom
 *
 * A click on an element marked by `clickTrackAttributes()` records its event
 * (2026-11-24 SEO audit T1, 3b), and malformed markings record nothing.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectNavigation } from "#test/utils/expect-navigation";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("#lib/analytics/track", () => ({ track }));

import { ClickTracker } from "#components/analytics/click-tracker";
import {
	clickTrackAttributes,
	contactTrackAttributes,
	ctaTrackAttributes,
	readClickEvent,
} from "#lib/analytics/cta-attributes";

describe("ClickTracker", () => {
	beforeEach(() => track.mockClear());

	it("records a marked CTA's click, with its location, from inner elements too", () => {
		const navigations = expectNavigation();
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
		expect(navigations).toEqual(["/pricing"]);
	});

	it.each([
		[
			contactTrackAttributes("faq-hero"),
			{ name: "cta_contact", props: { location: "faq-hero" } },
		],
		[
			clickTrackAttributes({
				name: "compare_card_click",
				props: { competitor: "buildium" },
			}),
			{ name: "compare_card_click", props: { competitor: "buildium" } },
		],
		[
			clickTrackAttributes({
				name: "resource_open",
				props: {
					resource: "security-deposit-reference-card",
					from: "blog-post",
				},
			}),
			{
				name: "resource_open",
				props: {
					resource: "security-deposit-reference-card",
					from: "blog-post",
				},
			},
		],
	])("records %j as its event", (attributes, expected) => {
		const navigations = expectNavigation();
		render(
			<>
				<ClickTracker />
				<a href="/x" {...attributes}>
					Link
				</a>
			</>,
		);
		fireEvent.click(screen.getByText("Link"));
		expect(track).toHaveBeenCalledWith(expected);
		expect(navigations).toEqual(["/x"]);
	});

	it("ignores unmarked links", () => {
		const navigations = expectNavigation();
		render(
			<>
				<ClickTracker />
				<a href="/pricing">See pricing</a>
			</>,
		);
		fireEvent.click(screen.getByText("See pricing"));
		expect(track).not.toHaveBeenCalled();
		expect(navigations).toEqual(["/pricing"]);
	});
});

describe("readClickEvent", () => {
	it.each([
		["an unknown event", "purchase", '{"location":"x"}'],
		["missing props", "cta_start_free", null],
		["unreadable props", "cta_start_free", "{nope"],
		["an array", "cta_start_free", '["x"]'],
		["a missing prop", "resource_open", '{"resource":"x"}'],
		["an extra prop", "cta_contact", '{"location":"x","email":"a@b.c"}'],
		["a non-string prop", "compare_card_click", '{"competitor":1}'],
	])("rejects %s", (_label, name, props) => {
		expect(readClickEvent(name, props)).toBeNull();
	});
});
