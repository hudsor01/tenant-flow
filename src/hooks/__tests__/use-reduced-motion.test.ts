/**
 * Pin the {@link useReducedMotion} shared hook (Plan 03-02 / 03-UI-SPEC § 5.4).
 *
 * The hook wraps `matchMedia('(prefers-reduced-motion: reduce)')`. These tests
 * stub `window.matchMedia` via `vi.stubGlobal`, render the hook with
 * `renderHook` from `@testing-library/react`, and pin:
 *
 * 1. The `false` initial value when the user has no reduced-motion preference.
 * 2. The `true` value when the user has `prefers-reduced-motion: reduce`.
 * 3. Reacting to the `change` event the listener registers.
 * 4. Cleanup — the `change` handler is removed on unmount.
 */

import { act, renderHook } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";

import { useReducedMotion } from "#hooks/use-reduced-motion";

interface MockMediaQueryList {
	matches: boolean;
	media: string;
	onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null;
	addEventListener: Mock;
	removeEventListener: Mock;
	dispatchEvent: Mock;
}

function buildMatchMedia(initial: boolean): {
	matchMedia: (query: string) => MockMediaQueryList;
	mql: MockMediaQueryList;
} {
	const mql: MockMediaQueryList = {
		matches: initial,
		media: "(prefers-reduced-motion: reduce)",
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(() => true),
	};
	return {
		matchMedia: () => mql,
		mql,
	};
}

describe("useReducedMotion", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns false when prefers-reduced-motion: no-preference", () => {
		const { matchMedia } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useReducedMotion());

		expect(result.current).toBe(false);
	});

	it("returns true when prefers-reduced-motion: reduce is active", () => {
		const { matchMedia } = buildMatchMedia(true);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useReducedMotion());

		expect(result.current).toBe(true);
	});

	it("reacts to media-query change events", () => {
		const { matchMedia, mql } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { result } = renderHook(() => useReducedMotion());

		// Hook registered a `change` listener via addEventListener — grab it back
		// so we can invoke it directly (jsdom doesn't fire matchMedia events).
		expect(mql.addEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
		const lastCall =
			mql.addEventListener.mock.calls[
				mql.addEventListener.mock.calls.length - 1
			];
		const handler = lastCall?.[1] as (e: MediaQueryListEvent) => void;
		expect(typeof handler).toBe("function");

		expect(result.current).toBe(false);

		act(() => {
			handler({ matches: true } as MediaQueryListEvent);
		});

		expect(result.current).toBe(true);
	});

	it("removes the change listener on unmount", () => {
		const { matchMedia, mql } = buildMatchMedia(false);
		vi.stubGlobal("matchMedia", matchMedia);

		const { unmount } = renderHook(() => useReducedMotion());

		const lastAddCall =
			mql.addEventListener.mock.calls[
				mql.addEventListener.mock.calls.length - 1
			];
		const handler = lastAddCall?.[1];
		expect(handler).toBeDefined();

		unmount();

		expect(mql.removeEventListener).toHaveBeenCalledWith("change", handler);
	});
});
