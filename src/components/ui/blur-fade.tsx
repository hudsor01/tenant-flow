"use client";

/**
 * BlurFade: a mount-time entrance that is never invisible (66.2-27, C12c, D-30).
 *
 * The old wrapper built its hidden-state classes from template literals, which
 * Tailwind never generates, and the inverted visibility gate skipped the hidden
 * state anyway, so it never animated. This version is a pure CSS entrance:
 *
 * - The resting state is the element's own style (opacity 1, no transform, no
 *   filter, no will-change). Only the finite tw-animate-css `enter` animation
 *   hides it, and `fill-mode-backwards` applies the start frame only during the
 *   delay and the run. Nothing waits on JavaScript: with JS disabled the
 *   animation still runs and ends visible.
 * - `motion-reduce:animate-none` removes the animation under
 *   `prefers-reduced-motion: reduce`, so content is visible at frame 0. The
 *   `reducedMotion` prop renders the resting state with no entrance classes.
 * - No IntersectionObserver and no aria-hidden: content is never hidden from
 *   assistive technology and never depends on an observer firing.
 * - Every class is a complete static literal, so Tailwind always generates it.
 *
 * Delay: `delay` x BLUR_FADE_DELAY_STEP_MS, capped at BLUR_FADE_MAX_DELAY_MS
 * (480ms = the KPI wave maximum, 6 x 80ms). Index-driven lists would otherwise
 * grow without bound; with the cap the longest time to full opacity at any call
 * site is 480ms + the 500ms slow duration. The delay rides the
 * `--tw-animation-delay` custom property that tw-animate's `--animate-in`
 * shorthand reads. It is a runtime-computed value, which zero-tolerance rule 5
 * allows as an inline style (D-30); the property does not inherit, so nested
 * BlurFades keep their own delay.
 */

import type { CSSProperties } from "react";
import { cn } from "#lib/utils";
import type { BlurFadeProps } from "#types/frontend";

// `string &` drops `undefined` from the optional prop: the six preset names.
export const BLUR_FADE_PRESET_CLASSES: Record<
	string & BlurFadeProps["preset"],
	string
> = {
	default:
		"animate-in fade-in slide-in-from-bottom-[6px] blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
	scale:
		"animate-in fade-in zoom-in-95 blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
	"slide-up":
		"animate-in fade-in slide-in-from-bottom-3 blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
	"slide-down":
		"animate-in fade-in slide-in-from-top-3 blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
	"slide-left":
		"animate-in fade-in slide-in-from-left-3 blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
	"slide-right":
		"animate-in fade-in slide-in-from-right-3 blur-in-xs fill-mode-backwards ease-out motion-reduce:animate-none",
};

export const BLUR_FADE_DURATION_CLASSES: Record<number, string> = {
	150: "duration-instant",
	200: "duration-fast",
	300: "duration-normal",
	500: "duration-slow",
};

const BLUR_FADE_DELAY_STEP_MS = 80;
export const BLUR_FADE_MAX_DELAY_MS = 480;

export function BlurFade({
	children,
	className,
	delay = 0,
	preset = "default",
	duration = 200,
	reducedMotion = false,
}: BlurFadeProps) {
	const delayMs = Math.min(
		Math.round(delay * BLUR_FADE_DELAY_STEP_MS),
		BLUR_FADE_MAX_DELAY_MS,
	);
	const durationClass = BLUR_FADE_DURATION_CLASSES[duration] ?? "duration-fast";
	const style =
		!reducedMotion && delayMs > 0
			? ({ "--tw-animation-delay": `${delayMs}ms` } as CSSProperties)
			: undefined;

	return (
		<div
			data-slot="blur-fade"
			className={cn(
				reducedMotion ? undefined : BLUR_FADE_PRESET_CLASSES[preset],
				reducedMotion ? undefined : durationClass,
				className,
			)}
			style={style}
		>
			{children}
		</div>
	);
}

export default BlurFade;
