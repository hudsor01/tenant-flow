import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft, GateContext } from "./generate-blog-draft";
import {
	applySlugOverride,
	blogSlugExists,
	capDocusealMentions,
	capH2Count,
	clampToLength,
	critique,
	deriveTags,
	ensureInternalLinks,
	extractComparisonBrands,
	extractExternalUrls,
	findDuplicateComparison,
	formatGenFailure,
	gateOnCritique,
	headCheckCitations,
	isAllowlistedCitation,
	isCritiquePass,
	normalizeComparisonPair,
	parseCritique,
	parsePositionals,
	parseSlugOverride,
	pickLoadedModel,
	runGates,
	sanitizeBanlist,
	stripNonAllowlistedExternalLinks,
	validateInternalLinks,
} from "./generate-blog-draft";

type Scores = {
	brand_alignment: number;
	helpfulness_depth: number;
	factual_grounding: number;
	not_thin: number;
};

function critiqueBody(
	scores: Scores,
	verdict: "pass" | "reject",
	issues: string[] = [],
) {
	return { scores, issues, verdict };
}

// Replace the global fetch so critique() never touches the network — it returns
// a canned LM Studio chat/completions body wrapping the judge JSON.
function mockJudge(body: unknown): void {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: JSON.stringify(body) } }],
			}),
		})),
	);
}

const draft = {
	title: "Tenant Screening Tips for New Landlords",
	slug: "tenant-screening-tips-for-new-landlords",
	excerpt: "x".repeat(120),
	meta_description: "y".repeat(130),
	category: "tenant-screening",
	content: "## Section\nA landlord screens applicants carefully.",
};

const ALL_FIVE: Scores = {
	brand_alignment: 5,
	helpfulness_depth: 5,
	factual_grounding: 5,
	not_thin: 5,
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("isCritiquePass", () => {
	it("rejects when the judge verdict is reject (even with high scores)", () => {
		expect(
			isCritiquePass({ scores: ALL_FIVE, issues: [], verdict: "reject" }, 4),
		).toBe(false);
	});

	it("rejects when ANY score is below threshold despite verdict=pass", () => {
		expect(
			isCritiquePass(
				{ scores: { ...ALL_FIVE, not_thin: 2 }, issues: [], verdict: "pass" },
				4,
			),
		).toBe(false);
	});

	it("admits when verdict=pass and every score >= threshold", () => {
		expect(
			isCritiquePass(
				{
					scores: {
						brand_alignment: 4,
						helpfulness_depth: 5,
						factual_grounding: 4,
						not_thin: 5,
					},
					issues: [],
					verdict: "pass",
				},
				4,
			),
		).toBe(true);
	});
});

describe("critique() against a mocked Mistral judge", () => {
	it("a thin/off-brand draft is judged reject and is NOT publishable", async () => {
		mockJudge(
			critiqueBody(
				{
					brand_alignment: 2,
					helpfulness_depth: 2,
					factual_grounding: 3,
					not_thin: 1,
				},
				"reject",
				["too thin", "off-brand framing"],
			),
		);
		const c = await critique(draft, "TenantFlow facts");
		expect(c.verdict).toBe("reject");
		expect(c.issues).toContain("too thin");
		expect(isCritiquePass(c, 4)).toBe(false);
	});

	it("a strong on-brand draft is judged pass and IS publishable", async () => {
		mockJudge(critiqueBody(ALL_FIVE, "pass"));
		const c = await critique(draft, "TenantFlow facts");
		expect(isCritiquePass(c, 4)).toBe(true);
	});

	it("rejects a malformed critique (non-number score)", async () => {
		mockJudge({
			scores: { ...ALL_FIVE, brand_alignment: "five" },
			issues: [],
			verdict: "pass",
		});
		await expect(critique(draft, "facts")).rejects.toMatchObject({
			message: expect.stringContaining("not a number"),
		});
	});
});

describe("parseCritique", () => {
	it("throws on an invalid verdict", () => {
		expect(() =>
			parseCritique({ scores: ALL_FIVE, issues: [], verdict: "maybe" }),
		).toThrow(/verdict/);
	});
});

describe("gateOnCritique (fail-closed judge gate)", () => {
	it("a persistently-rejecting judge THROWS after MAX_CRITIQUE rounds — never returns a draft to POST", async () => {
		mockJudge(
			critiqueBody(
				{
					brand_alignment: 1,
					helpfulness_depth: 1,
					factual_grounding: 1,
					not_thin: 1,
				},
				"reject",
				["thin and off-brand"],
			),
		);
		const regenerate = vi.fn(async () => draft);
		await expect(
			gateOnCritique(draft, "facts", regenerate),
		).rejects.toMatchObject({
			message: expect.stringContaining("Judge rejected"),
		});
		// bounded: MAX_CRITIQUE (2) regenerate attempts, then fail closed
		expect(regenerate).toHaveBeenCalledTimes(2);
	});

	it("a passing judge returns the draft without regenerating", async () => {
		mockJudge(critiqueBody(ALL_FIVE, "pass"));
		const regenerate = vi.fn(async () => draft);
		const result = await gateOnCritique(draft, "facts", regenerate);
		expect(result).toBe(draft);
		expect(regenerate).not.toHaveBeenCalled();
	});
});

// A reclaim-grounded ghost slug (a real top-10 reclaim target) used to prove the
// override pins the slug AND still clears the slug gate it is re-validated against.
const GHOST_SLUG = "top-3-property-management-apps-for-commercial-landlords";

describe("parseSlugOverride", () => {
	it("returns the value following --slug", () => {
		expect(
			parseSlugOverride([
				"bun",
				"gen.ts",
				"topic",
				"software-vault",
				"--slug",
				GHOST_SLUG,
			]),
		).toBe(GHOST_SLUG);
	});

	it("returns the value even when --slug precedes the positional topic", () => {
		expect(
			parseSlugOverride([
				"bun",
				"gen.ts",
				"--slug",
				GHOST_SLUG,
				"topic",
				"software-vault",
			]),
		).toBe(GHOST_SLUG);
	});

	it("returns undefined when --slug is absent", () => {
		expect(
			parseSlugOverride(["bun", "gen.ts", "topic", "software-vault"]),
		).toBeUndefined();
	});

	it("throws when --slug has no following value (end of argv)", () => {
		expect(() =>
			parseSlugOverride(["bun", "gen.ts", "topic", "--slug"]),
		).toThrow(/--slug/);
	});

	it("throws when --slug is followed by another flag (no value)", () => {
		expect(() =>
			parseSlugOverride(["bun", "gen.ts", "topic", "--slug", "--dry-run"]),
		).toThrow(/--slug/);
	});
});

describe("applySlugOverride", () => {
	const base: Draft = {
		title: "Top Property Management Apps",
		slug: "model-chosen-slug",
		excerpt: "x".repeat(120),
		meta_description: "y".repeat(130),
		category: "software-vault",
		content: "## Section\nA landlord reviews the options.",
	};

	it("pins the draft slug to the override and leaves other fields untouched", () => {
		const out = applySlugOverride(base, GHOST_SLUG);
		expect(out.slug).toBe(GHOST_SLUG);
		expect(out.title).toBe(base.title);
		expect(out.content).toBe(base.content);
	});

	it("returns the draft unchanged when override is undefined", () => {
		expect(applySlugOverride(base, undefined)).toBe(base);
	});

	it("rejects an override that violates the slug regex before returning", () => {
		expect(() => applySlugOverride(base, "Not_A_Valid_Slug")).toThrow(/slug/);
	});

	it("rejects an override longer than 120 chars before returning", () => {
		const tooLong = `a${"-b".repeat(70)}`; // 141 chars, regex-valid but over the gate cap
		expect(tooLong.length).toBeGreaterThan(120);
		expect(() => applySlugOverride(base, tooLong)).toThrow(/slug/);
	});

	it("rejects an override shorter than 3 chars before returning", () => {
		expect(() => applySlugOverride(base, "ab")).toThrow(/slug/);
	});

	it("accepts the top-10 ghost slug (proves the override is gate-valid)", () => {
		expect(applySlugOverride(base, GHOST_SLUG).slug).toBe(GHOST_SLUG);
	});
});

describe("parsePositionals (topic/category parse is --slug-aware)", () => {
	it("parses topic + category with no --slug present", () => {
		expect(
			parsePositionals([
				"bun",
				"gen.ts",
				"My Topic",
				"software-vault",
				"--dry-run",
			]),
		).toEqual({ topic: "My Topic", category: "software-vault" });
	});

	it("keeps topic/category when --slug + value follow the positionals", () => {
		expect(
			parsePositionals([
				"bun",
				"gen.ts",
				"My Topic",
				"software-vault",
				"--slug",
				GHOST_SLUG,
				"--dry-run",
			]),
		).toEqual({ topic: "My Topic", category: "software-vault" });
	});

	it("keeps topic/category when --slug + value PRECEDE the positionals", () => {
		expect(
			parsePositionals([
				"bun",
				"gen.ts",
				"--slug",
				GHOST_SLUG,
				"My Topic",
				"software-vault",
				"--dry-run",
			]),
		).toEqual({ topic: "My Topic", category: "software-vault" });
	});

	it("never mistakes the --slug value for the category positional", () => {
		const { category } = parsePositionals([
			"bun",
			"gen.ts",
			"My Topic",
			"--slug",
			GHOST_SLUG,
		]);
		expect(category).toBeUndefined();
	});
});

describe("blogSlugExists dedup probe (BLOG-09a)", () => {
	it("resolves true when the blogs query returns a row", async () => {
		const probe = async () => ({ data: [{ slug: "exists" }], error: null });
		expect(await blogSlugExists(probe, "exists")).toBe(true);
	});

	it("resolves false when the blogs query returns no row (POST path reachable)", async () => {
		const probe = async () => ({ data: [], error: null });
		expect(await blogSlugExists(probe, "absent")).toBe(false);
	});

	it("resolves false when data is null (the ?? [] coalesce path)", async () => {
		const probe = async () => ({ data: null, error: null });
		expect(await blogSlugExists(probe, "absent")).toBe(false);
	});

	it("rejects on a PostgREST error — never silently false", async () => {
		const probe = async () => ({
			data: null,
			error: { message: "permission denied" },
		});
		await expect(blogSlugExists(probe, "x")).rejects.toMatchObject({
			message: expect.stringContaining("permission denied"),
		});
	});
});

describe("structured failure output (BLOG-09b)", () => {
	it("formatGenFailure prefixes the reason with the greppable BLOG-GEN-FAIL token", () => {
		const line = formatGenFailure("match_blog_rag_chunks: boom");
		expect(line.startsWith("BLOG-GEN-FAIL: ")).toBe(true);
		expect(line).toContain("match_blog_rag_chunks: boom");
	});
});

describe("capDocusealMentions (docuseal_mention gate, max 1)", () => {
	it("keeps a single mention untouched", () => {
		expect(capDocusealMentions("Sign it with DocuSeal today.")).toBe(
			"Sign it with DocuSeal today.",
		);
	});

	it("generifies the second and later mentions, preserving possessives", () => {
		const input =
			"DocuSeal handles e-signing. Later, DocuSeal's audit trail helps, and DocuSeal stores copies.";
		expect(capDocusealMentions(input)).toBe(
			"DocuSeal handles e-signing. Later, your e-signature tool's audit trail helps, and your e-signature tool stores copies.",
		);
	});

	it("is case-insensitive and leaves zero-mention content unchanged", () => {
		expect(capDocusealMentions("docuseal then DOCUSEAL")).toBe(
			"docuseal then your e-signature tool",
		);
		expect(capDocusealMentions("No e-sign tools here.")).toBe(
			"No e-sign tools here.",
		);
	});
});

describe("sanitizeBanlist substring safety (EF gate matches substrings)", () => {
	// Mirror of the EF/generator BANLIST — the gate uses lc.includes(phrase),
	// so NO output may contain any of these as a substring.
	const BANLIST_MIRROR = [
		"rent collection",
		"online rent",
		"autopay",
		"auto-pay",
		"tenant portal",
		"automated rent",
		"collect rent",
		"rent processing",
		"pay rent online",
		"online payments",
		"online rent payment",
		"rent collection software",
		"tenants can pay",
		"pay rent through",
		"automated workflow",
		"rent tracking",
		"mobile app access",
		"record rent",
		"paid rent",
		"pay rent",
	];

	const expectGateClean = (output: string) => {
		const lc = output.toLowerCase();
		for (const phrase of BANLIST_MIRROR) {
			expect(lc.includes(phrase), `survived: "${phrase}" in "${output}"`).toBe(
				false,
			);
		}
	};

	it('neutralizes "unpaid rent" (contains the "paid rent" substring — exec 282/283 failure)', () => {
		const out = sanitizeBanlist(
			"Send collections notices for unpaid rent promptly.",
		);
		expect(out).toContain("overdue rent");
		expectGateClean(out);
	});

	it('neutralizes "prepaid rent"', () => {
		const out = sanitizeBanlist("Prepaid rent counts as income when received.");
		expect(out.toLowerCase()).toContain("rent paid in advance");
		expectGateClean(out);
	});

	it("keeps the plain-phrase rewrites working", () => {
		const out = sanitizeBanlist(
			"Tenants who paid rent late should pay rent on time next month.",
		);
		expectGateClean(out);
	});

	it("clears every banned phrase from a worst-case paragraph", () => {
		const out = sanitizeBanlist(
			"Use rent collection software with autopay and a tenant portal so tenants can pay rent online; unpaid rent and prepaid rent need rent tracking.",
		);
		expectGateClean(out);
	});
});

describe("sanitizeBanlist persona purity (persona-consistency e2e words)", () => {
	it('rewrites "property owner(s)" to landlord(s), preserving case lead', () => {
		const out = sanitizeBanlist(
			"Property owners juggle many tasks; a property owner needs systems.",
		);
		expect(out.toLowerCase()).not.toContain("property owner");
		expect(out.toLowerCase()).toContain("landlords");
	});

	it('rewrites "real estate investor(s)"', () => {
		const out = sanitizeBanlist(
			"Real estate investors and any real estate investor benefit.",
		);
		expect(out.toLowerCase()).not.toContain("real estate investor");
	});
});

describe("pickLoadedModel (LM Studio loaded-instance resolution)", () => {
	const BASE = "mistral-small-3.2-24b-instruct-2506-mlx";

	it("prefers the LOADED instance even when its identifier carries a suffix", () => {
		expect(
			pickLoadedModel(
				[
					{ id: `${BASE}@6bit`, state: "loaded" },
					{ id: BASE, state: "not-loaded" },
				],
				BASE,
			),
		).toBe(`${BASE}@6bit`);
	});

	it("falls back to the base id when nothing matching is loaded", () => {
		expect(pickLoadedModel([{ id: BASE, state: "not-loaded" }], BASE)).toBe(
			BASE,
		);
		expect(pickLoadedModel([], BASE)).toBe(BASE);
	});

	it("ignores loaded models that do not contain the base id", () => {
		expect(
			pickLoadedModel([{ id: "qwen3-reranker-0.6b", state: "loaded" }], BASE),
		).toBe(BASE);
	});
});

describe("capH2Count (h2_count gate, max 10 — keep 9, demote the rest)", () => {
	const h2s = (s: string) => (s.match(/^## /gm) ?? []).length;
	const h3s = (s: string) => (s.match(/^### /gm) ?? []).length;

	it("demotes H2s beyond the 9th to H3, preserving every line", () => {
		const content = Array.from(
			{ length: 12 },
			(_, i) => `## Section ${i + 1}\n\nBody ${i + 1}.`,
		).join("\n\n");
		const out = capH2Count(content);
		expect(h2s(out)).toBe(9);
		expect(h3s(out)).toBe(3);
		expect(out.split("\n").length).toBe(content.split("\n").length);
		expect(out).toContain("### Section 12");
	});

	it("leaves compliant content (<=9 H2s) untouched", () => {
		const content = "## One\n\nBody.\n\n## Two\n\nBody.";
		expect(capH2Count(content)).toBe(content);
	});

	it("does not touch existing H3s while counting H2s", () => {
		const content = "## A\n\n### A.1\n\n## B\n\nBody.";
		expect(capH2Count(content)).toBe(content);
	});

	it("never demotes the FAQ heading (faq_required needs it as an H2)", () => {
		const sections = Array.from(
			{ length: 11 },
			(_, i) => `## Section ${i + 1}\n\nBody.`,
		).join("\n\n");
		const out = capH2Count(`${sections}\n\n## FAQ\n\n### Q?\n\nA.`);
		expect(out).toContain("\n## FAQ");
		expect(h2s(out)).toBe(10); // first 9 kept + the protected FAQ
		expect(out).toContain("### Section 11");
	});
});

describe("clampToLength (meta/excerpt over-length auto-cure)", () => {
	it("returns a within-length string untouched", () => {
		expect(clampToLength("A concise meta description.", 155)).toBe(
			"A concise meta description.",
		);
	});

	it("trims an over-long string to <= max at a word boundary", () => {
		const long = `${"word ".repeat(50)}end`; // 254 chars
		const out = clampToLength(long, 155);
		expect(out.length).toBeLessThanOrEqual(155);
		expect(out.endsWith(" ")).toBe(false); // no mid-word / trailing space
		expect(out).not.toMatch(/\bwor$/); // not cut mid-word
	});

	it("never leaves a trailing ellipsis or punctuation (meta_not_truncated-safe)", () => {
		const out = clampToLength(`${"alpha beta gamma ".repeat(20)}...`, 100);
		expect(out).not.toMatch(/[.…,;:!?-]\s*$/u);
	});

	it("clamps a 165-char meta into the 50-160 gate range", () => {
		const meta = "x".repeat(80) + " " + "y".repeat(84); // 165 chars, one space
		const out = clampToLength(meta, 155);
		expect(out.length).toBeGreaterThanOrEqual(50);
		expect(out.length).toBeLessThanOrEqual(160);
	});
});

describe("stripNonAllowlistedExternalLinks (citations offlist auto-cure)", () => {
	it("drops a non-allowlisted markdown link to its anchor text", () => {
		const out = stripNonAllowlistedExternalLinks(
			"See [the manual](https://manufacturer.com/guide) for details.",
		);
		expect(out).toBe("See the manual for details.");
	});

	it("preserves a .gov citation verbatim", () => {
		const src = "Per [IRS Schedule E](https://www.irs.gov/forms-pubs).";
		expect(stripNonAllowlistedExternalLinks(src)).toBe(src);
	});

	it("preserves a law.cornell.edu citation verbatim", () => {
		const src =
			"See [the FCRA](https://www.law.cornell.edu/uscode/text/15/1681).";
		expect(stripNonAllowlistedExternalLinks(src)).toBe(src);
	});

	it("removes a bare non-allowlisted URL", () => {
		const out = stripNonAllowlistedExternalLinks(
			"ref https://doorloop.com here",
		);
		expect(out).not.toContain("doorloop.com");
	});

	it("leaves internal /blog links untouched", () => {
		const src =
			"Read [the winter guide](/blog/winter-rental-maintenance-checklist).";
		expect(stripNonAllowlistedExternalLinks(src)).toBe(src);
	});
});

describe("ensureInternalLinks (internal_links auto-cure)", () => {
	const cands = [
		"winter-rental-maintenance-checklist",
		"fall-rental-maintenance-checklist",
		"spring-rental-maintenance-checklist",
	];

	it("appends a Related reading line when no internal links are present", () => {
		const out = ensureInternalLinks("Body text only.", cands);
		const links = [...out.matchAll(/\]\(\/blog\/([^)]+)\)/g)].map((m) => m[1]);
		expect(links.length).toBe(2);
		expect(out).toContain("Related reading:");
		// both appended links are real candidates
		for (const l of links) expect(cands).toContain(l);
	});

	it("strips a link to an unknown slug down to its text", () => {
		const out = ensureInternalLinks(
			"See [the made-up post](/blog/not-a-real-slug) and [winter](/blog/winter-rental-maintenance-checklist) and [fall](/blog/fall-rental-maintenance-checklist).",
			cands,
		);
		expect(out).not.toContain("/blog/not-a-real-slug");
		expect(out).toContain("the made-up post"); // text kept
	});

	it("strips a dead # link and tops up to two valid links", () => {
		const out = ensureInternalLinks("Body with [dead](#) link.", cands);
		expect(out).not.toContain("](#)");
		const links = [...out.matchAll(/\]\(\/blog\/([^)]+)\)/g)].map((m) => m[1]);
		expect(links.length).toBeGreaterThanOrEqual(2);
	});

	it("leaves content with two valid links unchanged (no append)", () => {
		const src =
			"A [winter](/blog/winter-rental-maintenance-checklist) and [fall](/blog/fall-rental-maintenance-checklist) post.";
		expect(ensureInternalLinks(src, cands)).toBe(src);
	});

	it("inserts the line before the FAQ section", () => {
		const out = ensureInternalLinks("Intro.\n\n## FAQ\n\n### Q?\n\nA.", cands);
		expect(out.indexOf("Related reading:")).toBeLessThan(out.indexOf("## FAQ"));
	});

	it("is a no-op when fewer than two candidates exist", () => {
		const src = "Body text only.";
		expect(ensureInternalLinks(src, ["only-one"])).toBe(src);
	});
});

// --- SEO gate fixtures: a draft that passes ALL 18 deterministic gates, then
// targeted perturbations per gate. ---

const CANDIDATE_SLUGS = [
	"how-to-verify-tenant-income-documents",
	"rental-application-fraud-detection-guide",
];
const HUD_LINK =
	", plus [HUD's screening guidance](https://www.hud.gov/program_offices/fair_housing_equal_opp)";

function seoSection(title: string, seed: string): string {
	const sentences = Array.from(
		{ length: 18 },
		(_, i) =>
			`${seed} helps a landlord document lease files, screening notes, and maintenance records with concrete steps and clear timelines (${i + 1}).`,
	);
	return `## ${title}\n\n${sentences.join(" ")}`;
}

function buildSeoContent(): string {
	const takeaways = [
		"## Key Takeaways",
		"",
		"- Verified income should be at least three times the monthly rate before an application advances.",
		"- A written screening standard applied to every applicant is the strongest fair-housing defense.",
		"- Document every screening decision the day it happens, not at month end.",
	].join("\n");
	const body = [
		seoSection("Setting Written Screening Criteria", "A written standard"),
		seoSection("Verifying Income Documents", "Income verification"),
		`See [How to Verify Tenant Income Documents](/blog/${CANDIDATE_SLUGS[0]}) and [Rental Application Fraud Detection Guide](/blog/${CANDIDATE_SLUGS[1]}) for deeper dives${HUD_LINK}.`,
		seoSection("Reading Credit Reports Line by Line", "Credit review"),
		seoSection("Calling References the Right Way", "Reference calling"),
		seoSection("Documenting Every Decision", "Decision logging"),
	].join("\n\n");
	const faq = [
		"## FAQ",
		"",
		"### How long should a landlord keep screening records?",
		"Keep them for at least two years after the decision.",
		"### What income multiple should a landlord require?",
		"Three times the monthly rate is the common written standard.",
		"### Can a landlord reject an incomplete application?",
		"Yes, when the written criteria say complete applications only.",
	].join("\n");
	return `${takeaways}\n\n${body}\n\n${faq}`;
}

const seoCtx: GateContext = {
	topic: "How to screen tenants with written criteria",
	internalLinkCandidates: CANDIDATE_SLUGS,
};

const seoDraft: Draft = {
	title: "Tenant Screening Tips for New Landlords", // 40 chars
	slug: "tenant-screening-tips-for-new-landlords",
	excerpt:
		"A practical screening walkthrough for landlords: written criteria, income checks, credit review, and documentation habits.",
	meta_description:
		"Learn the screening workflow experienced landlords use: written criteria, income verification, credit review, and records.",
	category: "tenant-screening",
	content: buildSeoContent(),
};

const gateNames = (d: Draft, ctx: GateContext = seoCtx): string[] =>
	runGates(d, ctx).map((f) => f.gate);

describe("runGates SEO baseline", () => {
	it("a fully compliant draft passes all 18 gates", () => {
		expect(runGates(seoDraft, seoCtx)).toEqual([]);
	});
});

describe("extractComparisonBrands", () => {
	it("extracts a multi-word brand from the right segment", () => {
		expect(
			extractComparisonBrands(
				"buildium-vs-landlord-studio-complete-comparison-for-first-time-landlords",
			),
		).toEqual(["buildium", "landlord studio"]);
	});

	it("cuts the right brand at a year token", () => {
		expect(
			extractComparisonBrands(
				"buildium-vs-appfolio-2026-small-landlord-comparison",
			),
		).toEqual(["buildium", "appfolio"]);
	});

	it("keeps a bare pair intact", () => {
		expect(extractComparisonBrands("tenantflow-vs-doorloop")).toEqual([
			"tenantflow",
			"doorloop",
		]);
	});

	it("keeps a multi-word LEADING brand whole", () => {
		expect(
			extractComparisonBrands(
				"landlord-studio-vs-buildium-complete-comparison",
			),
		).toEqual(["landlord studio", "buildium"]);
	});

	it("returns [] for non-comparison slugs", () => {
		expect(extractComparisonBrands("texas-security-deposit-law-guide")).toEqual(
			[],
		);
	});
});

describe("normalizeComparisonPair / findDuplicateComparison", () => {
	it("normalizes either brand order to the same pair key", () => {
		expect(
			normalizeComparisonPair(
				"tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
			),
		).toBe(normalizeComparisonPair("doorloop-vs-tenantflow-2026-guide"));
	});

	it("returns null for non-comparison slugs", () => {
		expect(
			normalizeComparisonPair("spring-rental-maintenance-checklist"),
		).toBeNull();
	});

	it("finds a published slug covering the same pair under different wording", () => {
		expect(
			findDuplicateComparison("doorloop-vs-tenantflow-2026-guide", [
				"innago-vs-stessa-complete-comparison",
				"tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
			]),
		).toBe(
			"tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
		);
	});

	it("returns null when no published pair matches", () => {
		expect(
			findDuplicateComparison("buildium-vs-appfolio-2026", [
				"tenantflow-vs-doorloop-guide",
			]),
		).toBeNull();
	});

	it("ignores the identical slug (the slug-exists probe owns that path)", () => {
		expect(
			findDuplicateComparison("tenantflow-vs-doorloop-guide", [
				"tenantflow-vs-doorloop-guide",
			]),
		).toBeNull();
	});
});

describe("deriveTags", () => {
	it("tags a comparison post with category + comparison", () => {
		expect(
			deriveTags(
				"buildium-vs-appfolio-2026",
				"Buildium vs AppFolio",
				"software-vault",
			),
		).toEqual(["software-vault", "comparison"]);
	});

	it("tags an alternatives roundup with comparison", () => {
		expect(
			deriveTags(
				"appfolio-alternatives-under-25-month-for-first-time-landlords",
				"Best AppFolio Alternatives for Landlords",
				"software-vault",
			),
		).toEqual(["software-vault", "comparison"]);
	});

	it("tags a plain post with the category only", () => {
		expect(
			deriveTags(
				"winter-rental-maintenance-checklist",
				"Winter Checklist",
				"maintenance",
			),
		).toEqual(["maintenance"]);
	});
});

describe("slug_brand_match gate", () => {
	const vsDraft: Draft = {
		...seoDraft,
		slug: "tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
	};

	it("fails when the title omits a compared brand", () => {
		expect(
			gateNames({
				...vsDraft,
				title: "Property Software Review for Landlords",
			}),
		).toContain("slug_brand_match");
	});

	it("passes when the title names both brands (any case)", () => {
		expect(
			gateNames({
				...vsDraft,
				title: "TenantFlow vs DoorLoop: Honest Landlord Review",
			}),
		).not.toContain("slug_brand_match");
	});

	it("never fires for non-comparison slugs", () => {
		expect(gateNames(seoDraft)).not.toContain("slug_brand_match");
	});
});

describe("post-override slug_brand_match (re-gate the published slug)", () => {
	it("a model slug without -vs- skips slug_brand_match", () => {
		// seoDraft's slug has no "-vs-", so the brand gate is inert on the model draft.
		expect(gateNames(seoDraft)).not.toContain("slug_brand_match");
	});

	it("applySlugOverride to a -vs- slug re-activates the gate on the published slug", () => {
		// The override pins a comparison slug whose brands (tenantflow, doorloop)
		// are absent from seoDraft's screening title, so re-running the gates on
		// the POST-override slug must now surface slug_brand_match — the exact leak
		// the fix closes (the gate previously only saw the model's pre-override slug).
		const overridden = applySlugOverride(
			seoDraft,
			"tenantflow-vs-doorloop-comparison-guide",
		);
		expect(overridden.slug).toBe("tenantflow-vs-doorloop-comparison-guide");
		expect(gateNames(overridden)).toContain("slug_brand_match");
	});
});

describe("title_length gate", () => {
	it("fails under 25 characters", () => {
		expect(gateNames({ ...seoDraft, title: "Screening Tips" })).toContain(
			"title_length",
		);
	});

	it("fails over 55 characters", () => {
		expect(
			gateNames({
				...seoDraft,
				title:
					"The Complete and Exhaustive Tenant Screening Handbook for Landlords",
			}),
		).toContain("title_length");
	});

	it("passes the 25-55 inclusive bounds", () => {
		expect(gateNames({ ...seoDraft, title: "x".repeat(25) })).not.toContain(
			"title_length",
		);
		expect(gateNames({ ...seoDraft, title: "x".repeat(55) })).not.toContain(
			"title_length",
		);
	});
});

describe("meta_not_truncated gate", () => {
	it('fails when meta_description ends with "..."', () => {
		expect(
			gateNames({
				...seoDraft,
				meta_description:
					"Learn the screening workflow experienced landlords use: written criteria, income verification, credit checks...",
			}),
		).toContain("meta_not_truncated");
	});

	it("fails when the excerpt ends with a unicode ellipsis", () => {
		expect(
			gateNames({
				...seoDraft,
				excerpt:
					"A practical screening walkthrough for landlords: written criteria, income checks, and documentation habits…",
			}),
		).toContain("meta_not_truncated");
	});

	it("fails when meta_description copies the content opening verbatim", () => {
		const copied = seoDraft.content.replace(/\s+/g, " ").trim().slice(0, 130);
		expect(gateNames({ ...seoDraft, meta_description: copied })).toContain(
			"meta_not_truncated",
		);
	});

	it("passes a standalone value-proposition meta + excerpt", () => {
		expect(gateNames(seoDraft)).not.toContain("meta_not_truncated");
	});
});

describe("boilerplate_h2 gate", () => {
	it("rejects a banned generic H2 (case-insensitive)", () => {
		expect(
			gateNames({
				...seoDraft,
				content: seoDraft.content.replace(
					"## Reading Credit Reports Line by Line",
					"## red flags to watch for",
				),
			}),
		).toContain("boilerplate_h2");
	});

	it("rejects the banned heading as an H3 too", () => {
		expect(
			gateNames({
				...seoDraft,
				content: `${seoDraft.content}\n\n### Questions to Ask Previous Landlords\n\nGeneric block.`,
			}),
		).toContain("boilerplate_h2");
	});

	it("passes topic-specific headings", () => {
		expect(gateNames(seoDraft)).not.toContain("boilerplate_h2");
	});
});

const GFM_TABLE =
	"\n\n| Feature | TenantFlow | DoorLoop |\n| --- | --- | --- |\n| Lease vault | Yes | Yes |\n";

describe("table_required gate", () => {
	const vsSlugDraft: Draft = {
		...seoDraft,
		slug: "tenantflow-vs-doorloop-for-landlords",
		title: "TenantFlow vs DoorLoop: a Landlord Comparison",
	};

	it("fails a comparison slug without a GFM table", () => {
		expect(gateNames(vsSlugDraft)).toContain("table_required");
	});

	it("passes once a GFM table is present", () => {
		expect(
			gateNames({ ...vsSlugDraft, content: vsSlugDraft.content + GFM_TABLE }),
		).not.toContain("table_required");
	});

	it("triggers on an alternatives topic without a comparison slug", () => {
		expect(
			gateNames(seoDraft, {
				...seoCtx,
				topic: "Best Buildium alternatives for small landlords",
			}),
		).toContain("table_required");
	});

	it('triggers on multi-state intent ("all 50 states")', () => {
		expect(
			gateNames(seoDraft, {
				...seoCtx,
				topic: "Security deposit caps in all 50 states",
			}),
		).toContain("table_required");
	});

	it("does not trigger for a single-topic article", () => {
		expect(gateNames(seoDraft)).not.toContain("table_required");
	});
});

describe("takeaways_required gate", () => {
	it("fails when the Key Takeaways section is missing", () => {
		const without = seoDraft.content.replace(
			/## Key Takeaways[\s\S]*?(?=## )/,
			"",
		);
		expect(gateNames({ ...seoDraft, content: without })).toContain(
			"takeaways_required",
		);
	});

	it("fails when the section opens beyond the first 1500 characters", () => {
		const pushed = `${"Intro filler about screening basics for landlords. ".repeat(40)}\n\n${seoDraft.content}`;
		expect(gateNames({ ...seoDraft, content: pushed })).toContain(
			"takeaways_required",
		);
	});

	it("fails with fewer than 3 bullets", () => {
		const twoBullets = seoDraft.content.replace(
			"\n- Document every screening decision the day it happens, not at month end.",
			"",
		);
		expect(gateNames({ ...seoDraft, content: twoBullets })).toContain(
			"takeaways_required",
		);
	});

	it("fails with more than 5 bullets", () => {
		const sixBullets = seoDraft.content.replace(
			"- Document every screening decision the day it happens, not at month end.",
			[
				"- Document every screening decision the day it happens, not at month end.",
				"- Keep applicant files in one place from day one.",
				"- Apply the same written criteria to every applicant.",
				"- Retain screening records for at least two years.",
			].join("\n"),
		);
		expect(gateNames({ ...seoDraft, content: sixBullets })).toContain(
			"takeaways_required",
		);
	});

	it("passes 3-5 standalone bullets at the top", () => {
		expect(gateNames(seoDraft)).not.toContain("takeaways_required");
	});
});

describe("faq_required gate", () => {
	it("fails when the FAQ section is missing", () => {
		const without = seoDraft.content.replace(/## FAQ[\s\S]*$/, "");
		expect(gateNames({ ...seoDraft, content: without })).toContain(
			"faq_required",
		);
	});

	it("fails with fewer than 3 question sub-headings", () => {
		const two = seoDraft.content.replace(
			"### Can a landlord reject an incomplete application?\nYes, when the written criteria say complete applications only.",
			"",
		);
		expect(gateNames({ ...seoDraft, content: two })).toContain("faq_required");
	});

	it("fails when the FAQ is buried before the final 2500 characters", () => {
		const buried = `${seoDraft.content}\n\n${"Trailing appendix paragraph for landlords. ".repeat(70)}`;
		expect(gateNames({ ...seoDraft, content: buried })).toContain(
			"faq_required",
		);
	});

	it('accepts the "## Frequently Asked Questions" variant', () => {
		const variant = seoDraft.content.replace(
			"## FAQ",
			"## Frequently Asked Questions",
		);
		expect(gateNames({ ...seoDraft, content: variant })).not.toContain(
			"faq_required",
		);
	});
});

describe("internal_links gate", () => {
	it("fails when fewer than 2 candidate links are woven in", () => {
		const oneLink = seoDraft.content.replace(
			`[Rental Application Fraud Detection Guide](/blog/${CANDIDATE_SLUGS[1]})`,
			"the fraud guide",
		);
		expect(gateNames({ ...seoDraft, content: oneLink })).toContain(
			"internal_links",
		);
	});

	it("fails on an internal link to a slug outside the candidate set", () => {
		expect(
			gateNames({
				...seoDraft,
				content: `${seoDraft.content}\n\nSee [more](/blog/hallucinated-post).`,
			}),
		).toContain("internal_links");
	});

	it('fails on an href="#" link', () => {
		expect(
			gateNames({
				...seoDraft,
				content: `${seoDraft.content}\n\n[click here](#).`,
			}),
		).toContain("internal_links");
	});

	it("passes vacuously when fewer than 2 candidates exist (early catalogue)", () => {
		const noLinks = seoDraft.content
			.replace(
				`[How to Verify Tenant Income Documents](/blog/${CANDIDATE_SLUGS[0]})`,
				"our income guide",
			)
			.replace(
				`[Rental Application Fraud Detection Guide](/blog/${CANDIDATE_SLUGS[1]})`,
				"the fraud guide",
			);
		expect(
			gateNames(
				{ ...seoDraft, content: noLinks },
				{ ...seoCtx, internalLinkCandidates: [] },
			),
		).not.toContain("internal_links");
	});
});

describe("validateInternalLinks", () => {
	it("ok with 2 candidate links and no strays", () => {
		expect(
			validateInternalLinks("[a](/blog/a) and [b](/blog/b)", ["a", "b", "c"]),
		).toEqual({ ok: true });
	});

	it("rejects unknown internal slugs even with fewer than 2 candidates", () => {
		expect(
			validateInternalLinks("[x](/blog/unknown-post)", ["only-one"]).ok,
		).toBe(false);
	});

	it('rejects "#" hrefs', () => {
		expect(validateInternalLinks("[x](#)", ["a", "b"]).ok).toBe(false);
	});

	it("passes vacuously with fewer than 2 candidates and no internal links", () => {
		expect(
			validateInternalLinks("plain prose, no links", ["only-one"]),
		).toEqual({ ok: true });
	});

	it("requires at least 2 candidate links when 2+ candidates exist", () => {
		expect(validateInternalLinks("[a](/blog/a)", ["a", "b"]).ok).toBe(false);
	});
});

describe("citations gate", () => {
	it("rejects a non-allowlisted external link in any category", () => {
		expect(
			gateNames({
				...seoDraft,
				content: `${seoDraft.content}\n\nPer [this blog](https://medium.com/some-post).`,
			}),
		).toContain("citations");
	});

	it("requires 1-3 allowlisted citations for tenant-screening", () => {
		const uncited = seoDraft.content.replace(HUD_LINK, "");
		expect(gateNames({ ...seoDraft, content: uncited })).toContain("citations");
	});

	it("rejects more than 3 allowlisted citations in a required category", () => {
		const four = `${seoDraft.content}\n\n[1](https://www.irs.gov/a) [2](https://www.cfpb.gov/b) [3](https://www.usa.gov/c)`;
		expect(gateNames({ ...seoDraft, content: four })).toContain("citations");
	});

	it("allows zero citations for non-required categories", () => {
		const uncited = seoDraft.content.replace(HUD_LINK, "");
		expect(
			gateNames({ ...seoDraft, category: "software-vault", content: uncited }),
		).not.toContain("citations");
	});

	it("passes 1-3 allowlisted citations", () => {
		expect(gateNames(seoDraft)).not.toContain("citations");
	});
});

describe("isAllowlistedCitation", () => {
	it("allows any .gov domain (federal and state)", () => {
		expect(isAllowlistedCitation("https://www.hud.gov/x")).toBe(true);
		expect(isAllowlistedCitation("https://comptroller.texas.gov/taxes")).toBe(
			true,
		);
	});

	it("allows law.cornell.edu (and subdomains of it)", () => {
		expect(isAllowlistedCitation("https://law.cornell.edu/ucc")).toBe(true);
		expect(isAllowlistedCitation("https://www.law.cornell.edu/uscode")).toBe(
			true,
		);
	});

	it("rejects everything else, lookalikes included", () => {
		expect(isAllowlistedCitation("https://medium.com/post")).toBe(false);
		expect(isAllowlistedCitation("https://hud.gov.phish.com/x")).toBe(false);
		expect(isAllowlistedCitation("https://cornell.edu/page")).toBe(false);
		expect(isAllowlistedCitation("not a url")).toBe(false);
	});
});

describe("extractExternalUrls", () => {
	it("dedupes and strips trailing prose punctuation", () => {
		expect(
			extractExternalUrls(
				"See https://www.irs.gov/pub. Again: [x](https://www.irs.gov/pub) and [y](https://www.hud.gov/z),",
			),
		).toEqual(["https://www.irs.gov/pub", "https://www.hud.gov/z"]);
	});

	it("ignores internal links", () => {
		expect(extractExternalUrls("[a](/blog/a-post)")).toEqual([]);
	});
});

describe("headCheckCitations (HEAD liveness probe)", () => {
	it("returns no problems when every citation resolves", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ status: 200 })),
		);
		expect(await headCheckCitations(["https://www.hud.gov/a"])).toEqual([]);
	});

	it("flags >=400 statuses with the status code", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({ status: 404 })),
		);
		expect(await headCheckCitations(["https://www.hud.gov/dead"])).toEqual([
			{ url: "https://www.hud.gov/dead", status: "404" },
		]);
	});

	it("flags network errors with the error message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("getaddrinfo ENOTFOUND");
			}),
		);
		expect(await headCheckCitations(["https://invalid.gov/x"])).toEqual([
			{
				url: "https://invalid.gov/x",
				status: expect.stringContaining("ENOTFOUND"),
			},
		]);
	});
});
