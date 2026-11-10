/**
 * A control's availability as a user meets it (66.2-39 fix round 4, D1, G13).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * jest-dom's `toBeEnabled()` (and `not.toBeDisabled()`) reads only the native
 * `disabled` state, so it passes on a control that is `aria-disabled` and
 * ignores its click: once a control keeps its tab stop through
 * `aria-disabled` (the reports' exports, a default category's delete), a
 * check that it is available proves nothing. These read both states, and with
 * the control's handler, whether a click reaches it. The guard
 * `src/lib/__tests__/no-enabled-matcher-beside-aria-disabled.test.ts` bans the
 * jest-dom matchers in a test whose rendered modules set `aria-disabled`.
 */

import { fireEvent } from "@testing-library/react";
import { expect, type Mock } from "vitest";

/**
 * Neither natively disabled nor `aria-disabled`; given its handler, a click
 * reaches it once.
 */
export function expectAvailable(element: HTMLElement, handler?: Mock): void {
	expect(element).not.toBeDisabled();
	expect(element).not.toHaveAttribute("aria-disabled", "true");
	if (handler === undefined) return;
	const before = handler.mock.calls.length;
	fireEvent.click(element);
	expect(handler).toHaveBeenCalledTimes(before + 1);
}

/**
 * `aria-disabled`, not natively disabled, so it keeps its tab stop; given a
 * reason, described by it; given its handler, a click does not reach it.
 */
export function expectUnavailable(
	element: HTMLElement,
	{ reason, handler }: { reason?: string; handler?: Mock } = {},
): void {
	expect(element).not.toBeDisabled();
	expect(element).toHaveAttribute("aria-disabled", "true");
	if (reason !== undefined) {
		expect(element).toHaveAccessibleDescription(reason);
	}
	if (handler === undefined) return;
	const before = handler.mock.calls.length;
	fireEvent.click(element);
	expect(handler).toHaveBeenCalledTimes(before);
}
