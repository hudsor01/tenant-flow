"use client";

/**
 * SSR-safe shared hook returning whether the user has
 * `prefers-reduced-motion: reduce` set. Extracts the inline pattern from
 * `BlurFade` (src/components/ui/blur-fade.tsx:22-31) so Phase 3+ surfaces
 * can gate motion through a single canonical source (03-UI-SPEC § 5.4).
 *
 * Returns `false` during SSR (initial state) and on the first client render
 * before the effect runs — same shape `BlurFade` already uses to avoid
 * hydration mismatches.
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
