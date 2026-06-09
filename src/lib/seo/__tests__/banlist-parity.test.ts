import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Drift guard (BLOG-04/05): the landlord-only banlist is hand-copied in THREE
 * places — the ingest Edge Function, the generator script, and the DB trigger.
 * The EF comment promises they stay "in lockstep"; this test enforces it so a
 * phrase added to one isn't silently missed by the others.
 */
const ROOT = process.cwd();

function extractBanlist(file: string, open: RegExp): string[] {
	const text = readFileSync(join(ROOT, file), "utf8");
	const m = text.match(open);
	if (!m || m.index === undefined) {
		throw new Error(`banlist array opener not found in ${file}`);
	}
	const after = text.slice(m.index + m[0].length);
	const block = after.slice(0, after.indexOf("]"));
	return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1] as string);
}

const ef = extractBanlist(
	"supabase/functions/n8n-blog-ingest/index.ts",
	/const BANLIST = \[/,
);
const script = extractBanlist(
	"scripts/generate-blog-draft.ts",
	/const BANLIST = \[/,
);
const trigger = extractBanlist(
	"supabase/migrations/20260510214935_phase_6_validation_triggers.sql",
	/v_banlist\s+text\[\]\s*:=\s*ARRAY\[/,
);

describe("banlist parity (EF / generator / DB trigger lockstep)", () => {
	it("extracts a non-trivial banlist from each source", () => {
		expect(ef.length).toBeGreaterThanOrEqual(20);
		expect(script.length).toBe(ef.length);
		expect(trigger.length).toBe(ef.length);
	});

	it("EF banlist === generator script banlist", () => {
		expect(new Set(script)).toEqual(new Set(ef));
	});

	it("EF banlist === DB validate_blog_post trigger banlist", () => {
		expect(new Set(trigger)).toEqual(new Set(ef));
	});
});

/**
 * The numeric gate thresholds (word 1200-3000, meta ≤160, etc.) are ALSO
 * hand-duplicated across the EF, the generator, and the DB trigger. Assert the
 * distinctive bounds appear in every layer so a one-sided bump fails the build
 * (these numbers are the canonical contract; update all three together).
 */
const GATE_FILES = [
	"supabase/functions/n8n-blog-ingest/index.ts",
	"scripts/generate-blog-draft.ts",
	"supabase/migrations/20260510214935_phase_6_validation_triggers.sql",
];
const DISTINCTIVE_BOUNDS = ["1200", "3000", "160"]; // word min, word max, meta max

describe("gate threshold parity (distinctive bounds in every layer)", () => {
	for (const file of GATE_FILES) {
		it(`${file} carries the canonical gate bounds`, () => {
			const text = readFileSync(join(ROOT, file), "utf8");
			for (const bound of DISTINCTIVE_BOUNDS) {
				expect(text).toContain(bound);
			}
		});
	}
});

/**
 * The generator's `sanitizeBanlist` must neutralize EVERY `BANLIST` phrase, else
 * a phrase added to the banlist can't self-heal and the generator burns its
 * retries. Parse the BANLIST_REPLACEMENTS regexes and assert each phrase matches.
 */
function extractReplacementRegexes(file: string): RegExp[] {
	const text = readFileSync(join(ROOT, file), "utf8");
	const start = text.indexOf("BANLIST_REPLACEMENTS");
	const block = text.slice(start, text.indexOf("];", start));
	return [...block.matchAll(/\[\/(.+?)\/gi,/g)].map(
		(m) => new RegExp(m[1] as string, "i"),
	);
}

describe("sanitizer covers the banlist", () => {
	const replacements = extractReplacementRegexes(
		"scripts/generate-blog-draft.ts",
	);
	it("every BANLIST phrase is matched by a BANLIST_REPLACEMENTS regex", () => {
		for (const phrase of script) {
			expect(
				replacements.some((re) => re.test(phrase)),
				`no sanitizer replacement matches "${phrase}"`,
			).toBe(true);
		}
	});
});
