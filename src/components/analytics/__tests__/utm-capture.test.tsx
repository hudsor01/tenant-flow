/**
 * @vitest-environment jsdom
 *
 * `UtmCapture` keeps a visit's first campaign tags for `track()` to attach to
 * its events (2026-11-24 SEO audit T3).
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { UtmCapture } from "#components/analytics/utm-capture";
import { UTM_STORAGE_KEY } from "#lib/analytics/track";

const saved = () => {
	const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
	return raw ? JSON.parse(raw) : null;
};

describe("UtmCapture", () => {
	beforeEach(() => window.sessionStorage.clear());

	it("saves the landing link's campaign tags", () => {
		window.history.replaceState(
			null,
			"",
			"/blog/a-post?utm_source=facebook&utm_campaign=launch&utm_term=x&ref=y",
		);
		render(<UtmCapture />);
		expect(saved()).toEqual({ utm_source: "facebook", utm_campaign: "launch" });
	});

	it("keeps the first touch when a later page carries other tags", () => {
		window.history.replaceState(null, "", "/?utm_source=facebook");
		render(<UtmCapture />);
		window.history.replaceState(null, "", "/pricing?utm_source=newsletter");
		render(<UtmCapture />);
		expect(saved()).toEqual({ utm_source: "facebook" });
	});

	it("saves nothing for a visit without tags", () => {
		window.history.replaceState(null, "", "/pricing");
		render(<UtmCapture />);
		expect(saved()).toBeNull();
	});
});
