/**
 * WCAG 2.5.3 Label in Name, as a unit assertion.
 *
 * Visible text = the element's text minus its `.sr-only` descendants, which
 * are by definition not on screen. The accessible name, as
 * Testing Library's `getByRole(..., { name })` computes it, must START with
 * the visible text: axe's `label-content-name-mismatch` accepts any
 * containment, but a prefix is the robust form, and screen readers then
 * announce the visible words first.
 *
 * NOT A BARREL FILE. Declared here, nothing re-exported (CLAUDE.md rule 2).
 */

import { screen } from "@testing-library/react";
import { expect } from "vitest";

function visibleText(el: HTMLElement): string {
	const clone = el.cloneNode(true) as HTMLElement;
	for (const hidden of clone.querySelectorAll(".sr-only")) hidden.remove();
	return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Whitespace-free, lower-cased: block boundaries add spaces in a browser but not in jsdom's textContent. */
function squash(s: string): string {
	return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * Asserts `el`'s accessible name starts with its visible text, ignoring case
 * and whitespace. Icon-only controls (no visible text) are labelled by
 * aria-label alone, so the rule does not apply and the call returns.
 */
export function expectLabelInName(el: HTMLElement): void {
	const visible = squash(visibleText(el));
	if (!visible) return;
	const role =
		el.getAttribute("role") ?? (el.tagName === "A" ? "link" : "button");
	const matches = screen.queryAllByRole(role, {
		name: (name) => squash(name).startsWith(visible),
	});
	expect(
		matches,
		`label in name: <${el.tagName.toLowerCase()}> shows "${visibleText(el)}" but is named by aria-label="${el.getAttribute("aria-label")}"`,
	).toContain(el);
}
