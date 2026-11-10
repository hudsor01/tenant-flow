"use client";

/**
 * SSR-safe shared hook returning whether the user has
 * `prefers-reduced-motion: reduce` set: one canonical matchMedia subscription
 * so surfaces that branch their markup on reduced motion (e.g. KpiBentoRow)
 * gate it through a single source (03-UI-SPEC § 5.4). Components that only
 * need to drop an animation use the CSS `motion-reduce:` variant instead.
 *
 * It reads matchMedia during render through `useSyncExternalStore`, so a
 * component that mounts on the client (every owner surface: owner data loads
 * in the browser) has the preference on its first render. When the hook set it
 * from an effect instead, every fresh mount committed its motion-on markup
 * first: the dashboard's KPI tiles committed "$0" and "0%" before their
 * figures, and Chrome painted that frame (66.2-39 fix round 4, G16).
 *
 * During server render and hydration it returns the server snapshot, `false`,
 * so the hydrated markup matches the server's; React then re-renders the
 * hydrated component with the client's value.
 */

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
	const mql = window.matchMedia(REDUCED_MOTION_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot(): boolean {
	return false;
}

export function useReducedMotion(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
