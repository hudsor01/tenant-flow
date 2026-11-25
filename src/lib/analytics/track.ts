/**
 * First-party funnel events (2026-11-24 SEO audit T1, roadmap PR 3a).
 *
 * `track()` posts one event to the `track-event` Edge Function, which writes
 * `public.analytics_events`. It never throws and never blocks: a lost event
 * costs a count, never a click. What it sends: the event and its props, the
 * page path, the referrer's host, and a random id for this visit kept in
 * sessionStorage (gone when the tab closes), plus the campaign tags the visit
 * arrived with (`utm_source`, `utm_medium`, `utm_campaign`, saved by
 * `UtmCapture`), so a signup can be traced to the post or email that brought
 * it (T3). No cookie. A signed-in owner's session token rides along so the
 * server can link the event to them.
 */

import { env } from "#env";
import type { ClickEvent } from "#lib/analytics/cta-attributes";
import { createClient } from "#lib/supabase/client";

/**
 * The funnel's events, in order. A closed list, copied in the
 * `analytics_events_name_check` constraint and in
 * `supabase/functions/_shared/track-event-payload.ts`; the parity test in
 * `supabase/functions/__tests__/track-event-payload.test.ts` holds the three
 * together.
 */
export type TrackEvent =
	| ClickEvent
	| { name: "signup_started"; props: { plan: string } }
	| { name: "signup_completed"; props: { plan: string; confirmed: boolean } }
	| { name: "checkout_started"; props: { plan: string } }
	| { name: "checkout_completed"; props: Record<string, never> }
	| { name: "faq_open"; props: { question: string; location: string } }
	| { name: "resource_print"; props: { resource: string } }
	| {
			name: "contact_submitted";
			props: { subject: string; referral_source: string };
	  }
	| { name: "contact_failed"; props: { subject: string } }
	| { name: "newsletter_subscribed"; props: { location: string } }
	| { name: "application_link_created"; props: Record<string, never> };

/** The sessionStorage key `UtmCapture` writes the visit's campaign tags to. */
export const UTM_STORAGE_KEY = "tf-utm";

/** The campaign tags kept for a visit, in event props. */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** The server rejects a prop value longer than this. */
const MAX_PROP_LENGTH = 120;

/** This visit's saved campaign tags; empty when none or storage is blocked. */
function campaignTags(): Record<string, string> {
	try {
		const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		if (typeof parsed !== "object" || parsed === null) return {};
		const tags: Record<string, string> = {};
		for (const key of UTM_KEYS) {
			const value = Reflect.get(parsed, key);
			if (typeof value === "string" && value)
				tags[key] = value.slice(0, MAX_PROP_LENGTH);
		}
		return tags;
	} catch {
		return {};
	}
}

const VISIT_KEY = "tf-visit-id";

/** This tab's visit id, made on first use; null where storage is blocked. */
function visitId(): string | null {
	try {
		const existing = window.sessionStorage.getItem(VISIT_KEY);
		if (existing) return existing;
		const created = window.crypto.randomUUID();
		window.sessionStorage.setItem(VISIT_KEY, created);
		return created;
	} catch {
		return null;
	}
}

/** The host the visitor arrived from, or null. */
function referrerHost(): string | null {
	try {
		return document.referrer ? new URL(document.referrer).hostname : null;
	} catch {
		return null;
	}
}

async function send(event: TrackEvent): Promise<void> {
	const { data } = await createClient().auth.getSession();
	const token = data.session?.access_token;
	await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/track-event`, {
		method: "POST",
		// Outlives a navigation, so a click that leaves the page still counts.
		keepalive: true,
		headers: {
			"Content-Type": "application/json",
			apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({
			name: event.name,
			props: { ...event.props, ...campaignTags() },
			path: window.location.pathname,
			referrer_host: referrerHost(),
			visit_id: visitId(),
		}),
	});
}

/** Record a funnel event. Fire and forget: it never throws. */
export function track(event: TrackEvent): void {
	if (typeof window === "undefined") return;
	send(event).catch(() => undefined);
}
