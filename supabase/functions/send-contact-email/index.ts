// Send Contact Email Edge Function
// FORMFIX-02: Delivers a submitted contact-form message to the business inbox via Resend.
// Unauthenticated by design -- the public /contact form posts here.
// Rate limited at 10 req/min per IP (Upstash sliding window, fail-open).
// Every user-supplied value is HTML-escaped before interpolation (anti-injection).
// The From address stays the fixed FROM_ADDRESS -- user input never sets From/Reply-To.
//
// POST { name, email, subject, message, type?, phone?, company?, urgency? }
// -> 200 { success: true }
// -> 400 { error: 'Valid contact details are required' }
// -> 429 { error: 'Too many requests' }
// -> 500 { error: 'An error occurred' }   (unexpected server error)
// -> 502 { error: 'An error occurred' }   (Resend send failure)

import {
	getCorsHeaders,
	getJsonHeaders,
	handleCorsOptions,
} from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { errorResponse } from "../_shared/errors.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { sendEmail } from "../_shared/resend.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Destination business inbox (matches the address the /contact page displays).
const CONTACT_INBOX = "sales@tenantflow.app";

// Length bounds -- reject oversized payloads before building an email.
const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;
const MAX_OPTIONAL = 200;

/** Coerce an unknown body field to a trimmed string. */
function str(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req: Request) => {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	if (req.method !== "POST") {
		return new Response("Method Not Allowed", {
			status: 405,
			headers: getCorsHeaders(req),
		});
	}

	// Unauthenticated endpoint: rate limit 10 req/min per IP (fail-open).
	const rateLimited = await rateLimit(req, {
		maxRequests: 10,
		windowMs: 60_000,
		prefix: "contact",
	});
	if (rateLimited) return rateLimited;

	try {
		validateEnv({
			required: ["RESEND_API_KEY"],
			optional: [
				"NEXT_PUBLIC_APP_URL",
				"UPSTASH_REDIS_REST_URL",
				"UPSTASH_REDIS_REST_TOKEN",
			],
		});

		const body = (await req.json()) as Record<string, unknown>;
		const name = str(body.name);
		const email = str(body.email).toLowerCase();
		const subject = str(body.subject);
		const message = str(body.message);
		const type = str(body.type);
		const phone = str(body.phone);
		const company = str(body.company);
		const urgency = str(body.urgency);

		// Server-side validation: required fields + email format + length bounds.
		if (
			!name ||
			name.length > MAX_NAME ||
			!email ||
			email.length > MAX_EMAIL ||
			!EMAIL_REGEX.test(email) ||
			!subject ||
			subject.length > MAX_SUBJECT ||
			!message ||
			message.length > MAX_MESSAGE ||
			phone.length > MAX_OPTIONAL ||
			company.length > MAX_OPTIONAL ||
			type.length > MAX_OPTIONAL ||
			urgency.length > MAX_OPTIONAL
		) {
			return new Response(
				JSON.stringify({ error: "Valid contact details are required" }),
				{ status: 400, headers: getJsonHeaders(req) },
			);
		}

		// Anti-injection: escape EVERY user value before interpolation into HTML.
		const safe = {
			name: escapeHtml(name),
			email: escapeHtml(email),
			subject: escapeHtml(subject),
			message: escapeHtml(message).replace(/\n/g, "<br />"),
			type: escapeHtml(type),
			phone: escapeHtml(phone),
			company: escapeHtml(company),
			urgency: escapeHtml(urgency),
		};

		const rows = [
			`<p><strong>Name:</strong> ${safe.name}</p>`,
			`<p><strong>Email:</strong> ${safe.email}</p>`,
			safe.phone ? `<p><strong>Phone:</strong> ${safe.phone}</p>` : "",
			safe.company ? `<p><strong>Company:</strong> ${safe.company}</p>` : "",
			safe.type ? `<p><strong>Inquiry type:</strong> ${safe.type}</p>` : "",
			safe.urgency ? `<p><strong>Urgency:</strong> ${safe.urgency}</p>` : "",
			`<p><strong>Subject:</strong> ${safe.subject}</p>`,
			`<p><strong>Message:</strong></p><p>${safe.message}</p>`,
		]
			.filter(Boolean)
			.join("\n");

		const html = `<!doctype html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
<h2>New contact form submission</h2>
${rows}
</body>
</html>`;

		// From stays the fixed FROM_ADDRESS; the subject carries the escaped value.
		const result = await sendEmail({
			to: [CONTACT_INBOX],
			subject: `Contact form: ${safe.subject}`,
			html,
			tags: [{ name: "source", value: "contact-form" }],
		});

		if (!result.success) {
			return errorResponse(req, 502, new Error(result.error), {
				action: "send_contact_email",
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: getJsonHeaders(req),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "send_contact_email" });
	}
});
