/**
 * Tripwire for the www -> apex canonical-host redirect in `next.config.ts`.
 *
 * Source-scanned rather than imported: `next.config.ts` does `import
 * "./src/env"` at module scope, so importing it here would drag in env
 * validation and `@sentry/nextjs` for the sake of reading one array entry.
 *
 * This is a DELETION tripwire, not a behavioural test. Whether the rule works
 * is proved by the compiled artifact — `.next/routes-manifest.json` carries it
 * as `{source: "/:path*", has: [{type: "host", value: "www.tenantflow.app"}],
 * destination: "https://tenantflow.app/:path*", statusCode: 308}` — and by a
 * live curl after deploy. What CI cannot otherwise catch is someone quietly
 * removing the entry, because a missing redirect breaks no build and fails no
 * other test; www would silently go back to serving the whole site at 200 on a
 * second hostname.
 *
 * Context: www served an EXPIRED certificate until 2026-08-04 because it had
 * never been added as a Vercel project domain, so no cert was ever provisioned
 * for it. Adding the domain fixed TLS but made www a full alias.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Comment-stripped, and that is load-bearing. The redirect in `next.config.ts`
 * carries a long comment that names `www.tenantflow.app` several times, so a
 * raw substring scan matches the PROSE and passes even when the rule itself is
 * deleted. Caught by mutation-testing this file: removing the redirect block
 * left all four assertions green until this strip was added.
 */
function stripComments(source: string): string {
	return (
		source
			.replace(/\/\*[\s\S]*?\*\//g, " ")
			// `^\s*` is REQUIRED. The unanchored `//.*$` form used elsewhere in
			// this repo strips from the first `//` anywhere on a line — which
			// inside this file eats the URL itself, turning
			// `destination: "https://tenantflow.app/:path*"` into
			// `destination: "https:`. Anchoring to full-line comments removes the
			// prose above the rule while leaving `https://` in code intact.
			.replace(/^\s*\/\/.*$/gm, "")
	);
}

const configSource = stripComments(
	readFileSync(join(process.cwd(), "next.config.ts"), "utf8"),
);

describe("www -> apex canonical redirect (next.config.ts)", () => {
	it("matches on the www host", () => {
		expect(configSource).toMatch(
			/has:\s*\[\{\s*type:\s*"host",\s*value:\s*"www\.tenantflow\.app"\s*\}\]/,
		);
	});

	it("sends traffic to the apex, not back to www", () => {
		expect(configSource).toContain(
			'destination: "https://tenantflow.app/:path*"',
		);
		// Loop guard: the destination must not itself carry the www host, or the
		// rule would match its own output forever.
		expect(configSource).not.toContain(
			'destination: "https://www.tenantflow.app/:path*"',
		);
	});

	it("is permanent, so search consolidates on the apex", () => {
		// Scoped to the www block rather than the whole file — `permanent: true`
		// appears on several unrelated redirects below it.
		const block = configSource.slice(
			configSource.indexOf('value: "www.tenantflow.app"'),
		);
		expect(block.slice(0, 200)).toContain("permanent: true");
	});

	// Non-vacuity: the assertions above are substring checks, so they would pass
	// against a file that merely MENTIONS these strings in prose. Pin that the
	// app itself still treats the apex as canonical, which is the reason the
	// redirect points where it does.
	it("no source file self-references the www host", () => {
		// If anything in src/ ever links to www, the redirect would add a hop to
		// an internal link and this decision needs revisiting.
		const appSource = readFileSync(
			join(process.cwd(), "src/lib/seo/page-metadata.ts"),
			"utf8",
		);
		expect(appSource).not.toContain("www.tenantflow.app");
	});
});
