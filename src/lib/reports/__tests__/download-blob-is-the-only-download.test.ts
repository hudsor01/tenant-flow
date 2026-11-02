/**
 * Every browser download goes through `downloadBlob`, and no browser code
 * reads a response header a cross-origin fetch cannot see.
 *
 * Five files hand-rolled the same anchor download -- gdpr-data-actions,
 * account-data-section, maintenance-details, documents-vault and the bulk-import
 * `triggerCsvDownload` -- and each revoked the object URL on the line after
 * `click()`, before the browser had necessarily started the download.
 * `downloadBlob` (`#lib/reports/download-blob`) defers the revoke.
 *
 * Two of them also read `response.headers.get("Content-Disposition")` off an
 * Edge Function response. The functions are cross-origin and `_shared/cors.ts`
 * sends no `Access-Control-Expose-Headers`, so outside the CORS-safelisted set
 * every response header reads as null in a browser. The only header reads left
 * in `src/` are request headers in server code.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const DOWNLOAD_BLOB = "src/lib/reports/download-blob.ts";

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__tests__") continue;
			out.push(...sourceFiles(abs));
		} else if (
			/\.tsx?$/.test(entry.name) &&
			!/\.(test|spec)\.tsx?$/.test(entry.name)
		) {
			out.push(abs);
		}
	}
	return out;
}

function codeLines(abs: string): { line: number; code: string }[] {
	return readFileSync(abs, "utf8")
		.split("\n")
		.map((text, index) => ({ line: index + 1, code: text.trim() }))
		.filter(
			({ code }) =>
				code !== "" && !code.startsWith("//") && !code.startsWith("*"),
		);
}

// Setting an anchor's download name: `a.download = x`, `setAttribute("download"`.
const SETS_DOWNLOAD_NAME =
	/\.download\s*=[^=]|setAttribute\(\s*["']download["']/;
// `x.headers.get(` where x is not an incoming request.
const RESPONSE_HEADER_READ = /\b(\w+)\.headers\.get\s*\(/g;
const REQUEST_NAMES = new Set(["request", "req"]);

describe("downloads and response headers in src/", () => {
	const files = sourceFiles(SRC);

	it("scans the source tree", () => {
		expect(files.length).toBeGreaterThan(500);
		expect(files.map((f) => relative(process.cwd(), f))).toContain(
			DOWNLOAD_BLOB,
		);
	});

	it("names a download only inside downloadBlob", () => {
		const hits: string[] = [];
		for (const abs of files) {
			const rel = relative(process.cwd(), abs);
			if (rel === DOWNLOAD_BLOB) continue;
			for (const { line, code } of codeLines(abs)) {
				if (SETS_DOWNLOAD_NAME.test(code)) hits.push(`${rel}:${line} ${code}`);
			}
		}
		expect(
			hits,
			`hand-rolled download -- call downloadBlob (#lib/reports/download-blob):\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("reads no response header", () => {
		const hits: string[] = [];
		for (const abs of files) {
			const rel = relative(process.cwd(), abs);
			for (const { line, code } of codeLines(abs)) {
				for (const match of code.matchAll(RESPONSE_HEADER_READ)) {
					if (!REQUEST_NAMES.has(match[1] ?? "")) {
						hits.push(`${rel}:${line} ${code}`);
					}
				}
			}
		}
		expect(
			hits,
			`response header read -- a cross-origin Edge Function response exposes none:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
