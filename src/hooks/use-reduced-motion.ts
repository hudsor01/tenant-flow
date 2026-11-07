"use client";

/**
 * SSR-safe shared hook returning whether the user has
 * `prefers-reduced-motion: reduce` set: one canonical matchMedia subscription
 * so surfaces that branch their markup on reduced motion (e.g. KpiBentoRow)
 * gate it through a single source (03-UI-SPEC § 5.4). Components that only
 * need to drop an animation use the CSS `motion-reduce:` variant instead.
 *
 * Returns `false` during SSR (initial state) and on the first client render
 * before the effect runs, so server and first client render agree and there
 * is no hydration mismatch.
 */

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(mq.matches);
		const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return reduced;
}
