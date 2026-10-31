/**
 * BlurFade (66.2-27, C12c, D-30): a mount-time CSS entrance that is never
 * invisible. The resting state is the element's own style; only the finite
 * tw-animate `enter` animation (fill-mode-backwards) hides it, and only before
 * it starts. These tests pin the server HTML, the static class literals, the
 * duration map, the capped delay custom property, the `reducedMotion` prop,
 * the absence of an IntersectionObserver and the absence of a replay.
 *
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlurFadeProps } from "#types/frontend";
import {
	BLUR_FADE_DURATION_CLASSES,
	BLUR_FADE_MAX_DELAY_MS,
	BLUR_FADE_PRESET_CLASSES,
	BlurFade,
} from "../blur-fade";

type Preset = NonNullable<BlurFadeProps["preset"]>;

const PRESETS = Object.keys(BLUR_FADE_PRESET_CLASSES) as Preset[];

function wrapperOf(container: HTMLElement): HTMLElement {
	const el = container.querySelector<HTMLElement>('[data-slot="blur-fade"]');
	if (!el) throw new Error("BlurFade wrapper not rendered");
	return el;
}

describe("BlurFade", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("server HTML carries the entrance and never a hidden state", () => {
		const html = renderToString(
			<BlurFade delay={6} duration={500}>
				<p>Probe content</p>
			</BlurFade>,
		);
		for (const expected of [
			'data-slot="blur-fade"',
			"animate-in",
			"motion-reduce:animate-none",
			"fill-mode-backwards",
			"duration-slow",
			"--tw-animation-delay:480ms",
			"Probe content",
		]) {
			expect(html).toContain(expected);
		}
		for (const absent of [
			"opacity-0",
			"aria-hidden",
			"will-change",
			"transition-all",
		]) {
			expect(html).not.toContain(absent);
		}
	});

	it("covers the six preset names", () => {
		expect(PRESETS.sort()).toEqual(
			[
				"default",
				"scale",
				"slide-down",
				"slide-left",
				"slide-right",
				"slide-up",
			].sort(),
		);
	});

	it.each(PRESETS)("preset %s keeps every class token after cn", (preset) => {
		const { container } = render(
			<BlurFade preset={preset}>
				<p>x</p>
			</BlurFade>,
		);
		const classList = wrapperOf(container).classList;
		for (const token of BLUR_FADE_PRESET_CLASSES[preset].split(/\s+/)) {
			expect(classList.contains(token)).toBe(true);
		}
	});

	it.each([
		[150, "duration-instant"],
		[200, "duration-fast"],
		[300, "duration-normal"],
		[500, "duration-slow"],
		[undefined, "duration-fast"],
		[250, "duration-fast"],
	] as const)("duration %s maps to %s", (duration, expected) => {
		const { container } = render(
			<BlurFade {...(duration === undefined ? {} : { duration })}>
				<p>x</p>
			</BlurFade>,
		);
		const classList = wrapperOf(container).classList;
		expect(classList.contains(expected)).toBe(true);
		const durationTokens = Object.values(BLUR_FADE_DURATION_CLASSES).filter(
			(c) => classList.contains(c),
		);
		expect(durationTokens).toEqual([expected]);
	});

	it("delay 0 renders no style attribute", () => {
		const { container } = render(
			<BlurFade delay={0}>
				<p>x</p>
			</BlurFade>,
		);
		expect(wrapperOf(container).hasAttribute("style")).toBe(false);
	});

	it.each([
		[3, "240ms"],
		[0.15, "12ms"],
		[100, `${BLUR_FADE_MAX_DELAY_MS}ms`],
	] as const)("delay %s sets --tw-animation-delay %s", (delay, expected) => {
		const { container } = render(
			<BlurFade delay={delay}>
				<p>x</p>
			</BlurFade>,
		);
		const style = wrapperOf(container).style;
		expect(style.getPropertyValue("--tw-animation-delay")).toBe(expected);
		expect(style.animationDelay).toBe("");
	});

	it("caps the delay at 480ms", () => {
		expect(BLUR_FADE_MAX_DELAY_MS).toBe(480);
	});

	it("reducedMotion renders the resting state with no entrance", () => {
		const { container, getByText } = render(
			<BlurFade delay={6} reducedMotion>
				<p>Resting content</p>
			</BlurFade>,
		);
		const wrapper = wrapperOf(container);
		expect(wrapper.classList.contains("animate-in")).toBe(false);
		expect(wrapper.hasAttribute("style")).toBe(false);
		expect(getByText("Resting content")).toBeTruthy();
	});

	it("never constructs an IntersectionObserver", () => {
		const observer = vi.fn();
		vi.stubGlobal("IntersectionObserver", observer);
		render(
			<BlurFade delay={2}>
				<p>x</p>
			</BlurFade>,
		);
		expect(observer).not.toHaveBeenCalled();
	});

	it("does not replay on re-render", () => {
		const { container, rerender } = render(
			<BlurFade delay={1}>
				<p>first</p>
			</BlurFade>,
		);
		const first = container.firstChild;
		const className = (first as HTMLElement).className;
		rerender(
			<BlurFade delay={1}>
				<p>second</p>
			</BlurFade>,
		);
		expect(container.firstChild).toBe(first);
		expect((container.firstChild as HTMLElement).className).toBe(className);
	});

	it("merges the caller className last", () => {
		const { container } = render(
			<BlurFade className="h-full">
				<p>x</p>
			</BlurFade>,
		);
		expect(wrapperOf(container).classList.contains("h-full")).toBe(true);
	});
});
