import { afterEach, describe, expect, it, vi } from "vitest";
import {
	critique,
	gateOnCritique,
	isCritiquePass,
	parseCritique,
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
