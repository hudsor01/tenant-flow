"use client";

/**
 * NumberTicker: counts up to `value` once it scrolls near the viewport.
 *
 * MONEY. Pass `currency` and the ticker formats every frame as US dollars the
 * way `formatCurrency` does (Intl's currency style: the sign before the
 * symbol, so -250 is "-$250", never "$-250"), with `decimalPlaces` digits.
 * The symbol is rendered as its own span so a card can size and space it apart
 * from the digits (`symbolClassName`), and it takes the surrounding text's
 * letter-spacing while the sign and digits keep the ticker's `tracking-wider`.
 * Never place a "$" next to a ticker by hand: the ticker's minus sign then
 * lands between the two (66.2-39).
 *
 * SERVER HTML. By default the server renders `startValue`, so crawlers and
 * no-JS readers saw "0" for every marketing stat (2026-11-24 SEO audit H1).
 * `startAtFinal` renders `value` instead. A ticker that hydrates in view keeps
 * it, unanimated, so nothing flashes; one that hydrates out of view drops to
 * `startValue` while still off-screen and counts up when it scrolls in.
 */

import {
	ComponentPropsWithoutRef,
	RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { useIntersectionObserver } from "#hooks/use-intersection-observer";
import { useReducedMotion } from "#hooks/use-reduced-motion";
import { cn } from "#lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
	value: number;
	startValue?: number;
	direction?: "up" | "down";
	delay?: number;
	decimalPlaces?: number;
	duration?: number;
	/** Format as US dollars, sign before the symbol, as `formatCurrency` does. */
	currency?: boolean;
	/** Classes for the currency symbol's span; only used with `currency`. */
	symbolClassName?: string;
	/** Render `value` on the server; see SERVER HTML above. */
	startAtFinal?: boolean;
}

/** Each frame's text, split so the currency symbol can carry its own classes. */
function formatTickerParts(
	value: number,
	decimalPlaces: number,
	currency: boolean,
): Intl.NumberFormatPart[] {
	return new Intl.NumberFormat("en-US", {
		...(currency ? { style: "currency", currency: "USD" } : {}),
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces,
	}).formatToParts(value);
}

export function NumberTicker({
	value,
	startValue = 0,
	direction = "up",
	delay = 0,
	className,
	decimalPlaces = 0,
	duration = 2000,
	currency = false,
	symbolClassName,
	startAtFinal = false,
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const from = direction === "down" ? value : startValue;
	const to = direction === "down" ? startValue : value;
	const [displayValue, setDisplayValue] = useState(startAtFinal ? to : from);
	// False only for a `startAtFinal` ticker until it is known to start out of
	// view; one that hydrates in view never animates.
	const [animates, setAnimates] = useState(!startAtFinal);
	const reducedMotion = useReducedMotion();

	// Once, at hydration: a later change of `from` must not re-zero a ticker.
	// biome-ignore lint/correctness/useExhaustiveDependencies: hydration-time check
	useEffect(() => {
		if (!startAtFinal) return;
		const node = ref.current;
		if (!node) return;
		const { top, bottom } = node.getBoundingClientRect();
		if (top < window.innerHeight && bottom > 0) return;
		setDisplayValue(from);
		setAnimates(true);
	}, [startAtFinal]);

	const { hasIntersected } = useIntersectionObserver(
		ref as RefObject<Element>,
		{
			threshold: 0.1,
			// Pre-trigger ~200px before the counter scrolls into view so the
			// count-up starts (and usually finishes) before it's visible —
			// avoids the "stuck at 0" flash on a normal downward scroll.
			rootMargin: "0px 0px 200px 0px",
		},
	);

	useEffect(() => {
		if (reducedMotion) {
			setDisplayValue(to);
			return;
		}
		// A still ticker shows `to` directly (`shown` below), so it writes nothing.
		if (!animates) return;
		if (!hasIntersected) return;

		let rafId = 0;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		let startTime: number | undefined;
		let cancelled = false;

		const change = to - from;
		const delayMs = delay * 1000;

		const animate = (timestamp: number) => {
			if (cancelled) return;
			if (startTime === undefined) startTime = timestamp;
			const elapsed = timestamp - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = progress * (2 - progress);
			setDisplayValue(from + change * eased);
			if (progress < 1) {
				rafId = requestAnimationFrame(animate);
			} else {
				setDisplayValue(to);
			}
		};

		const start = () => {
			if (cancelled) return;
			rafId = requestAnimationFrame(animate);
		};

		if (delayMs > 0) {
			timeoutId = setTimeout(start, delayMs);
		} else {
			start();
		}

		return () => {
			cancelled = true;
			if (rafId) cancelAnimationFrame(rafId);
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [reducedMotion, animates, hasIntersected, from, to, delay, duration]);

	const shown = animates ? displayValue : to;
	const parts = formatTickerParts(shown, decimalPlaces, currency);
	const symbolAt = parts.findIndex((part) => part.type === "currency");
	const text = (list: Intl.NumberFormatPart[]) =>
		list.map((part) => part.value).join("");

	if (symbolAt === -1) {
		return (
			<span
				ref={ref}
				className={cn("inline-block tabular-nums tracking-wider", className)}
				{...props}
			>
				{text(parts)}
			</span>
		);
	}

	// The sign and the digits keep the ticker's wide tracking; the symbol keeps
	// the surrounding text's, as the hand-placed "$" it replaces did, so a
	// positive amount lays out exactly as it did with the symbol outside.
	return (
		<span
			ref={ref}
			className={cn("inline-block tabular-nums", className)}
			{...props}
		>
			<span className="tracking-wider">{text(parts.slice(0, symbolAt))}</span>
			<span className={symbolClassName}>{parts[symbolAt]?.value}</span>
			<span className="tracking-wider">{text(parts.slice(symbolAt + 1))}</span>
		</span>
	);
}

export default NumberTicker;
