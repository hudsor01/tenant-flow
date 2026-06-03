import { RefObject, useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions {
	threshold?: number | number[];
	root?: Element | null;
	rootMargin?: string;
}

/**
 * Hook to observe element intersection with viewport
 * Uses ref tracking to avoid circular dependency on hasIntersected state
 *
 * @param ref - Reference to element to observe
 * @param options - IntersectionObserver options
 * @returns Object with isIntersecting (reactive) and hasIntersected (tracked once)
 */
export function useIntersectionObserver(
	ref: RefObject<Element>,
	options: UseIntersectionObserverOptions = {},
) {
	const [isIntersecting, setIsIntersecting] = useState(false);
	const [hasIntersected, setHasIntersected] = useState(false);
	// Use ref to track if we've already triggered the "first intersection"
	// This breaks the circular dependency: state change no longer triggers re-run
	const hasIntersectedRef = useRef(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const markIntersected = () => {
			if (hasIntersectedRef.current) return;
			hasIntersectedRef.current = true;
			setHasIntersected(true);
		};

		// Synchronous initial-visibility fallback. IntersectionObserver's
		// first callback is asynchronous, and some automated/headless
		// browsers never fire it at all — which leaves an element that is
		// already in view stuck in its pre-intersection state (e.g. a
		// NumberTicker frozen at startValue on first paint). A direct rect
		// check on mount closes that gap. It only ever PROMOTES to
		// intersected, and it honors the SAME threshold the observer uses
		// (computing the visible-area ratio) so the fallback can never fire
		// earlier than a real intersection callback would — the scroll-in
		// path for below-threshold elements is unchanged. Guarded on
		// width/height > 0 so jsdom (which returns an all-zero rect) falls
		// through to the observer.
		const rect = element.getBoundingClientRect();
		const viewportHeight =
			window.innerHeight || document.documentElement.clientHeight;
		const viewportWidth =
			window.innerWidth || document.documentElement.clientWidth;
		const thresholds = Array.isArray(options.threshold)
			? options.threshold
			: [options.threshold ?? 0];
		// For an array threshold the observer fires at its lowest entry.
		const minThreshold = thresholds.length > 0 ? Math.min(...thresholds) : 0;
		const visibleHeight =
			Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
		const visibleWidth =
			Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
		const visibleRatio =
			rect.width > 0 && rect.height > 0
				? (Math.max(0, visibleHeight) * Math.max(0, visibleWidth)) /
					(rect.width * rect.height)
				: 0;
		// threshold 0 → any visible pixel counts (observer semantics);
		// threshold 0.1 → at least 10% of the box area must be in view.
		const alreadyVisible = visibleRatio > 0 && visibleRatio >= minThreshold;
		if (alreadyVisible) {
			setIsIntersecting(true);
			markIntersected();
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				const isCurrentlyIntersecting = entry?.isIntersecting ?? false;
				setIsIntersecting(isCurrentlyIntersecting);

				// Only set state once when first intersecting (ref guard avoids
				// re-running the effect on the state change).
				if (isCurrentlyIntersecting) {
					markIntersected();
				}
			},
			{
				threshold: options.threshold ?? 0,
				root: options.root ?? null,
				rootMargin: options.rootMargin ?? "0px",
			},
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [ref, options.threshold, options.root, options.rootMargin]);
	// Removed hasIntersected from dependencies - no circular dependency!

	return { isIntersecting, hasIntersected };
}
