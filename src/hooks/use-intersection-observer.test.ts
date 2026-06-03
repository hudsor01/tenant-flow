/**
 * Covers the synchronous initial-visibility fallback added to
 * useIntersectionObserver: when IntersectionObserver never fires its
 * callback (some automated/headless browsers), an element that is already
 * above the fold must still report `hasIntersected` so scroll-gated UI
 * (e.g. NumberTicker) doesn't sit frozen at its start value.
 *
 * @vitest-environment jsdom
 */

import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIntersectionObserver } from "./use-intersection-observer";

// IntersectionObserver that registers but NEVER fires its callback — the
// real-world headless behavior the fallback exists to cover. The global
// unit-setup mock fires synchronously, so we override it per-test.
class SilentIntersectionObserver implements IntersectionObserver {
	readonly root: Element | null = null;
	readonly rootMargin = "";
	readonly scrollMargin = "";
	readonly thresholds: ReadonlyArray<number> = [];
	constructor(
		_callback: IntersectionObserverCallback,
		_options?: IntersectionObserverInit,
	) {}
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

function mountWithRect(
	rect: Partial<DOMRect>,
	options?: { threshold?: number | number[] },
) {
	const el = document.createElement("div");
	document.body.appendChild(el);
	vi.spyOn(el, "getBoundingClientRect").mockReturnValue(
		new DOMRect(rect.x ?? 0, rect.y ?? 0, rect.width ?? 0, rect.height ?? 0),
	);
	const ref: RefObject<Element> = { current: el };
	return renderHook(() => useIntersectionObserver(ref, options));
}

describe("useIntersectionObserver — initial-visibility fallback", () => {
	const original = window.IntersectionObserver;

	beforeEach(() => {
		// unit-setup defines this writable, so direct assignment swaps the
		// always-firing global mock for our silent one (defineProperty would
		// throw — the global descriptor is non-configurable).
		window.IntersectionObserver = SilentIntersectionObserver;
	});

	afterEach(() => {
		window.IntersectionObserver = original;
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it("marks an above-the-fold element intersected even when the observer never fires", () => {
		// jsdom viewport defaults to 1024x768; a 100x100 box at (10,10) is in view.
		const { result } = mountWithRect({ x: 10, y: 10, width: 100, height: 100 });
		expect(result.current.hasIntersected).toBe(true);
		expect(result.current.isIntersecting).toBe(true);
	});

	it("does NOT mark a below-the-fold element intersected (waits for the observer)", () => {
		// y far below the 768px viewport bottom → not initially visible.
		const { result } = mountWithRect({
			x: 10,
			y: 5000,
			width: 100,
			height: 100,
		});
		expect(result.current.hasIntersected).toBe(false);
		expect(result.current.isIntersecting).toBe(false);
	});

	it("does NOT fire on a zero-size rect (jsdom default) so the observer stays authoritative", () => {
		const { result } = mountWithRect({ x: 0, y: 0, width: 0, height: 0 });
		expect(result.current.hasIntersected).toBe(false);
	});

	// Threshold fidelity: the sync fallback must not fire earlier than the
	// observer would. With threshold 0.1 a box peeking in by ~5% stays
	// pending; one ~50% in view fires. (viewport 768 tall; box height 100.)
	it("honors the consumer threshold — a sub-threshold sliver does not fire", () => {
		// top 763 → only 5px of the 100px-tall box clears the 768px viewport
		// bottom = 5% visible, below the 10% threshold.
		const { result } = mountWithRect(
			{ x: 10, y: 763, width: 100, height: 100 },
			{ threshold: 0.1 },
		);
		expect(result.current.hasIntersected).toBe(false);
	});

	it("honors the consumer threshold — past-threshold visibility fires", () => {
		// top 718 → visible 768-718 = 50px = 50% ≥ 10%.
		const { result } = mountWithRect(
			{ x: 10, y: 718, width: 100, height: 100 },
			{ threshold: 0.1 },
		);
		expect(result.current.hasIntersected).toBe(true);
	});
});
