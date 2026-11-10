/**
 * A file's git blob id, computed from its bytes (66.2-39 fix round 4, Part 8b).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * The id is what `git hash-object <file>` prints: the SHA-1 of
 * `blob <byte length>\0` followed by the bytes. It needs no git history, so it
 * works in CI's `checks` checkout, which is one commit deep
 * (`fetch-depth: 1` in `.github/workflows/ci-cd.yml`). A ratchet that defers a
 * file this PR leaves alone keys the entry to the file's id at the PR's base:
 * any later change to the file changes its id and fails the ratchet, so the
 * file's hits are fixed instead of hiding behind their entry.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** The git blob id of the file at `path` (absolute, or relative to the cwd). */
export function gitBlobId(path: string): string {
	const bytes = readFileSync(path);
	return createHash("sha1")
		.update(`blob ${bytes.length}\0`)
		.update(bytes)
		.digest("hex");
}
