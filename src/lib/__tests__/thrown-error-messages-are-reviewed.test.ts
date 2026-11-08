/**
 * Every plain `Error` thrown in `src` carries copy, or never reaches a
 * screen (66.2-39 fix round 4, Part 5d).
 *
 * `userFacingErrorMessage`, the one sanitizer every toast and inline error
 * uses, shows a plain `Error`'s message verbatim: that is how author copy
 * ("Label must be 1-80 characters.") reaches the owner. So a plain `Error`
 * whose message names code reached the owner too: a malformed category row
 * toasted "mapDocumentCategoryRow: NOT NULL field 'slug' missing or
 * non-string from PostgREST response". Messages for logs and Sentry are
 * thrown as `DiagnosticError` (`#lib/diagnostic-error`), which the sanitizer
 * never shows.
 *
 * THE SCAN. Every tracked non-test `.ts`/`.tsx` under `src`, parsed with oxc:
 * each `throw new Error(<message>)`, keyed by the message's source text with
 * its whitespace collapsed, must be in `REVIEWED`, which says why it may stay
 * a plain `Error`:
 * - COPY: written for the user who reads it;
 * - AUTH_COPY / SCHEMA_COPY / PASSED_COPY: passes on Supabase Auth's
 *   user-facing text, a schema's own messages, or the copy an Edge Function
 *   or server action wrote for the user;
 * - INVARIANT: a render- or module-time invariant (a context hook outside its
 *   provider): it fails the render into an error boundary, which shows the
 *   message only in development;
 * - CONFIG: startup configuration, before any user is served;
 * - SERVER: server-only code (a route handler, a Server Component, static
 *   params), whose error page Next masks in production.
 * A new message that names code is a `DiagnosticError`; a new piece of copy
 * joins `REVIEWED`. An entry no source throws any more fails the stale check.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseSync } from "rolldown/utils";
import { describe, expect, it } from "vitest";

type Reason =
	| "COPY"
	| "AUTH_COPY"
	| "SCHEMA_COPY"
	| "PASSED_COPY"
	| "INVARIANT"
	| "CONFIG"
	| "SERVER";

const REVIEWED: ReadonlyMap<string, Reason> = new Map<string, Reason>([
	['"Please confirm your email before signing in."', "COPY"],
	['"Not authenticated"', "COPY"],
	['"PDF generation failed"', "COPY"],
	['"Move out date is required"', "COPY"],
	['"Invalid date format"', "COPY"],
	['"Move out date cannot be in the past"', "COPY"],
	['"Passwords do not match"', "COPY"],
	[
		"`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`",
		"COPY",
	],
	["PASSWORD_COMPLEXITY_MESSAGE", "COPY"],
	['"Please check your input"', "COPY"],
	[
		'"We couldn\'t send your message. Please try again, or email us directly at sales@tenantflow.app."',
		"COPY",
	],
	['"Unable to load the lease document"', "COPY"],
	['"Too many requests. Please wait a moment before trying again."', "COPY"],
	['"Failed to create checkout session"', "COPY"],
	['"Unable to verify user"', "COPY"],
	['"Current password is incorrect"', "COPY"],
	[
		'"Application not found or you do not have permission to delete it."',
		"COPY",
	],
	['"Slug must be lowercase-snake_case (a-z, 0-9, _) and 1-50 chars."', "COPY"],
	['"Label must be 1-80 characters."', "COPY"],
	['"We couldn\'t save that file. Please try again."', "COPY"],
	['"Failed to record document"', "COPY"],
	['"Document not found or you do not have permission to delete it."', "COPY"],
	[
		"`All rooms must be assessed before completing. ${unassessed.length} room(s) have no condition rating.`",
		"COPY",
	],
	['"You need to be signed in to export a report."', "COPY"],
	[
		'"Cannot delete tenant with active lease. End or transfer the lease before removing them."',
		"COPY",
	],
	['"User not authenticated"', "COPY"],
	['"No session token"', "COPY"],
	['"Profile not found"', "COPY"],
	['"Unable to save. Please refresh and try again."', "COPY"],
	["ERROR_MESSAGES.SESSION_EXPIRED", "COPY"],
	[
		'error.message === "Invalid login credentials" ? "Invalid email or password." : error.message',
		"AUTH_COPY",
	],
	[
		'parsed.error.issues.map((issue) => issue.message).join(" ")',
		"SCHEMA_COPY",
	],
	[
		'body?.error ?? "Could not generate the lease preview. Please try again."',
		"PASSED_COPY",
	],
	['errorFromBody(body) ?? "Export failed"', "PASSED_COPY"],
	["message", "PASSED_COPY"],
	["result.error", "PASSED_COPY"],
	['errorData.error || "Failed to create checkout session"', "PASSED_COPY"],
	[
		'errorData.error || "Failed to create billing portal session"',
		"PASSED_COPY",
	],
	["`Unknown documents hub band: ${id}`", "INVARIANT"],
	[
		'"ANY_ENTITY sentinel collides with a real DOCUMENT_ENTITY_TYPES value"',
		"INVARIANT",
	],
	['"useChart must be used within a <ChartContainer />"', "INVARIANT"],
	['"useDropzoneContext must be used within a Dropzone"', "INVARIANT"],
	[
		"`\\`${consumerName}\\` must be used within \\`${ROOT_NAME}\\``",
		"INVARIANT",
	],
	['"useSidebar must be used within a SidebarProvider."', "INVARIANT"],
	[
		"`\\`${consumerName}\\` must be used within \\`${ITEM_NAME}\\``",
		"INVARIANT",
	],
	[
		"`\\`${consumerName}\\` must be used within \\`FocusProvider\\``",
		"INVARIANT",
	],
	["`\\`useStore\\` must be used within \\`${ROOT_NAME}\\``", "INVARIANT"],
	[
		"`\\`${consumerName}\\` must be used within \\`${STEP_NAME}\\``",
		"INVARIANT",
	],
	['"Cookie name and value are required"', "INVARIANT"],
	['"useAuth must be used within AuthStoreProvider"', "INVARIANT"],
	['"Missing PreferencesStoreProvider"', "INVARIANT"],
	[
		"`\\nERROR: Invalid environment variables:\\n\\n${formatted}\\n\\nNOTE: Check your .env.local file or deployment configuration.\\n`",
		"CONFIG",
	],
	[
		'`ERROR: Attempted to access server-side environment variable "${variable}" on the client.\\n` + `This variable is not prefixed with NEXT_PUBLIC_ and cannot be exposed to the browser.\\n` + `If you need this value client-side, create a NEXT_PUBLIC_ version or fetch it from an API route.`',
		"CONFIG",
	],
	['"empty hostname"', "CONFIG"],
	["`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`", "CONFIG"],
	[
		"`generateStaticParams: blogs query failed after ${MAX_ATTEMPTS} attempts (${lastError?.code}): ${lastError?.message}`",
		"SERVER",
	],
	[
		'`Blog post query failed (slug: "${slug}", code: ${error.code}): ${error.message}`',
		"SERVER",
	],
	['`Blog post query exhausted attempts (slug: "${slug}")`', "SERVER"],
	["postsResult.error.message", "SERVER"],
	[
		'postsResult.error?.message ?? comparisonsResult.error?.message ?? "Unknown Supabase error"',
		"SERVER",
	],
	["error.message", "SERVER"],
	["categoriesResult.error.message", "SERVER"],
	["`Failed to fetch blog posts: ${error.message}`", "SERVER"],
]);

/**
 * The only modules a SERVER entry may be thrown from: route handlers and
 * Server Components with no "use client" directive.
 */
const SERVER_ONLY_FILES: ReadonlySet<string> = new Set([
	"src/app/blog/[slug]/page.tsx",
	"src/app/blog/category/[category]/page.tsx",
	"src/app/blog/page.tsx",
	"src/app/feed.xml/route.ts",
	"src/app/llms-full.txt/route.ts",
	"src/app/llms.txt/route.ts",
	"src/app/search/page.tsx",
	"src/app/sitemap.ts",
]);

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function visit(node: Node, fn: (n: Node) => void) {
	fn(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) visit(v, fn);
		} else if (isNode(value)) {
			visit(value, fn);
		}
	}
}

interface Site {
	file: string;
	line: number;
	key: string;
}

function plainErrorThrows(): Site[] {
	const files = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
		.split("\n")
		.filter(
			(f) =>
				/\.tsx?$/.test(f) &&
				!/\.d\.ts$/.test(f) &&
				!/\.test\.tsx?$/.test(f) &&
				!f.includes("/__tests__/") &&
				!f.startsWith("src/test/"),
		);
	const sites: Site[] = [];
	for (const file of files) {
		const source = readFileSync(file, "utf8");
		const { program, errors } = parseSync(file, source, {
			lang: file.endsWith(".tsx") ? "tsx" : "ts",
		});
		if (errors.length > 0) throw new Error(`${file}: ${errors[0]?.message}`);
		const root: unknown = program;
		if (!isNode(root)) throw new Error(`${file}: no program`);
		visit(root, (n) => {
			if (n.type !== "ThrowStatement" || !isNode(n.argument)) return;
			const arg = n.argument;
			if (arg.type !== "NewExpression" || !isNode(arg.callee)) return;
			if (arg.callee.type !== "Identifier" || arg.callee.name !== "Error") {
				return;
			}
			const first = Array.isArray(arg.arguments) ? arg.arguments[0] : undefined;
			const key = isNode(first)
				? source.slice(first.start, first.end).replace(/\s+/g, " ")
				: "";
			sites.push({
				file,
				line: source.slice(0, n.start).split("\n").length,
				key,
			});
		});
	}
	return sites;
}

const sites = plainErrorThrows();

describe("every plain Error thrown in src carries copy, or never reaches a screen", () => {
	it("finds the plain Error throws (the scan is not vacuous)", () => {
		expect(sites.length).toBeGreaterThan(100);
	});

	it("throws a DiagnosticError, not a plain Error, for every message not reviewed as copy", () => {
		const unreviewed = sites
			.filter((s) => !REVIEWED.has(s.key))
			.map((s) => `${s.file}:${s.line} throw new Error(${s.key})`);
		expect(unreviewed).toEqual([]);
	});

	it("throws a SERVER entry only from a server-only module", () => {
		const misplaced = sites
			.filter(
				(s) =>
					REVIEWED.get(s.key) === "SERVER" && !SERVER_ONLY_FILES.has(s.file),
			)
			.map((s) => `${s.file}:${s.line} throw new Error(${s.key})`);
		expect(misplaced).toEqual([]);
		for (const file of SERVER_ONLY_FILES) {
			expect(readFileSync(file, "utf8"), file).not.toMatch(
				/^\s*["']use client["']/,
			);
		}
	});

	it("keeps REVIEWED current (every entry is still thrown somewhere)", () => {
		const thrown = new Set(sites.map((s) => s.key));
		const stale = [...REVIEWED.keys()].filter((k) => !thrown.has(k));
		expect(stale).toEqual([]);
	});
});
