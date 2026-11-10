"use client";

/**
 * Reports whether the viewport is below Tailwind's `lg` breakpoint (64rem),
 * the width where the owner sidebar switches from the docked rail to the
 * sheet (D-33). Written by hand rather than taken from the registry's
 * `md`-breakpoint hook (D-45), so the JavaScript mode switch and the `lg:`
 * classes share one breakpoint; tailwind-theme-integrity.test.ts pins the
 * query against the compiled `--breakpoint-lg`.
 *
 * Returns `false` during server render and on the first client render, then
 * reads matchMedia in an effect, so hydration never mismatches. Used by the
 * vendored `#components/ui/sidebar`.
 */

import { useEffect, useState } from "react";

export const MOBILE_MEDIA_QUERY = "(width < 64rem)";

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
		setIsMobile(mql.matches);
		const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isMobile;
}
