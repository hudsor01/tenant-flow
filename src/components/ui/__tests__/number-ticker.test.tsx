/**
 * NumberTicker Component Tests
 *
 * Regression tests for CRIT-02 (homepage stats rendering "0" instead of animating).
 * Trigger: IntersectionObserverMock fires isIntersecting=true synchronously on observe();
 * we then advance fake timers to drive the rAF chain to completion and assert the final
 * displayed value matches the target.
 *
 * @vitest-environment jsdom
 */

import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { NumberTicker } from "../number-ticker";

describe("NumberTicker", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders the start value on mount before animation completes", () => {
		render(<NumberTicker value={5} duration={2000} />);
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("animates to the target value after duration elapses (CRIT-02 regression)", async () => {
		render(<NumberTicker value={5} duration={2000} />);
		await vi.advanceTimersByTimeAsync(2100);
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("honors delay before starting the tween (mirrors stats-showcase usage)", async () => {
		render(<NumberTicker value={500} delay={0.3} duration={2000} />);
		await vi.advanceTimersByTimeAsync(150);
		expect(screen.getByText("0")).toBeInTheDocument();
		await vi.advanceTimersByTimeAsync(2300);
		expect(screen.getByText("500")).toBeInTheDocument();
	});

	it("renders all four production stat values to completion", async () => {
		const { rerender } = render(<NumberTicker value={5} delay={0.3} />);
		await vi.advanceTimersByTimeAsync(2500);
		expect(screen.getByText("5")).toBeInTheDocument();

		rerender(<NumberTicker value={7} delay={0.4} />);
		await vi.advanceTimersByTimeAsync(2500);
		expect(screen.getByText("7")).toBeInTheDocument();

		rerender(<NumberTicker value={500} delay={0.5} />);
		await vi.advanceTimersByTimeAsync(2500);
		expect(screen.getByText("500")).toBeInTheDocument();

		rerender(<NumberTicker value={14} delay={0.6} />);
		await vi.advanceTimersByTimeAsync(2500);
		expect(screen.getByText("14")).toBeInTheDocument();
	});

	it("cancels the rAF chain on unmount (no setState-after-unmount warning)", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const { unmount } = render(<NumberTicker value={5} duration={2000} />);
		await vi.advanceTimersByTimeAsync(500);
		unmount();
		await vi.advanceTimersByTimeAsync(2000);
		expect(consoleError).not.toHaveBeenCalledWith(
			expect.stringContaining("unmounted component"),
		);
		consoleError.mockRestore();
	});

	it("does not re-trigger animation after first IntersectionObserver entry (one-shot guard)", async () => {
		// Capture the IntersectionObserver callback so we can fire a second entry manually.
		// unit-setup.ts defines window.IntersectionObserver with writable:true (not configurable),
		// so we assign a wrapper class directly rather than using vi.stubGlobal/vi.spyOn.
		let capturedCallback: IntersectionObserverCallback | undefined;
		let capturedTarget: Element | undefined;
		const OriginalObserver = window.IntersectionObserver;

		class CapturingObserver implements IntersectionObserver {
			readonly root: Element | null = null;
			readonly rootMargin: string = "";
			readonly scrollMargin: string = "";
			readonly thresholds: ReadonlyArray<number> = [];
			private inner: IntersectionObserver;

			constructor(
				cb: IntersectionObserverCallback,
				opts?: IntersectionObserverInit,
			) {
				capturedCallback = cb;
				this.inner = new OriginalObserver(cb, opts);
			}

			observe(target: Element) {
				capturedTarget = target;
				this.inner.observe(target);
			}
			unobserve(target: Element) {
				this.inner.unobserve(target);
			}
			disconnect() {
				this.inner.disconnect();
			}
			takeRecords() {
				return this.inner.takeRecords();
			}
		}

		// Direct assignment works because the property is writable (unit-setup.ts sets writable: true)
		window.IntersectionObserver =
			CapturingObserver as unknown as typeof IntersectionObserver;

		render(<NumberTicker value={5} duration={2000} />);

		// First intersection fires synchronously on observe(); advance to complete the animation
		await vi.advanceTimersByTimeAsync(2100);
		expect(screen.getByText("5")).toBeInTheDocument();

		// Simulate scroll-out then scroll-back-in via the captured callback
		if (capturedCallback && capturedTarget) {
			const makeEntry = (isIntersecting: boolean): IntersectionObserverEntry =>
				({
					target: capturedTarget as Element,
					isIntersecting,
					intersectionRatio: isIntersecting ? 1 : 0,
					boundingClientRect: (
						capturedTarget as Element
					).getBoundingClientRect(),
					intersectionRect: (capturedTarget as Element).getBoundingClientRect(),
					rootBounds: null,
					time: performance.now(),
				}) as IntersectionObserverEntry;

			capturedCallback([makeEntry(false)], {} as IntersectionObserver);
			capturedCallback([makeEntry(true)], {} as IntersectionObserver);
		}

		// hasIntersected is one-shot: stays true, effect deps unchanged, animation must NOT
		// reset to startValue (0). Counter remains at 5.
		await vi.advanceTimersByTimeAsync(100);
		expect(screen.queryByText("0")).not.toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();

		// Restore original mock for subsequent tests
		window.IntersectionObserver = OriginalObserver;
	});
});
