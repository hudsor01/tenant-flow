"use client";

import { useEffect } from "react";
import { UTM_KEYS, UTM_STORAGE_KEY } from "#lib/analytics/track";

/**
 * Saves the campaign tags (`utm_source`, `utm_medium`, `utm_campaign`) of the
 * link a visit arrived by, for `track()` to attach to its events (2026-11-24
 * SEO audit T3). First touch wins for the tab: later internal links carry no
 * tags and must not erase them. The values are never shown on the page.
 */
export function UtmCapture() {
	useEffect(() => {
		try {
			if (window.sessionStorage.getItem(UTM_STORAGE_KEY)) return;
			const query = new URLSearchParams(window.location.search);
			const tags: Record<string, string> = {};
			for (const key of UTM_KEYS) {
				const value = query.get(key);
				if (value) tags[key] = value;
			}
			if (Object.keys(tags).length > 0)
				window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(tags));
		} catch {
			// Storage blocked: the visit simply has no campaign tags.
		}
	}, []);
	return null;
}
