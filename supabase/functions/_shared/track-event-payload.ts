/**
 * The `track-event` request body, validated (2026-11-24 SEO audit T1).
 *
 * A dependency-free leaf, like `rate-limit-decision.ts`: no import and no
 * runtime global, so `__tests__/track-event-payload.test.ts` runs it under
 * Vitest. Do not add an import.
 *
 * The body is untrusted: anyone can post it. Everything that reaches the
 * `analytics_events` insert is checked here, and anything unexpected rejects
 * the whole event rather than being trimmed into shape.
 */

/**
 * The funnel's events, in order. A closed list, copied in the
 * `analytics_events_name_check` constraint and in `src/lib/analytics/track.ts`;
 * the parity test holds the three together.
 */
const TRACK_EVENT_NAMES = [
	"cta_start_free",
	"signup_started",
	"signup_completed",
	"checkout_started",
	"checkout_completed",
] as const;

export type TrackEventName = (typeof TRACK_EVENT_NAMES)[number];

/** A row for `analytics_events`, minus the server-set user id. */
export interface TrackEventRow {
	name: TrackEventName;
	props: Record<string, string | number | boolean>;
	path: string | null;
	referrer_host: string | null;
	visit_id: string | null;
}

const MAX_PROPS = 8;
const MAX_KEY_LENGTH = 40;
const MAX_VALUE_LENGTH = 120;
const MAX_PATH_LENGTH = 512;
const KEY = /^[a-z][a-z0-9_]*$/;
const HOST = /^[a-z0-9.-]{1,255}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEventName(value: unknown): value is TrackEventName {
	return (
		typeof value === "string" &&
		(TRACK_EVENT_NAMES as readonly string[]).includes(value)
	);
}

function readProps(
	value: unknown,
): Record<string, string | number | boolean> | null {
	if (value === undefined) return {};
	if (!isRecord(value)) return null;
	const entries = Object.entries(value);
	if (entries.length > MAX_PROPS) return null;
	const props: Record<string, string | number | boolean> = {};
	for (const [key, raw] of entries) {
		if (key.length > MAX_KEY_LENGTH || !KEY.test(key)) return null;
		if (typeof raw === "string") {
			if (raw.length > MAX_VALUE_LENGTH) return null;
			props[key] = raw;
		} else if (typeof raw === "number") {
			if (!Number.isFinite(raw)) return null;
			props[key] = raw;
		} else if (typeof raw === "boolean") {
			props[key] = raw;
		} else {
			return null;
		}
	}
	return props;
}

/** A same-site path: starts with one "/", no scheme, bounded. */
function readPath(value: unknown): string | null | undefined {
	if (value === undefined || value === null) return null;
	if (typeof value !== "string") return undefined;
	if (value.length > MAX_PATH_LENGTH) return undefined;
	if (!value.startsWith("/") || value.startsWith("//")) return undefined;
	return value;
}

function readOptional(
	value: unknown,
	pattern: RegExp,
): string | null | undefined {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value !== "string") return undefined;
	const lowered = value.toLowerCase();
	return pattern.test(lowered) ? lowered : undefined;
}

/** The row to insert, or `null` when the body is not a valid event. */
export function readTrackEvent(body: unknown): TrackEventRow | null {
	if (!isRecord(body)) return null;
	if (!isEventName(body.name)) return null;
	const props = readProps(body.props);
	if (props === null) return null;
	const path = readPath(body.path);
	if (path === undefined) return null;
	const referrerHost = readOptional(body.referrer_host, HOST);
	if (referrerHost === undefined) return null;
	const visitId = readOptional(body.visit_id, UUID);
	if (visitId === undefined) return null;
	return {
		name: body.name,
		props,
		path,
		referrer_host: referrerHost,
		visit_id: visitId,
	};
}
