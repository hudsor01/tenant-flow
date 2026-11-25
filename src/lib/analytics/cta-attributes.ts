/**
 * The attributes that mark a "Start free" call to action for the funnel
 * (2026-11-24 SEO audit T1). Spread them on the link or button:
 * `<Link href="/pricing" {...ctaTrackAttributes("home-hero")}>`. The page's
 * `ClickTracker` records a `cta_start_free` event, with this location, when
 * one is clicked. No imports, so server components can use it.
 */
export function ctaTrackAttributes(location: string): {
	"data-track": "cta_start_free";
	"data-track-location": string;
} {
	return { "data-track": "cta_start_free", "data-track-location": location };
}
