/**
 * Claims the link navigations a test means to cause (2026-11-27). jsdom
 * cannot load another document, so the unit setup cancels any click on a
 * link that would leave the page, and fails the test unless the test
 * claimed it here. The returned list holds each destination, in click
 * order, for the test to assert. The claim ends when the test finishes.
 */
import { onTestFinished } from "vitest";

type NavigationClaim = { hrefs: string[] } | null;

const state: { claim: NavigationClaim } = { claim: null };

export function expectNavigation(): string[] {
	const hrefs: string[] = [];
	state.claim = { hrefs };
	onTestFinished(() => {
		state.claim = null;
	});
	return hrefs;
}

/** For the unit setup: the current test's claim, if it made one. */
export function currentNavigationClaim(): NavigationClaim {
	return state.claim;
}
