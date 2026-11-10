/**
 * No tracked file carries a JWT-shaped literal.
 *
 * `tests/e2e/playwright.config.ts` once fell back to a hard-coded JWT (the
 * Supabase local stack's legacy demo anon key) and `src/test/unit-setup.ts`
 * defaulted to a JWT-headed mock. A secrets scan flags the first and cannot tell
 * the second from a real token, and `.gitleaksignore` existed only to wave the
 * first through. Keys belong in the environment; mocks need no JWT shape (no
 * code reads a key's format -- the hosted project issues `sb_publishable_` keys).
 *
 * Scope: every file `git ls-files` reports, so ignored local files -- the
 * credential-bearing `.env*` files and Playwright's saved session state -- are
 * never opened. Lockfiles are skipped (their base64 integrity hashes contain
 * `eyJ` by chance), as are binary assets.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { describe, expect, it } from "vitest";

// `eyJ` is base64 for `{"` -- the start of every JWT header and payload. The
// leading boundary keeps identifiers that merely contain the letters (`hasKeyJson`)
// out of it.
const JWT_SEGMENT = /(^|[^A-Za-z0-9_\-+/])eyJ[A-Za-z0-9_-]{8,}/;

const SKIPPED_FILES = new Set(["bun.lock", "package-lock.json"]);
const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".pdf",
	".woff",
	".woff2",
]);

function trackedFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out.split("\0").filter((path) => path !== "");
}

describe("no JWT-shaped literal in any tracked file", () => {
	const files = trackedFiles().filter(
		(path) =>
			!SKIPPED_FILES.has(path.split("/").pop() ?? path) &&
			!BINARY_EXTENSIONS.has(extname(path).toLowerCase()),
	);

	it("enumerates the tracked tree", () => {
		// A vacuous scan would pass every time; the repo tracks thousands of files.
		expect(files.length).toBeGreaterThan(1000);
		expect(files).toContain("tests/e2e/playwright.config.ts");
		expect(files).toContain("src/test/unit-setup.ts");
	});

	it("finds no JWT header or payload segment", () => {
		const hits: string[] = [];
		for (const path of files) {
			let text: string;
			try {
				text = readFileSync(path, "utf8");
			} catch {
				// Tracked but deleted in the working tree: nothing to scan.
				continue;
			}
			text.split("\n").forEach((line, index) => {
				if (JWT_SEGMENT.test(line)) hits.push(`${path}:${index + 1}`);
			});
		}
		expect(
			hits,
			`JWT-shaped literal(s) -- move the key to the environment:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
