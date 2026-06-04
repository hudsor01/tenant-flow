/**
 * Drift guard (CISEC-04): every `uses:` across .github/workflows/*.yml must be
 * pinned to a 40-char commit SHA with a trailing `# vX.Y.Z` version comment.
 *
 * A mutable action tag (`@v2`, `@v6`) can be repointed by a repo compromise to a
 * malicious commit — only the immutable commit SHA defends against tag-repointing
 * supply-chain attacks (post tj-actions/2025 incidents). The highest-blast-radius
 * action here is anthropics/claude-code-action (requests `id-token: write` OIDC).
 *
 * Two assertions, per the locked uniform-pinning decision:
 *  (a) THIRD-PARTY (owner ∉ {actions, github}) MUST be a 40-hex SHA — the hard
 *      security requirement; a regression here is a supply-chain hole.
 *  (b) EVERY `uses:` (including first-party actions/* and github/codeql-action/*)
 *      MUST be a 40-hex SHA — the stricter uniform guard so a future un-pinned
 *      first-party action also trips this test.
 *
 * Failures list the offending `file:line → ref` so a regression is actionable.
 *
 * Pure filesystem read — never touches the DOM.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface UsesEntry {
	/** Workflow filename, e.g. "ci-cd.yml". */
	readonly file: string;
	/** 1-based line number of the `uses:` line within the file. */
	readonly line: number;
	/** The action reference after `uses:` and before any trailing comment, e.g. "actions/checkout@<sha>". */
	readonly ref: string;
	/** Repo owner segment, e.g. "actions", "github", "oven-sh". */
	readonly owner: string;
}

const WORKFLOWS_DIR = join(process.cwd(), ".github", "workflows");

// A 40-hex commit SHA, optionally followed by a space + trailing version comment.
const SHA_PIN = /@[0-9a-f]{40}(?:\s|$)/;

// Owners that are first-party (GitHub-published). Still pinned uniformly per the
// locked decision, but tracked separately so the third-party assertion can be
// reported distinctly from the uniform one.
const FIRST_PARTY_OWNERS = new Set(["actions", "github"]);

function collectUses(): UsesEntry[] {
	const files = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".yml"));
	const entries: UsesEntry[] = [];

	for (const file of files) {
		const lines = readFileSync(join(WORKFLOWS_DIR, file), "utf8").split("\n");
		lines.forEach((raw, index) => {
			const trimmed = raw.trim();
			// Skip blank lines and YAML comments.
			if (trimmed === "" || trimmed.startsWith("#")) return;
			// Match `uses:` keys (with or without a leading `- `).
			const match = /^-?\s*uses:\s*(\S+)/.exec(trimmed);
			if (!match) return;
			const ref = match[1] ?? "";
			// Local/composite actions (`./...` or `docker://...`) are not pinnable
			// to a commit SHA — exclude them from the SHA assertion.
			if (ref.startsWith("./") || ref.startsWith("docker://")) return;
			const owner = ref.split("/")[0] ?? "";
			entries.push({ file, line: index + 1, ref, owner });
		});
	}

	return entries;
}

describe("CISEC-04 — GitHub Actions are SHA-pinned", () => {
	const entries = collectUses();

	it("finds at least one uses: line to guard", () => {
		// Sanity check: if the parser silently matched nothing, the assertions
		// below would vacuously pass and the guard would be useless.
		expect(entries.length).toBeGreaterThan(0);
	});

	it("every third-party uses: is pinned to a 40-char commit SHA", () => {
		const violators = entries
			.filter((e) => !FIRST_PARTY_OWNERS.has(e.owner))
			.filter((e) => !SHA_PIN.test(e.ref))
			.map((e) => `${e.file}:${e.line} → ${e.ref}`);

		expect(
			violators,
			`Unpinned third-party action(s) — pin to a 40-char commit SHA with a trailing "# vX.Y.Z" comment:\n${violators.join("\n")}`,
		).toEqual([]);
	});

	it("every uses: (first-party included) is pinned to a 40-char commit SHA", () => {
		const violators = entries
			.filter((e) => !SHA_PIN.test(e.ref))
			.map((e) => `${e.file}:${e.line} → ${e.ref}`);

		expect(
			violators,
			`Unpinned action(s) — uniform pinning requires every uses: be a 40-char commit SHA with a trailing "# vX.Y.Z" comment:\n${violators.join("\n")}`,
		).toEqual([]);
	});
});
