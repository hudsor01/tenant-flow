// @vitest-environment node
/**
 * Every Sentry.init in the app scrubs everything it sends (src/lib/sentry-scrub.ts):
 * events (the integration), breadcrumbs, streamed spans and, since Sentry Logs
 * were wired up (2026-11-28), logs, which carry console lines and logger
 * context. It also captures console warnings and errors as logs.
 *
 * The inits are configuration, not functions a test can call, so this reads
 * their source. A new init (a new runtime) must be added to INITS.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");

/** A repo file's text; a path that resolves outside the repo is refused. */
function readRepoFile(path: string): string {
	const absolute = resolve(ROOT, path);
	const inside = relative(ROOT, absolute);
	if (inside.startsWith("..") || inside.includes(`..${sep}`)) {
		throw new Error(`refusing to read outside the repo: ${path}`);
	}
	return readFileSync(absolute, "utf8");
}

const INITS = [
	"sentry.server.config.ts",
	"sentry.edge.config.ts",
	"src/lib/sentry-browser-init.ts",
];

const REQUIRED: Array<[string, RegExp]> = [
	["the URL-scrubbing integration", /\bscrubUrlsIntegration\(\)/],
	["breadcrumb scrubbing", /beforeBreadcrumb:\s*scrubBreadcrumb\b/],
	["span scrubbing", /beforeSendSpan:\s*scrubSpan\b/],
	["log scrubbing", /beforeSendLog\([^)]*\)\s*{[\s\S]*?return scrubLog\(/],
	[
		"no logs from development",
		/beforeSendLog\([^)]*\)\s*{\s*if \(process\.env\.NODE_ENV === "development" && !process\.env\.SENTRY_DEBUG\) {\s*return null;/,
	],
	[
		"console warnings and errors as logs",
		/consoleLoggingIntegration\(\{\s*levels:\s*\["warn", "error"\]\s*\}\)/,
	],
];

describe("every Sentry.init scrubs what it sends", () => {
	it.each(INITS)("%s", (file) => {
		const source = readRepoFile(file);
		expect(source).toContain("Sentry.init(");
		const missing = REQUIRED.filter(([, pattern]) => !pattern.test(source));
		expect(missing.map(([name]) => name)).toEqual([]);
	});

	it("lists every file that calls Sentry.init", () => {
		const roots = readdirSync(ROOT).filter((name) =>
			/^sentry\..*\.ts$/.test(name),
		);
		const libs = readdirSync(join(ROOT, "src/lib"))
			.filter((name) => /\.tsx?$/.test(name))
			.map((name) => `src/lib/${name}`);
		const callers = [...roots, ...libs].filter((file) =>
			readRepoFile(file).includes("Sentry.init("),
		);
		expect(callers.sort()).toEqual([...INITS].sort());
	});
});
