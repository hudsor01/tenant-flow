/**
 * Placement proof for the global-error root document (D-09).
 *
 * global-error.tsx replaces the root layout when it renders, so it must put the
 * two next/font variable classes on its own <html>; otherwise the
 * `@theme inline` font stacks resolve their var(--font-*) references to nothing
 * and the page falls back to the browser default face.
 *
 * This test pins placement only: which classes sit on <html> and <body>. The
 * computed-family proof is render-check (fonts block) plus the built-app
 * Chromium probe recorded in the 66.2-05 SUMMARY.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import GlobalError from "../global-error";

vi.mock("#lib/fonts", () => ({
	roboto: { variable: "mock-roboto-variable" },
	geistMono: { variable: "mock-geist-mono-variable" },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("#components/error-boundary/error-fallback", () => ({
	ErrorFallback: () => null,
}));

function renderMarkup(): string {
	return renderToStaticMarkup(
		<GlobalError error={new Error("x")} reset={() => {}} />,
	);
}

function classTokens(markup: string, tag: "html" | "body"): string[] | null {
	const open = new RegExp(`<${tag}\\b([^>]*)>`).exec(markup);
	if (!open) return null;
	const cls = /\bclass="([^"]*)"/.exec(open[1] ?? "");
	return cls ? (cls[1] ?? "").split(/\s+/).filter(Boolean) : [];
}

describe("global-error font placement", () => {
	it("puts exactly the two font variable classes on <html>", () => {
		const markup = renderMarkup();
		expect(markup.startsWith('<html lang="en" class="')).toBe(true);
		const tokens = classTokens(markup, "html") ?? [];
		expect(tokens).toHaveLength(2);
		expect(new Set(tokens)).toEqual(
			new Set(["mock-roboto-variable", "mock-geist-mono-variable"]),
		);
	});

	it("keeps <body> to font-sans antialiased with no font variable class", () => {
		const markup = renderMarkup();
		expect(classTokens(markup, "body")?.join(" ")).toBe(
			"font-sans antialiased",
		);
	});
});
