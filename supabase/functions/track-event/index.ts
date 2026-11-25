// Track Event Edge Function (2026-11-24 SEO audit T1, roadmap PR 3a).
// Records one first-party funnel event in public.analytics_events.
// Unauthenticated by design: marketing visitors are anonymous. Rate limited at
// 60 events/min per IP (Postgres sliding window, fail-CLOSED), like the
// contact form and newsletter. The body is validated by the pure
// `_shared/track-event-payload.ts`; a signed-in owner's Bearer token, when
// present and valid, links the event to them.
//
// POST { name, props?, path?, referrer_host?, visit_id? }
// -> 204 (recorded)
// -> 400 { error: 'Invalid event' }
// -> 429 { error: 'Too many requests' }
// -> 500 { error: 'An error occurred' }

import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import { readTrackEvent } from "../_shared/track-event-payload.ts";

/** Events are small; anything bigger is not one. */
const MAX_BODY_BYTES = 4096;

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	if (req.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: getCorsHeaders(req),
		});
	}

	const rateLimited = await rateLimit(req, {
		maxRequests: 60,
		windowMs: 60_000,
		prefix: "track",
	});
	if (rateLimited) return rateLimited;

	try {
		const env = validateEnv({
			required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
			// SENTRY_DSN and CLIENT_IP_FORWARD_SECRET are read directly via
			// Deno.env.get by _shared/errors.ts and _shared/rate-limit.ts.
			optional: [
				"NEXT_PUBLIC_APP_URL",
				"SENTRY_DSN",
				"CLIENT_IP_FORWARD_SECRET",
			],
		});

		const text = await req.text();
		let body: unknown = null;
		if (text.length <= MAX_BODY_BYTES) {
			try {
				body = JSON.parse(text);
			} catch {
				body = null;
			}
		}
		const event = readTrackEvent(body);
		if (!event) {
			return new Response(JSON.stringify({ error: "Invalid event" }), {
				status: 400,
				headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
			});
		}

		const supabase = createAdminClient(
			env.SUPABASE_URL,
			env.SUPABASE_SERVICE_ROLE_KEY,
		);

		// Identity comes only from a verified session token, never the body. A
		// missing, anonymous or invalid token records the event anonymously.
		let userId: string | null = null;
		const header = req.headers.get("Authorization") ?? "";
		const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
		if (token) {
			const { data } = await supabase.auth.getUser(token);
			userId = data.user?.id ?? null;
		}

		const { error } = await supabase
			.from("analytics_events")
			.insert({ ...event, user_id: userId });
		if (error) throw new Error(`analytics_events insert: ${error.message}`);

		return new Response(null, { status: 204, headers: getCorsHeaders(req) });
	} catch (err) {
		return errorResponse(req, 500, err, { action: "track_event" });
	}
});
