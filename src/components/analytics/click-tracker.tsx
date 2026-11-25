"use client";

import { useEffect } from "react";
import { track } from "#lib/analytics/track";

/**
 * Records a `cta_start_free` event when a link or button marked with
 * `ctaTrackAttributes()` is clicked. One listener for the whole page, so
 * server-rendered calls to action need only the data attributes.
 */
export function ClickTracker() {
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const marked = target.closest("[data-track]");
			if (marked?.getAttribute("data-track") !== "cta_start_free") return;
			track({
				name: "cta_start_free",
				props: {
					location: marked.getAttribute("data-track-location") ?? "unknown",
				},
			});
		};
		document.addEventListener("click", onClick, { capture: true });
		return () =>
			document.removeEventListener("click", onClick, { capture: true });
	}, []);
	return null;
}
