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

const MIGRATION = readFileSync(
	"supabase/migrations/20261125172716_analytics_events.sql",
	"utf8",
);
const CLIENT = readFileSync("src/lib/analytics/track.ts", "utf8");
const VISIT = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("track-event event names", () => {
	/** The quoted names in one span of the migration, in order. */
	const namesIn = (from: string, to: string) =>
		(MIGRATION.slice(MIGRATION.indexOf(from), MIGRATION.indexOf(to)).match(
			/'[a-z_]+'/g,
		) ?? []).map((quoted) => quoted.slice(1, -1));
	const DATABASE = namesIn(
		"analytics_events_name_check",
		"analytics_events_props_check",
	);

	it("are the same list in the database's constraint and funnel report", () => {
		expect(DATABASE).toHaveLength(5);
		expect(namesIn("from unnest(array[", "with ordinality")).toEqual(DATABASE);
	});

	it("are the client's TrackEvent names, in order", () => {
		const union = CLIENT.slice(CLIENT.indexOf("export type TrackEvent ="));
		const names = [...union.matchAll(/name: "([a-z_]+)"/g)].map(
			(match) => match[1],
		);
		expect(names).toEqual(DATABASE);
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
