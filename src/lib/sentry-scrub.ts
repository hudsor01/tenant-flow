/**
 * Keep secrets in URLs out of Sentry.
 *
 * Some URLs here are credentials. `/sign/<token>` and `/apply/<token>` carry a
 * bearer token: whoever holds the link can sign a lease or submit a rental
 * application. `/auth/callback?code=…&token_hash=…` carries a sign-in token.
 * PostgREST query strings carry search terms (tenant names) and filters. The
 * SDK puts URLs in many places: `request.url` and the Referer header, the
 * transaction name, fetch and navigation breadcrumbs, span names and
 * attributes, and a feedback report's page URL.
 *
 * So every URL Sentry sees loses its query string and fragment, and the token
 * segment of a token route becomes `[token]`. Used by every Sentry.init in the
 * app (browser, Node, edge) through `scrubUrlsIntegration`, `beforeBreadcrumb`
 * and `beforeSendSpan`; an integration's `processEvent` runs for every event
 * type (errors, transactions, feedback), where `beforeSend` sees errors only.
 */

/** The routes whose path segment after the prefix is a bearer token. */
const TOKEN_ROUTE = /(\/(?:sign|apply)\/)[^/?#\s"'<>]+/g;

/** An absolute http(s) URL, or a root-relative path not glued to a word. */
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+|(?<![\w.:/])\/[^\s"'<>]*/g;

/** A URL (absolute or a path) with its query and fragment cut and its token redacted. */
function scrubUrl(url: string): string {
	return url.replace(/[?#].*$/s, "").replace(TOKEN_ROUTE, "$1[token]");
}

/** Text with every URL in it scrubbed ("GET /sign/abc?x=1" -> "GET /sign/[token]"). */
function scrubText(text: string): string {
	return text.replace(URL_IN_TEXT, (url) => scrubUrl(url));
}

/** A key that holds a URL's query or fragment on its own (`http.query`, `url.fragment`). */
const QUERY_KEY = /(?:^|[._])(?:query|fragment|search|hash)$/i;

/**
 * A query string or fragment on its own ("?or=(email.ilike.*maria*)") is not a
 * URL to `scrubText`, so it is emptied by its key or its leading `?` / `#`.
 */
function scrubValue(key: string, value: string): string {
	if (QUERY_KEY.test(key) || /^[?#]/.test(value)) return "";
	return scrubText(value);
}

function scrubValues(record: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(record)) {
		if (typeof value === "string") {
			record[key] = scrubValue(key, value);
		} else if (
			value !== null &&
			typeof value === "object" &&
			"value" in value &&
			typeof (value as { value: unknown }).value === "string"
		) {
			// Streamed span attributes may arrive as { value, type }.
			const attribute = value as { value: string };
			record[key] = { ...attribute, value: scrubValue(key, attribute.value) };
		}
	}
}

interface ScrubbableBreadcrumb {
	message?: string;
	data?: Record<string, unknown>;
}

export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(
	breadcrumb: T,
): T {
	if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
	if (breadcrumb.data) scrubValues(breadcrumb.data);
	return breadcrumb;
}

interface ScrubbableSpan {
	name?: string;
	description?: string;
	attributes?: Record<string, unknown>;
	data?: Record<string, unknown>;
}

export function scrubSpan<T extends ScrubbableSpan>(span: T): T {
	if (span.name) span.name = scrubText(span.name);
	if (span.description) span.description = scrubText(span.description);
	if (span.attributes) scrubValues(span.attributes);
	if (span.data) scrubValues(span.data);
	return span;
}

interface ScrubbableEvent {
	message?: string;
	transaction?: string;
	request?: {
		url?: string;
		query_string?: unknown;
		headers?: Record<string, string>;
	};
	exception?: { values?: Array<{ value?: string }> };
	breadcrumbs?: ScrubbableBreadcrumb[];
	spans?: ScrubbableSpan[];
	contexts?: Record<string, Record<string, unknown> | undefined>;
}

function scrubEvent<T extends ScrubbableEvent>(event: T): T {
	if (event.message) event.message = scrubText(event.message);
	if (event.transaction) event.transaction = scrubText(event.transaction);
	if (event.request) {
		if (event.request.url) event.request.url = scrubUrl(event.request.url);
		delete event.request.query_string;
		const headers = event.request.headers;
		if (headers) {
			for (const name of Object.keys(headers)) {
				if (name.toLowerCase() === "referer" && headers[name]) {
					headers[name] = scrubUrl(headers[name]);
				}
			}
		}
	}
	for (const exception of event.exception?.values ?? []) {
		if (exception.value) exception.value = scrubText(exception.value);
	}
	for (const breadcrumb of event.breadcrumbs ?? []) scrubBreadcrumb(breadcrumb);
	for (const span of event.spans ?? []) scrubSpan(span);
	// contexts.trace.data (span attributes), contexts.feedback.url, ...
	for (const context of Object.values(event.contexts ?? {})) {
		if (!context) continue;
		if (typeof context.url === "string") context.url = scrubUrl(context.url);
		const data = context.data;
		if (data && typeof data === "object") {
			scrubValues(data as Record<string, unknown>);
		}
	}
	return event;
}

/** Runs `scrubEvent` on every event the client sends (errors, transactions, feedback). */
export function scrubUrlsIntegration() {
	return {
		name: "ScrubUrls",
		processEvent<T extends ScrubbableEvent>(event: T): T {
			return scrubEvent(event);
		},
	};
}
