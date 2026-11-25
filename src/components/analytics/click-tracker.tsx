"use client";

import { useEffect } from "react";
import { readClickEvent } from "#lib/analytics/cta-attributes";
import { track } from "#lib/analytics/track";

/**
 * Records the click events marked by `clickTrackAttributes()` (a "Start free"
 * or contact CTA, a compare card, a resource link, a support email). One
 * listener for the whole page, so server-rendered links need only the data
 * attributes.
 */
export function ClickTracker() {
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const marked = target.closest("[data-track]");
			if (!marked) return;
			const clicked = readClickEvent(
				marked.getAttribute("data-track"),
				marked.getAttribute("data-track-props"),
			);
			if (clicked) track(clicked);
		};
		document.addEventListener("click", onClick, { capture: true });
		return () =>
			document.removeEventListener("click", onClick, { capture: true });
	}, []);
	return null;
}
