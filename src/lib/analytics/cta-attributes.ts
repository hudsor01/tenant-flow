/**
 * Funnel events recorded from a click (2026-11-24 SEO audit T1, 3b). A link
 * or button carries its event as data attributes, which the page's
 * `ClickTracker` reads, so server components can mark their links. No
 * imports, so server components can use it.
 */

export type ClickEvent =
	| { name: "cta_start_free"; props: { location: string } }
	| { name: "cta_contact"; props: { location: string } }
	| { name: "compare_card_click"; props: { competitor: string } }
	| { name: "resource_open"; props: { resource: string; from: string } }
	| { name: "support_email_click"; props: { location: string } };

/** Each click event's prop names, which `readClickEvent` requires exactly. */
const CLICK_EVENT_PROPS: { [Name in ClickEvent["name"]]: readonly string[] } = {
	cta_start_free: ["location"],
	cta_contact: ["location"],
	compare_card_click: ["competitor"],
	resource_open: ["resource", "from"],
	support_email_click: ["location"],
};

/** The attributes that mark an element's click as `event`. */
export function clickTrackAttributes(event: ClickEvent): {
	"data-track": ClickEvent["name"];
	"data-track-props": string;
} {
	return {
		"data-track": event.name,
		"data-track-props": JSON.stringify(event.props),
	};
}

/** A "Start free" call to action, at `location`. */
export function ctaTrackAttributes(location: string) {
	return clickTrackAttributes({ name: "cta_start_free", props: { location } });
}

/** A "contact us" call to action, at `location`. */
export function contactTrackAttributes(location: string) {
	return clickTrackAttributes({ name: "cta_contact", props: { location } });
}

function isClickEventName(value: string): value is ClickEvent["name"] {
	return Object.hasOwn(CLICK_EVENT_PROPS, value);
}

/**
 * The event a marked element's attributes describe, or `null` when they are
 * not one: an unknown name, unreadable props, or props that are not exactly
 * the event's string fields.
 */
export function readClickEvent(
	name: string | null,
	propsJson: string | null,
): ClickEvent | null {
	if (!name || !isClickEventName(name) || !propsJson) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(propsJson);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
		return null;
	const props: Record<string, string> = {};
	const expected = CLICK_EVENT_PROPS[name];
	const entries = Object.entries(parsed);
	if (entries.length !== expected.length) return null;
	for (const [key, value] of entries) {
		if (!expected.includes(key) || typeof value !== "string") return null;
		props[key] = value;
	}
	switch (name) {
		case "cta_start_free":
		case "cta_contact":
		case "support_email_click":
			return props.location === undefined
				? null
				: { name, props: { location: props.location } };
		case "compare_card_click":
			return props.competitor === undefined
				? null
				: { name, props: { competitor: props.competitor } };
		case "resource_open":
			return props.resource === undefined || props.from === undefined
				? null
				: { name, props: { resource: props.resource, from: props.from } };
	}
}
