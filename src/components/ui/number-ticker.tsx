"use client";

import {
	ComponentPropsWithoutRef,
	RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { useIntersectionObserver } from "#hooks/use-intersection-observer";
import { cn } from "#lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
	value: number;
	startValue?: number;
	direction?: "up" | "down";
	delay?: number;
	decimalPlaces?: number;
	duration?: number;
}

export function NumberTicker({
	value,
	startValue = 0,
	direction = "up",
	delay = 0,
	className,
	decimalPlaces = 0,
	duration = 2000,
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const [displayValue, setDisplayValue] = useState(startValue);

	const { hasIntersected } = useIntersectionObserver(
		ref as RefObject<Element>,
		{
			threshold: 0.1,
			rootMargin: "0px",
		},
	);

	const from = direction === "down" ? value : startValue;
	const to = direction === "down" ? startValue : value;

	useEffect(() => {
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
	}, [hasIntersected, from, to, delay, duration]);

	return (
		<span
			ref={ref}
			className={cn("inline-block tabular-nums tracking-wider", className)}
			{...props}
		>
			{Intl.NumberFormat("en-US", {
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces,
			}).format(displayValue)}
		</span>
	);
}

export default NumberTicker;
