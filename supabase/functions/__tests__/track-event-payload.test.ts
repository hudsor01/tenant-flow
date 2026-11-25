/**
 * The `track-event` body validator (2026-11-24 SEO audit T1): the untrusted
 * body anyone can post becomes an `analytics_events` row only if every field
 * is what the funnel expects. Also holds the event-name list's three copies
 * together: this leaf, the client's `TRACK_EVENT_NAMES`, and the migration's
 * CHECK constraint and funnel report.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readTrackEvent } from "../_shared/track-event-payload";

const FUNNEL_MIGRATION = readFileSync(
	"supabase/migrations/20261125172716_analytics_events.sql",
	"utf8",
);
/** The newest definition of analytics_events_name_check. */
const NAMES_MIGRATION = readFileSync(
	"supabase/migrations/20261125181804_analytics_events_engagement.sql",
	"utf8",
);
const CLIENT_TRACK = readFileSync("src/lib/analytics/track.ts", "utf8");
const CLIENT_CLICKS = readFileSync(
	"src/lib/analytics/cta-attributes.ts",
	"utf8",
);
const VISIT = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

/** The quoted names between two markers of a SQL file, in order. */
function namesIn(sql: string, from: string, to: string): string[] {
	const span = sql.slice(sql.indexOf(from), sql.indexOf(to, sql.indexOf(from)));
	return (span.match(/'[a-z_]+'/g) ?? []).map((quoted) => quoted.slice(1, -1));
}

/** The `name: "…"` literals of a TypeScript union, from its declaration on. */
function unionNames(source: string, declaration: string): string[] {
	const union = source.slice(source.indexOf(declaration));
	const end = union.indexOf(";\n\n");
	return [...union.slice(0, end).matchAll(/name: "([a-z_]+)"/g)].map(
		(match) => match[1] ?? "",
	);
}

describe("track-event event names", () => {
	const DATABASE = namesIn(NAMES_MIGRATION, "add constraint", ");\n");
	const FUNNEL = namesIn(FUNNEL_MIGRATION, "from unnest(array[", "with ordinality");

	it("put the funnel report's five steps first in the constraint", () => {
		expect(FUNNEL).toHaveLength(5);
		expect(DATABASE.slice(0, 5)).toEqual(FUNNEL);
		expect(new Set(DATABASE).size).toBe(DATABASE.length);
	});

	it("are the client's events: the click union plus track.ts's own", () => {
		const client = [
			...unionNames(CLIENT_CLICKS, "export type ClickEvent ="),
			...unionNames(CLIENT_TRACK, "export type TrackEvent ="),
		];
		expect([...client].sort()).toEqual([...DATABASE].sort());
	});

	it("are exactly the names the validator accepts", () => {
		for (const name of DATABASE)
			expect(readTrackEvent({ name }), name).not.toBeNull();
		for (const name of ["purchase", "page_view", "CTA_START_FREE", ""])
			expect(readTrackEvent({ name }), name).toBeNull();
	});
});

describe("readTrackEvent", () => {
	const valid = {
		name: "cta_start_free",
		props: { location: "home-hero" },
		path: "/features",
		referrer_host: "Google.com",
		visit_id: VISIT.toUpperCase(),
	};

	it("accepts a well-formed event and normalizes hosts and ids", () => {
		expect(readTrackEvent(valid)).toEqual({
			name: "cta_start_free",
			props: { location: "home-hero" },
			path: "/features",
			referrer_host: "google.com",
			visit_id: VISIT,
		});
	});

	it("takes the optional fields as absent", () => {
		expect(readTrackEvent({ name: "checkout_completed" })).toEqual({
			name: "checkout_completed",
			props: {},
			path: null,
			referrer_host: null,
			visit_id: null,
		});
	});

	it("keeps number and boolean props", () => {
		expect(
			readTrackEvent({
				name: "signup_completed",
				props: { plan: "Growth", confirmed: true, step: 2 },
			})?.props,
		).toEqual({ plan: "Growth", confirmed: true, step: 2 });
	});

	it.each([
		["a non-object body", "cta_start_free"],
		["an unknown event", { ...valid, name: "purchase" }],
		["props that are not an object", { ...valid, props: ["x"] }],
		["a nested prop", { ...valid, props: { location: { a: 1 } } }],
		["a null prop", { ...valid, props: { location: null } }],
		["a long prop", { ...valid, props: { location: "x".repeat(121) } }],
		["a bad prop key", { ...valid, props: { "Location!": "x" } }],
		[
			"too many props",
			{
				...valid,
				props: Object.fromEntries(
					Array.from({ length: 9 }, (_, i) => [`k${i}`, "v"]),
				),
			},
		],
		["a non-finite number", { ...valid, props: { n: Number.NaN } }],
		["an absolute URL as the path", { ...valid, path: "https://evil.test/" }],
		["a protocol-relative path", { ...valid, path: "//evil.test/" }],
		["a long path", { ...valid, path: `/${"a".repeat(512)}` }],
		["a referrer that is a URL", { ...valid, referrer_host: "https://a.com" }],
		["a visit id that is not a UUID", { ...valid, visit_id: "abc" }],
	])("rejects %s", (_label, body) => {
		expect(readTrackEvent(body)).toBeNull();
	});
});
