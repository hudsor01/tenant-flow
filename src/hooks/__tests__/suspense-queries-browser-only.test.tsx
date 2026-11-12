/**
 * Owner data loads in the browser only: a component that suspends on it must
 * not render on the server.
 *
 * WHAT WENT WRONG. `useSuspenseQuery` in a client component runs its queryFn
 * during server rendering, with the browser Supabase client and no session, so
 * PostgREST refused it as anon: `42501 permission denied for table tenants`
 * (and maintenance_requests, inspections) on every tenant, maintenance and
 * inspection detail page load, logged and sent to Sentry before the browser
 * fetched the data again.
 *
 * THE RULE. Every non-test file under src that calls `useSuspenseQuery` also
 * calls `useIsClient` (`#hooks/use-is-client`) and renders its skeleton until
 * it is true.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useIsClient } from "#hooks/use-is-client";

const ROOT = process.cwd();

function sources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" || entry.name === "test"
				? []
				: sources(path);
		}
		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
			? [path]
			: [];
	});
}

function Probe() {
	return <span>{useIsClient() ? "client" : "server"}</span>;
}

describe("suspense queries render in the browser only", () => {
	it("gates every useSuspenseQuery caller with useIsClient", () => {
		const callers = sources(join(ROOT, "src")).filter((path) =>
			/\buseSuspenseQuery\(/.test(readFileSync(path, "utf8")),
		);
		expect(callers.length).toBeGreaterThan(0);
		const ungated = callers
			.filter((path) => !/\buseIsClient\(\)/.test(readFileSync(path, "utf8")))
			.map((path) => relative(ROOT, path));
		expect(
			ungated,
			"These call useSuspenseQuery without useIsClient: on the server their query runs without a session (42501). Render the skeleton until useIsClient() is true.",
		).toEqual([]);
	});

	it("is false while rendering on the server", () => {
		expect(renderToString(<Probe />)).toBe("<span>server</span>");
	});
});
