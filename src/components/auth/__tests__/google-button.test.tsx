/**
 * @vitest-environment jsdom
 * GoogleButton trust-indicator text (66.2-39 F4).
 *
 * The two 11px trust lines read the full `text-muted-foreground` token. At
 * `/75` and `/60` they painted 3.53:1 and 2.62:1 light (5.17 / 3.67 dark) on
 * `bg-background`, under AA for normal-size text; the full token paints
 * 6.21:1 light and 8.63:1 dark (Chrome, canvas readback).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleButton } from "../google-button";

function classTokens(el: Element | null): string[] {
	return (el?.getAttribute("class") ?? "").split(/\s+/);
}

describe("GoogleButton trust indicators", () => {
	it("reads the caption under the label in the full muted-foreground token", () => {
		render(<GoogleButton showTrustIndicators />);
		const caption = screen.getByText("Secure OAuth 2.0 authentication");
		expect(classTokens(caption)).toContain("text-muted-foreground");
		expect(classTokens(caption).filter((c) => c.includes("/"))).toEqual([]);
	});

	it("reads the indicator row in the full muted-foreground token", () => {
		render(<GoogleButton showTrustIndicators />);
		const row = screen.getByText("Encrypted").closest("div")?.parentElement;
		expect(classTokens(row ?? null)).toContain("text-muted-foreground");
		expect(classTokens(row ?? null).filter((c) => c.includes("/"))).toEqual([]);
	});
});
