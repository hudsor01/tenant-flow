import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "./generate-blog-draft";
import {
	applySlugOverride,
	critique,
	gateOnCritique,
	isCritiquePass,
	parseCritique,
	parsePositionals,
	parseSlugOverride,
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
