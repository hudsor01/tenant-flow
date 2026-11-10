/**
 * Pin the {@link useReducedMotion} shared hook (Plan 03-02 / 03-UI-SPEC § 5.4).
 *
 * The hook reads `matchMedia('(prefers-reduced-motion: reduce)')` through
 * `useSyncExternalStore`. These tests stub `window.matchMedia` via
 * `vi.stubGlobal`, render the hook with `renderHook` from
 * `@testing-library/react`, and pin:
 *
 * 1. The `false` value when the user has no reduced-motion preference.
 * 2. The `true` value under `prefers-reduced-motion: reduce`, on the FIRST
 *    render: a value set from an effect left every fresh mount's first commit
 *    on the motion-on branch (66.2-39 fix round 4, G16).
 * 3. Reacting to the `change` event the listener registers.
 * 4. Cleanup: the `change` handler is removed on unmount.
 * 5. The server snapshot: `false` in server markup, and a hydration of that
 *    markup under `reduce` that reports no mismatch, then reads `true`.
 */

import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

	it("returns true when prefers-reduced-motion: reduce is active, from the first render", () => {
		const { matchMedia } = buildMatchMedia(true);
		vi.stubGlobal("matchMedia", matchMedia);
		const seen: boolean[] = [];

		const { result } = renderHook(() => {
			const reduced = useReducedMotion();
			seen.push(reduced);
			return reduced;
		});

		expect(seen[0]).toBe(true);
		expect(seen).not.toContain(false);
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

		// A real MediaQueryList updates `matches` before it fires `change`.
		mql.matches = true;
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

	it("renders the server snapshot, false, and hydrates it under reduce without a mismatch", async () => {
		const { matchMedia } = buildMatchMedia(true);
		vi.stubGlobal("matchMedia", matchMedia);
		function Probe() {
			return createElement("span", null, String(useReducedMotion()));
		}

		const html = renderToString(createElement(Probe));
		expect(html).toBe("<span>false</span>");

		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);
		const recoverable = vi.fn();
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		let root: ReturnType<typeof hydrateRoot> | undefined;
		await act(async () => {
			root = hydrateRoot(container, createElement(Probe), {
				onRecoverableError: recoverable,
			});
		});

		expect(recoverable).not.toHaveBeenCalled();
		expect(consoleError).not.toHaveBeenCalled();
		expect(container.textContent).toBe("true");
		act(() => root?.unmount());
		container.remove();
		consoleError.mockRestore();
	});
});
