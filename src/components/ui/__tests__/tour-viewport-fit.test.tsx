/**
 * Pins how the vendored Tour keeps a step inside the viewport (66.2-39 fix
 * round 3, part 6d). The step is `position: fixed`, so anything past the
 * viewport is out of a pointer's reach: before this, a step taller than the
 * space on either side of its target ran off screen (step 1 of the owner
 * onboarding tour put Skip and Next at y 799-843 at 1280x800).
 *
 * jsdom has no layout, so this file pins the CONFIGURATION: the Floating UI
 * middleware order and options, the CSS variables the size step publishes and
 * the classes that read them, and the header's scroll-and-tab-stop contract.
 * The behavior is proved in a real browser by the pointer checks in
 * tests/e2e/tests/owner/app-shell-sidebar.spec.ts (owner-axe).
 */
import type { Middleware } from "@floating-ui/react-dom";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface CapturedMiddleware {
	name: string;
	options: unknown;
}

const captured = vi.hoisted(() => ({
	middleware: [] as CapturedMiddleware[][],
}));

vi.mock("@floating-ui/react-dom", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@floating-ui/react-dom")>();
	return {
		...actual,
		useFloating: (options: Parameters<typeof actual.useFloating>[0]) => {
			const list = (options?.middleware ?? []).filter(
				(entry): entry is Middleware => Boolean(entry),
			);
			// @floating-ui/react-dom wraps each middleware's options as
			// [options, deps]; keep the options.
			captured.middleware.push(
				list.map((entry) => ({
					name: entry.name,
					options: Array.isArray(entry.options)
						? entry.options[0]
						: entry.options,
				})),
			);
			return actual.useFloating(options);
		},
	};
});

import {
	Tour,
	TourArrow,
	TourDescription,
	TourFooter,
	TourHeader,
	TourNext,
	TourPortal,
	TourSkip,
	TourStep,
	TourTitle,
} from "#components/ui/tour";

const observers: RecordingResizeObserver[] = [];

class RecordingResizeObserver implements ResizeObserver {
	readonly callback: ResizeObserverCallback;
	targets: Element[] = [];

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		observers.push(this);
	}

	observe(target: Element) {
		this.targets.push(target);
	}

	unobserve() {}

	disconnect() {
		this.targets = [];
	}

	/** Runs the observer's callback, as a resize of an observed node would. */
	fire() {
		this.callback([], this);
	}
}

const originalResizeObserver = window.ResizeObserver;

function renderTour() {
	const target = document.createElement("div");
	target.id = "tour-target";
	target.textContent = "target";
	document.body.replaceChildren(target);
	return render(
		<Tour
			open
			value={0}
			stepFooter={
				<TourFooter>
					<TourSkip>Skip tour</TourSkip>
					<TourNext />
				</TourFooter>
			}
		>
			<TourPortal>
				<TourStep target="#tour-target">
					<TourArrow />
					<TourHeader>
						<TourTitle>Only step</TourTitle>
						<TourDescription>Body copy</TourDescription>
					</TourHeader>
				</TourStep>
			</TourPortal>
		</Tour>,
	);
}

function lastMiddleware(): CapturedMiddleware[] {
	const last = captured.middleware.at(-1);
	if (!last) throw new Error("useFloating was never called");
	return last;
}

function middlewareNamed(name: string): CapturedMiddleware {
	const found = lastMiddleware().find((entry) => entry.name === name);
	if (!found) throw new Error(`no ${name} middleware`);
	return found;
}

function stepElement(): HTMLElement {
	const step = document.querySelector<HTMLElement>('[data-slot="tour-step"]');
	if (!step) throw new Error("the step did not render");
	return step;
}

function headerElement(): HTMLElement {
	const header = document.querySelector<HTMLElement>(
		'[data-slot="tour-header"]',
	);
	if (!header) throw new Error("the header did not render");
	return header;
}

describe("Tour keeps every step inside the viewport", () => {
	beforeEach(() => {
		captured.middleware.length = 0;
		observers.length = 0;
		Object.defineProperty(window, "ResizeObserver", {
			writable: true,
			value: RecordingResizeObserver,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, "ResizeObserver", {
			writable: true,
			value: originalResizeObserver,
		});
	});

	it("runs offset, flip, shift, size, then arrow", () => {
		renderTour();
		expect(lastMiddleware().map((entry) => entry.name)).toEqual([
			"offset",
			"flip",
			"shift",
			"size",
			"arrow",
		]);
	});

	it("flips by side-axis overflow and shifts on both axes, limited to the target", () => {
		renderTour();
		expect(middlewareNamed("flip").options).toMatchObject({
			crossAxis: "alignment",
			padding: 16,
		});
		const shiftOptions = middlewareNamed("shift").options as {
			mainAxis: boolean;
			crossAxis: boolean;
			padding: number;
			limiter?: { fn: unknown };
		};
		expect(shiftOptions).toMatchObject({
			mainAxis: true,
			crossAxis: true,
			padding: 16,
		});
		expect(typeof shiftOptions.limiter?.fn).toBe("function");
	});

	it("sizes with the same 16px collision padding as flip and shift", () => {
		renderTour();
		expect(middlewareNamed("size").options).toMatchObject({ padding: 16 });
	});

	it("publishes the available space as CSS variables, clamped at 0", async () => {
		renderTour();
		const sizeOptions = middlewareNamed("size").options as {
			apply: (state: {
				elements: { floating: HTMLElement };
				availableWidth: number;
				availableHeight: number;
			}) => void;
		};
		const floating = document.createElement("div");
		sizeOptions.apply({
			elements: { floating },
			availableWidth: 288,
			availableHeight: 186.5,
		});
		expect(floating.style.getPropertyValue("--tour-available-width")).toBe(
			"288px",
		);
		expect(floating.style.getPropertyValue("--tour-available-height")).toBe(
			"186.5px",
		);
		sizeOptions.apply({
			elements: { floating },
			availableWidth: -4,
			availableHeight: -12,
		});
		expect(floating.style.getPropertyValue("--tour-available-width")).toBe(
			"0px",
		);
		expect(floating.style.getPropertyValue("--tour-available-height")).toBe(
			"0px",
		);
	});

	it("caps the step with those variables and lets the header, not the footer, give way", () => {
		renderTour();
		const step = stepElement();
		expect(step.className).toContain("max-h-(--tour-available-height)");
		expect(step.className).toContain("max-w-(--tour-available-width)");
		expect(step.className).toContain("flex-col");
		// Below 48rem the close button is a 44px box (the touch floor): the
		// content starts under it and its 4px focus ring (16 + 44 + 4).
		expect(step.className).toContain("max-md:pt-16");
		const header = headerElement();
		expect(header.className).toContain("min-h-0");
		expect(header.className).toContain("overflow-y-auto");
		const footer = document.querySelector('[data-slot="tour-footer"]');
		expect(footer?.className).toContain("shrink-0");
	});

	it("gives the header a tab stop only while it scrolls", () => {
		renderTour();
		const header = headerElement();
		expect(header).not.toHaveAttribute("tabindex");

		const observer = observers.find((candidate) =>
			candidate.targets.includes(header),
		);
		if (!observer) throw new Error("the header is not observed");
		expect(observer.targets).toEqual(
			expect.arrayContaining([...header.children]),
		);

		Object.defineProperty(header, "scrollHeight", {
			configurable: true,
			value: 140,
		});
		Object.defineProperty(header, "clientHeight", {
			configurable: true,
			value: 94,
		});
		act(() => {
			observer.fire();
		});
		expect(header).toHaveAttribute("tabindex", "0");
		// From 48rem up the close button sits in the header's top-right corner:
		// a scrolling header keeps clear of it.
		expect(header).toHaveAttribute("data-scrollable");
		expect(header.className).toContain("md:data-scrollable:pr-6");

		Object.defineProperty(header, "clientHeight", {
			configurable: true,
			value: 140,
		});
		act(() => {
			observer.fire();
		});
		expect(header).not.toHaveAttribute("tabindex");
		expect(header).not.toHaveAttribute("data-scrollable");
		expect(screen.getByRole("button", { name: "Skip tour" })).toBeVisible();
	});
});
