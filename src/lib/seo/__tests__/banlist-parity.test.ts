import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	BLOG_BANLIST,
	BLOG_BANLIST_FIELDS,
	BLOG_PERSONA_BANLIST,
	personaWordPattern,
} from "../../../../supabase/functions/_shared/blog-banlist";

/**
 * Drift guard (BLOG-04/05): the landlord-only banlist (gate 8) is kept in THREE
 * places, the ingest Edge Function's (supabase/functions/_shared/blog-banlist.ts,
 * imported here), the generator script's and the DB trigger's (its live body,
 * 20261102230101). This fails when they differ in their phrases, their persona
 * words, the fields they check, or what the persona pattern matches, and when
 * that pattern stops meaning what persona-consistency.spec.ts bans on every
 * public page. Each copy's own unit test (blog-banlist.test.ts,
 * generate-blog-draft.test.ts) and the migration-replay gate prove the copy
 * USES its lists on every field; this proves the lists are one list.
 */
const ROOT = process.cwd();

const EF_INDEX = "supabase/functions/n8n-blog-ingest/index.ts";
const SCRIPT = "scripts/generate-blog-draft.ts";
const TRIGGER =
	"supabase/migrations/20261102230101_blog_banlist_persona_and_fields.sql";
const SPEC = "tests/e2e/tests/public/persona-consistency.spec.ts";

function read(file: string): string {
	return readFileSync(join(ROOT, file), "utf8");
}

/** The quoted strings of the array literal that `open` starts. */
function extractList(file: string, open: RegExp): string[] {
	const text = read(file);
	const m = text.match(open);
	if (!m || m.index === undefined) {
		throw new Error(`array opener ${open} not found in ${file}`);
	}
	const after = text.slice(m.index + m[0].length);
	const block = after.slice(0, after.indexOf("]"));
	return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1] as string);
}

/** The one match of `pattern` in `file`, its capture groups. */
function extractOne(file: string, pattern: RegExp): string[] {
	const matches = [...read(file).matchAll(new RegExp(pattern, "g"))];
	if (matches.length !== 1) {
		throw new Error(
			`expected one match of ${pattern} in ${file}, found ${matches.length}`,
		);
	}
	return (matches[0] as RegExpMatchArray).slice(1);
}

const ef = [...BLOG_BANLIST];
const efPersona = [...BLOG_PERSONA_BANLIST];
const efFields = [...BLOG_BANLIST_FIELDS];
const script = extractList(SCRIPT, /const BANLIST = \[/);
const scriptPersona = extractList(SCRIPT, /const PERSONA_BANLIST = \[/);
const scriptFields = extractList(SCRIPT, /const BANLIST_FIELDS = \[/);
const trigger = extractList(TRIGGER, /v_banlist\s+text\[\]\s*:=\s*ARRAY\[/);
const triggerPersona = extractList(
	TRIGGER,
	/v_persona_banlist\s+text\[\]\s*:=\s*ARRAY\[/,
);
const triggerFields = extractList(
	TRIGGER,
	/v_banlist_fields\s+text\[\]\s*:=\s*ARRAY\[/,
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

	it("the EF keeps no banlist of its own beside the shared one", () => {
		expect(read(EF_INDEX)).not.toMatch(/const BANLIST\b/);
		expect(read(EF_INDEX)).toContain(
			'import { findBlogBanlistHit } from "../_shared/blog-banlist.ts";',
		);
	});
});

describe("persona words (the same words in all three copies)", () => {
	it("each copy bans exactly the spec's word", () => {
		expect(efPersona).toEqual(["property owner"]);
		expect(scriptPersona).toEqual(efPersona);
		expect(triggerPersona).toEqual(efPersona);
	});

	it("every entry is lowercase letters and spaces, so a literal in its pattern", () => {
		for (const word of efPersona) expect(word).toMatch(/^[a-z ]+$/);
	});
});

describe("field coverage (title, excerpt and content in all three copies)", () => {
	it("each copy checks the title, the excerpt and the content, in that order", () => {
		expect(efFields).toEqual(["title", "excerpt", "content"]);
		expect(scriptFields).toEqual(efFields);
		expect(triggerFields).toEqual(efFields);
	});
});

/**
 * The persona pattern's meaning. The spec's regex is read from the spec, each
 * copy's pattern from its source (the trigger's `~*` operand, a POSIX ARE, is
 * compiled as a JavaScript RegExp: its `$` is the end of the text as in an ARE,
 * `~*` ignores case), and all of them must decide every probe the same way.
 */
const specMatch = extractOne(
	SPEC,
	/not\.toMatch\(\/(property owners\?\\b)\/([a-z]*)\)/,
);
const SPEC_RE = new RegExp(specMatch[0] as string, specMatch[1]);

const [scriptSuffix, scriptFlags] = extractOne(
	SCRIPT,
	/const personaWordPattern = \(word: string\): RegExp =>\s*new RegExp\(`\$\{word\}([^`]*)`, "([a-z]*)"\);/,
);
const [triggerOperator, triggerSuffix] = extractOne(
	TRIGGER,
	/IF v_text (~\*?) \(v_banned \|\| '([^']*)'\) THEN/,
);

function unescapeTemplate(raw: string): string {
	return raw.replaceAll("\\\\", "\\");
}

const PROBES: ReadonlyArray<[string, boolean]> = [
	["property owner", true],
	["a property owner.", true],
	["Property Owners like it", true],
	["PROPERTY OWNER", true],
	["single-property owner", true],
	["multiproperty owners", true],
	["the property owner's lease", true],
	["property owners, landlords", true],
	["property ownerés", true],
	["property ownership", false],
	["property owner_id", false],
	["property owners2", false],
	["property owner9", false],
	["property  owner", false],
	["property\nowner", false],
	["owner of the property", false],
	["landlord", false],
];

describe("the persona pattern means the spec's regex in every copy", () => {
	it("reads the spec's regex as /property owners?\\b/i", () => {
		expect(SPEC_RE.source).toBe("property owners?\\b");
		expect(SPEC_RE.flags).toBe("i");
	});

	it("the EF's pattern is the spec's regex", () => {
		for (const word of efPersona) {
			const re = personaWordPattern(word);
			expect(re.source).toBe(SPEC_RE.source);
			expect(re.flags).toBe(SPEC_RE.flags);
		}
	});

	it("the generator's pattern is the spec's regex", () => {
		const re = new RegExp(
			`${efPersona[0]}${unescapeTemplate(scriptSuffix as string)}`,
			scriptFlags,
		);
		expect(re.source).toBe(SPEC_RE.source);
		expect(re.flags).toBe(SPEC_RE.flags);
	});

	it("the trigger ignores case (~*)", () => {
		expect(triggerOperator).toBe("~*");
	});

	it("the trigger's pattern decides every probe as the spec's regex does", () => {
		const re = new RegExp(`${efPersona[0]}${triggerSuffix}`, "i");
		for (const [probe, expected] of PROBES) {
			expect(SPEC_RE.test(probe), `spec on ${JSON.stringify(probe)}`).toBe(
				expected,
			);
			expect(re.test(probe), `trigger on ${JSON.stringify(probe)}`).toBe(
				expected,
			);
		}
	});
});

/**
 * The numeric gate thresholds (word 1200-3000, meta ≤160, etc.) are ALSO
 * hand-duplicated across the EF, the generator, and the DB trigger. Assert the
 * distinctive bounds appear in every layer so a one-sided bump fails the build
 * (these numbers are the canonical contract; update all three together).
 */
const GATE_FILES = [EF_INDEX, SCRIPT, TRIGGER];
const DISTINCTIVE_BOUNDS = ["1200", "3000", "160"]; // word min, word max, meta max

describe("gate threshold parity (distinctive bounds in every layer)", () => {
	for (const file of GATE_FILES) {
		it(`${file} carries the canonical gate bounds`, () => {
			const text = read(file);
			for (const bound of DISTINCTIVE_BOUNDS) {
				expect(text).toContain(bound);
			}
		});
	}
});

/**
 * The generator's `sanitizeBanlist` must neutralize EVERY `BANLIST` phrase and
 * persona word, else a phrase added to the banlist can't self-heal and the
 * generator burns its retries. Parse the BANLIST_REPLACEMENTS regexes and
 * assert each phrase matches one.
 */
function extractReplacementRegexes(file: string): RegExp[] {
	const text = read(file);
	const start = text.indexOf("BANLIST_REPLACEMENTS");
	const block = text.slice(start, text.indexOf("];", start));
	return [...block.matchAll(/\[\/(.+?)\/gi,/g)].map(
		(m) => new RegExp(m[1] as string, "i"),
	);
}

describe("sanitizer covers the banlist", () => {
	const replacements = extractReplacementRegexes(SCRIPT);
	it("every BANLIST phrase and persona word is matched by a BANLIST_REPLACEMENTS regex", () => {
		for (const phrase of [...script, ...scriptPersona]) {
			expect(
				replacements.some((re) => re.test(phrase)),
				`no sanitizer replacement matches "${phrase}"`,
			).toBe(true);
		}
	});
});
