import { afterEach, describe, expect, it, vi } from "vitest";
import type { Draft, GateContext } from "./generate-blog-draft";
import {
	applySlugOverride,
	blogSlugExists,
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

// Mirror of the generator's BANLIST: the gates match substrings (case ignored).
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
	expect(output).not.toMatch(/property owners?\b/i);
};

// Each rewrite keeps the sentence's grammar and meaning. Many inputs are
// sentences the n8n writer's model actually wrote (executions 124354-125245),
// where its fixed swaps gave "rent payments workflows", "tenants can make
// payments rent by check" or "the platform's focus on the tenant login".
const REWRITES: [string, string][] = [
	[
		"how each platform handles rent collection workflows",
		"how each platform handles rent payment collection workflows",
	],
	[
		"Innago supports rent collection but integrates it less seamlessly.",
		"Innago supports rent payment collection but integrates it less seamlessly.",
	],
	[
		"Rent collection is the part of the job most landlords dread.",
		"Rent payment collection is the part of the job most landlords dread.",
	],
	[
		"Track rent collections by month.",
		"Track rent payment collections by month.",
	],
	[
		"Landlord Studio excels in rent collection tracking.",
		"Landlord Studio excels in rent payment tracking.",
	],
	[
		"It includes online rent collection and a maintenance portal.",
		"It includes electronic rent payment collection and a maintenance portal.",
	],
	[
		"It includes tenant screening and automated rent collection.",
		"It includes tenant screening and automatic rent payment collection.",
	],
	[
		"Some landlords still collect rent checks in person.",
		"Some landlords still collect the rent checks in person.",
	],
	[
		"Many small landlords collect rents by check.",
		"Many small landlords collect the rents by check.",
	],
	[
		"The platform's focus on the tenant portal can overshadow vendor tools.",
		"The platform's focus on the tenant-facing portal can overshadow vendor tools.",
	],
	[
		"Innago offers robust tenant portals that allow tenants to pay rent online.",
		"Innago offers robust tenant-facing portals that allow tenants to pay the rent online.",
	],
	[
		"Tenants can pay rent by check.",
		"Tenants are able to pay the rent by check.",
	],
	[
		"Subtenants can pay the original tenant directly.",
		"Subtenants are able to pay the original tenant directly.",
	],
	[
		"The tenant must pay rent and utilities by the fifth.",
		"The tenant must pay the rent and utilities by the fifth.",
	],
	[
		"When tenants pay rent through SimplifyEm, you pay a fee.",
		"When tenants pay the rent through SimplifyEm, you pay a fee.",
	],
	[
		"Can tenants prepay rent for the whole year?",
		"Can tenants prepay the rent for the whole year?",
	],
	[
		"Tenants may have to repay rental assistance.",
		"Tenants may have to repay the rental assistance.",
	],
	["The tenant paid rent on the 5th.", "The tenant paid the rent on the 5th."],
	["The tenant overpaid rent by $50.", "The tenant overpaid the rent by $50."],
	[
		"The tenant prepaid rent for six months.",
		"The tenant prepaid the rent for six months.",
	],
	[
		"A weak lease can lead to disputes, unpaid rent, and legal nightmares.",
		"A weak lease can lead to disputes, outstanding rent, and legal nightmares.",
	],
	[
		"Within the grace period, the charge shows as unpaid rent, not late rent.",
		"Within the grace period, the charge shows as outstanding rent, not late rent.",
	],
	[
		"Unpaid rental income is not deductible.",
		"Outstanding rental income is not deductible.",
	],
	[
		"Prepaid rent is taxable income in the year you receive it.",
		"Advance rent is taxable income in the year you receive it.",
	],
	[
		"Pre-paid rent is a liability until the month it covers.",
		"Advance rent is a liability until the month it covers.",
	],
	[
		"Landlords who record rent payments promptly win more disputes.",
		"Landlords who record the rent payments promptly win more disputes.",
	],
	[
		"Landlords can record rent charges in the ledger.",
		"Landlords can record the rent charges in the ledger.",
	],
	[
		"Landlords saw record rent increases last year.",
		"Landlords saw record-setting rent increases last year.",
	],
	[
		"Amid record rent growth, cities passed new protections.",
		"Amid record-setting rent growth, cities passed new protections.",
	],
	[
		"It combines accurate rent tracking with lease generation.",
		"It combines accurate rent-tracking with lease generation.",
	],
	[
		"Use market rent tracking tools to price a vacant unit.",
		"Use market rent-tracking tools to price a vacant unit.",
	],
	[
		"Avail charges extra fees for rent processing.",
		"Avail charges extra fees for rent payment processing.",
	],
	[
		"RentTrack offers online rent payment and reporting.",
		"RentTrack offers electronic rent payment and reporting.",
	],
	[
		"Tenants cannot log in or make online payments.",
		"Tenants cannot log in or make electronic payments.",
	],
	[
		"Apartments.com is a massive online rental marketplace.",
		"Apartments.com is a massive internet rental marketplace.",
	],
	[
		"Use online rental applications to screen faster.",
		"Use internet rental applications to screen faster.",
	],
	[
		"Autopay reduces late payments for most landlords.",
		"Automatic payment reduces late payments for most landlords.",
	],
	[
		"Autopay-enabled accounts get a discount.",
		"Automatic-payment-enabled accounts get a discount.",
	],
	[
		"Set up auto-payments for utilities.",
		"Set up automatic payments for utilities.",
	],
	[
		"A fully automated workflow removes manual steps.",
		"A fully automatic workflow removes manual steps.",
	],
	[
		"Automated renter screening is a competitor feature.",
		"Automatic renter screening is a competitor feature.",
	],
	[
		"Give tenants mobile app access to their lease documents.",
		"Give tenants mobile-app access to their lease documents.",
	],
	["Mobile app accessibility matters.", "Mobile-app accessibility matters."],
];

// No single rewrite is right in every context for these, so the text stays as
// written for gate 8, whose repair turn rewrites the sentence.
const LEFT_FOR_GATE: [string, string][] = [
	["Tenants who don't autopay are more likely to pay late.", "autopay"],
	["Can a tenant autopay from a credit card?", "autopay"],
	["Autopay your utilities to avoid late fees.", "autopay"],
	["Autopay ACH debits arrive on the 1st.", "autopay"],
	["Failed autopays can trigger bank fees.", "autopay"],
	["Record rents are pushing more renters toward roommates.", "record rent"],
	["Austin could record rent growth of 4% next year.", "record rent"],
	["Most landlords record rent increases in an addendum.", "record rent"],
	["Click the Record Rent button to log a payment.", "record rent"],
	["Accepting partially paid rent can waive your right to evict.", "paid rent"],
	["You have paid rent receipts for every month.", "paid rent"],
	["The landlord refunded overpaid rent.", "paid rent"],
	["Maria prepaid rent for six months.", "paid rent"],
	["Most portals have a pay rent button.", "pay rent"],
	["Most portals include pay rent buttons.", "pay rent"],
	["Serve a 3-day pay rent or quit notice.", "pay rent"],
	["Use an online rent calculator to estimate market rent.", "online rent"],
	[
		"If one agency fails, try a different collection agency.",
		"rent collection",
	],
	[
		"Your current collection process may be costing you money.",
		"rent collection",
	],
	["Rent Collection Act requirements vary by city.", "rent collection"],
	[
		'Many apps advertise "seamless rent collection" as their selling point.',
		"rent collection",
	],
	["A subtenant portal is rare.", "tenant portal"],
	["Non-property owners cannot claim the deduction.", "property owner"],
	[
		"When a single property owner controls most rentals, rents rise.",
		"property owner",
	],
	["Commercial property owners' insurance costs rose.", "property owner"],
	[
		"Investment property owner tax deductions include mortgage interest.",
		"property owner",
	],
	[
		'Texas law defines a "property owner" as anyone who holds title.',
		"property owner",
	],
	[
		"The ordinance uses the phrase 'property owner' rather than landlord.",
		"property owner",
	],
	["Property owner-occupied duplexes qualify for FHA loans.", "property owner"],
	[
		"Home and property owners in the flood zone need insurance.",
		"property owner",
	],
	["Tips for multi property owners managing two states.", "property owner"],
	["Multiproperty Owners Need a System", "property owner"],
];

describe("sanitizeBanlist rewrites (the gates match substrings)", () => {
	it.each(REWRITES)("%s", (input, expected) => {
		expect(sanitizeBanlist(input)).toBe(expected);
		expectGateClean(expected);
	});

	it.each(LEFT_FOR_GATE)("leaves %s for gate 8", (input, phrase) => {
		expect(sanitizeBanlist(input)).toBe(input);
		expect(input.toLowerCase()).toContain(phrase);
	});

	it.each([
		"TenantFlow offers automated rent collection.",
		"With TenantFlow, tenants can pay rent online.",
		"TenantFlow's autopay feature saves time.",
		// A negation elsewhere in the sentence denies nothing.
		"TenantFlow handles rent collection so you don't have to.",
		"TenantFlow includes a tenant portal at no extra cost.",
		"Buildium doesn't offer autopay, but TenantFlow does.",
		// Abbreviations do not split a claim from its subject.
		"TenantFlow serves U.S. landlords with autopay and online rent payments.",
		// Ledger wording carries a claim as easily.
		"TenantFlow automatically chases unpaid rent with text reminders.",
		// A list, a table, a later paragraph or an H3 in the same section.
		"TenantFlow includes:\n- Rent collection\n- Online payments\n- A tenant portal",
		"TenantFlow includes the following features.\n\n- Rent collection\n- Online payments",
		"| Feature | TenantFlow | Buildium |\n| --- | --- | --- |\n| Autopay | Yes | Yes |",
		"## Why TenantFlow Fits Small Landlords\n\nIt handles rent collection and autopay.",
		"TenantFlow is built for small landlords.\n\nWith it, tenants can pay rent online.",
		"## What TenantFlow Does\n\nIt keeps leases.\n\n### Payments\n\nIt offers autopay.",
		// Other names for the product, and a pitch.
		"Tenant Flow lets tenants pay rent through a tenant portal.",
		"With our software, tenants can pay rent from their phone.",
		"Our Growth plan adds autopay for every lease.",
		"Start your free trial: online rent payment for every unit.",
		// Even a true denial goes to the repair turn, which words it without the phrase.
		"TenantFlow does not offer rent collection.",
	])("never rewrites a banlist phrase near TenantFlow: %s", (text) => {
		expect(sanitizeBanlist(text)).toBe(text);
	});

	it("still rewrites a section that does not name TenantFlow", () => {
		expect(
			sanitizeBanlist(
				"Use TenantFlow.\n\n## Rent collection tips\n\nRent collection gets easier with reminders.",
			),
		).toBe(
			"Use TenantFlow.\n\n## Rent payment collection tips\n\nRent payment collection gets easier with reminders.",
		);
	});

	it("rewrites only persona words in the title, excerpt and meta description", () => {
		expect(
			sanitizeBanlist("Set up autopay and rent collection.", {
				banlist: false,
			}),
		).toBe("Set up autopay and rent collection.");
		expect(
			sanitizeBanlist("Tips for property owners", { banlist: false }),
		).toBe("Tips for owners");
	});

	it('never rewrites "tenant portal" as "tenant records" or "tenant login"', () => {
		const out = sanitizeBanlist(
			"Buildium has a tenant portal. Tenant portals add fees.",
		);
		expect(out).toBe(
			"Buildium has a tenant-facing portal. Tenant-facing portals add fees.",
		);
		expect(out.toLowerCase()).not.toMatch(/tenant (records|login)/);
	});

	it.each<[string, string]>([
		["Offer an autopay option.", "Offer an automatic payment option."],
		[
			"Is a prepaid rent deposit taxable?",
			"Is an advance rent deposit taxable?",
		],
		["Record an unpaid rent balance.", "Record an outstanding rent balance."],
		["Join a property owners association.", "Join an owners' association."],
		[
			"What's the difference between a property owner and a landlord?",
			"What's the difference between an owner and a landlord?",
		],
		["Buy a rent collection tool.", "Buy a rent payment collection tool."],
		[
			"A PROPERTY OWNERS ASSOCIATION CAN LIEN YOUR UNIT",
			"AN OWNERS' ASSOCIATION CAN LIEN YOUR UNIT",
		],
		[
			"- A prepaid rent credit is a liability.",
			"- An advance rent credit is a liability.",
		],
		[
			"Tip: A property owner who lives on-site is a landlord.",
			"Tip: An owner who lives on-site is a landlord.",
		],
		[
			"## Why A Property Owner Needs Insurance",
			"## Why An Owner Needs Insurance",
		],
		// A capital letter label is not an article.
		[
			"Class A owners often hire managers.",
			"Class A owners often hire managers.",
		],
	])('keeps "a" and "an" agreeing: %s', (input, expected) => {
		expect(sanitizeBanlist(input)).toBe(expected);
	});

	it.each<[string, string]>([
		[
			"Why Landlords Skip the Tenant Portal",
			"Why Landlords Skip the Tenant-Facing Portal",
		],
		[
			"Rent Collection Software for Small Landlords",
			"Rent Payment Software for Small Landlords",
		],
		["## Why Tenant Portals Fail", "## Why Tenant-Facing Portals Fail"],
		[
			"## Is Autopay Worth It for Small Landlords?",
			"## Is Automatic Payment Worth It for Small Landlords?",
		],
		["## Autopay and Late Fees", "## Automatic Payment and Late Fees"],
		[
			"Landlords Brace for a Record Rent Spike",
			"Landlords Brace for a Record-Setting Rent Spike",
		],
		[
			"How to Get Tenants to Pay Rent on Time",
			"How to Get Tenants to Pay the Rent on Time",
		],
		["HOW TENANTS PAY RENT", "HOW TENANTS PAY THE RENT"],
		[
			"RENT COLLECTION SOFTWARE VS. A SPREADSHEET",
			"RENT PAYMENT SOFTWARE VS. A SPREADSHEET",
		],
		// A capital that only starts a sentence or a sentence-case cell stays a
		// leading capital, even under a heading.
		[
			"## Benefits of Automation\n\nAutopay reduces late payments.",
			"## Benefits of Automation\n\nAutomatic payment reduces late payments.",
		],
		["| Feature | Autopay |", "| Feature | Automatic payment |"],
		[
			"## Is the Property Owner-Occupied?",
			"## Is the Property Occupied by Its Owner?",
		],
	])("gives the replacement the match's case: %s", (input, expected) => {
		expect(sanitizeBanlist(input)).toBe(expected);
	});

	it("clears a worst-case paragraph, and a second pass changes nothing", () => {
		const out = sanitizeBanlist(
			"Use rent collection software with autopay and a tenant portal so tenants can pay rent online; unpaid rent and prepaid rent need rent tracking.",
		);
		expect(out).toBe(
			"Use rent payment software with automatic payment and a tenant-facing portal so tenants are able to pay the rent online; outstanding rent and advance rent need rent-tracking.",
		);
		expectGateClean(out);
		for (const [input] of [...REWRITES, ...PERSONA_REWRITES]) {
			const once = sanitizeBanlist(input);
			expect(sanitizeBanlist(once), input).toBe(once);
		}
	});

	it("sends a banlist phrase it leaves to the repair turn with a hint for longer words and TenantFlow claims", () => {
		const hit = runGates(
			{
				...seoDraft,
				content: `${seoDraft.content}\n\nA subtenant portal is rare.`,
			},
			seoCtx,
		).find((f) => f.gate === "banlist");
		expect(hit?.message).toBe("tenant portal (content)");
		expect(hit?.fix).toContain("inside a longer word");
		expect(hit?.fix).toContain(
			"In a paragraph about TenantFlow, keep only what is true",
		);
	});

	it("sends a persona word it leaves to the repair turn with a persona hint", () => {
		const hit = runGates(
			{
				...seoDraft,
				content: `${seoDraft.content}\n\nNon-property owners cannot claim the deduction.`,
			},
			seoCtx,
		).find((f) => f.gate === "banlist");
		expect(hit?.message).toBe("property owner (content)");
		expect(hit?.fix).toContain('"owner(s)"');
		expect(hit?.fix).not.toContain("rent payments");
	});
});

describe("runGates banlist on the meta description", () => {
	it("gates a banned phrase in the meta description, which gate 8 does not check", () => {
		const hit = runGates(
			{
				...seoDraft,
				meta_description: `${seoDraft.meta_description.slice(0, 120)} rent collection`,
			},
			seoCtx,
		).find((f) => f.gate === "banlist");
		expect(hit?.message).toBe("rent collection (meta_description)");
	});
});

const PERSONA_REWRITES: [string, string][] = [
	// "landlord" in a paragraph about renting, else the exact "owner".
	[
		"Property owners who rent out units need a written lease.",
		"Landlords who rent out units need a written lease.",
	],
	[
		"For the single property owner, scaling a rental business is hard.",
		"For the single-property landlord, scaling a rental business is hard.",
	],
	[
		"The county sends assessments to every property owner.",
		"The county sends assessments to every owner.",
	],
	[
		"Property owners juggle many tasks; a property owner needs systems.",
		"Owners juggle many tasks; an owner needs systems.",
	],
	[
		"TenantFlow is built for property owners.",
		"TenantFlow is built for landlords.",
	],
	["Rental property owners", "Landlords"],
	[
		"Unlike homeowners, rental property owners can deduct depreciation.",
		"Unlike homeowners, owners of rental property can deduct depreciation.",
	],
	[
		"For the single property owner, scaling is hard.",
		"For the owner of a single property, scaling is hard.",
	],
	[
		"Advice for a single property owner",
		"Advice for an owner of a single property",
	],
	[
		"# Top 5 Apps for Single Property Owners",
		"# Top 5 Apps for Owners of a Single Property",
	],
	[
		"# Top 5 Property Management Apps for Single Property Owners",
		"# Top 5 Property Management Apps for Single-Property Landlords",
	],
	[
		"Tips for multi-property owners.",
		"Tips for owners of multiple properties.",
	],
	[
		"A commercial property owner who leases retail space must give notice.",
		"An owner of commercial property who leases retail space must give notice.",
	],
	[
		"Many vacation property owners are first-time hosts.",
		"Many owners of vacation property are first-time hosts.",
	],
	// "landlords and rental property owners" would read "landlords and landlords".
	[
		"Landlords and rental property owners should budget for vacancies.",
		"Landlords and owners of rental property should budget for vacancies.",
	],
	[
		"This guide is for landlords and property owners.",
		"This guide is for landlords and owners.",
	],
	[
		"TenantFlow is designed for independent landlords and single-property owners.",
		"TenantFlow is designed for independent landlords and owners of a single property.",
	],
	[
		"The independent landlord is typically a property owner who manages their own assets.",
		"The independent landlord is typically an owner who manages their own assets.",
	],
	[
		"## Landlord vs. Property Owner: What's the Difference?",
		"## Landlord vs. Owner: What's the Difference?",
	],
	[
		"The landlord, i.e. the property owner, signs the lease.",
		"The landlord, i.e. the owner, signs the lease.",
	],
	[
		"Landlords are not the only U.S. property owners affected by the tax.",
		"Landlords are not the only U.S. owners affected by the tax.",
	],
	[
		"HOA rules apply to every property owner.",
		"HOA rules apply to every owner.",
	],
	[
		"| Role | Duty |\n|---|---|\n| Landlord | Repairs |\n| Property owner | Taxes |",
		"| Role | Duty |\n|---|---|\n| Landlord | Repairs |\n| Owner | Taxes |",
	],
	[
		"Every single property owner must register by June.",
		"Every single owner must register by June.",
	],
	[
		"Notify adjacent property owners before you build a fence.",
		"Notify adjacent owners before you build a fence.",
	],
	// A contrast, or a second persona phrase in the sentence, means owners in
	// general; "landlord" in another sentence is not evidence.
	[
		"Not every property owner rents out space; many live in the home they own.",
		"Not every owner rents out space; many live in the home they own.",
	],
	[
		"Unlike most property owners, rental property owners need a business license.",
		"Unlike most owners, landlords need a business license.",
	],
	[
		"This guide covers property owners and rental property owners.",
		"This guide covers owners and landlords.",
	],
	[
		"Landlords need reserves. So do property owners who live in their homes.",
		"Landlords need reserves. So do owners who live in their homes.",
	],
	[
		"Independent property owners who rent out units need a lease.",
		"Independent landlords who rent out units need a lease.",
	],
	[
		"This approach fails single property owners with one rental.",
		"This approach fails single-property landlords with one rental.",
	],
	["Is the property owner-occupied?", "Is the property occupied by its owner?"],
	[
		"Check your property owners association rules before renting.",
		"Check your owners' association rules before renting.",
	],
	[
		"Real estate investors who flip houses do not need a rent ledger.",
		"Property investors who flip houses do not need a rent ledger.",
	],
];

describe("sanitizeBanlist persona purity (persona-consistency e2e words)", () => {
	it.each(PERSONA_REWRITES)("%s", (input, expected) => {
		expect(sanitizeBanlist(input)).toBe(expected);
		expectGateClean(expected);
	});

	it("leaves nothing the gate's persona pattern matches", () => {
		for (const text of [
			"Property owners juggle many tasks; a property owner needs systems.",
			"A single-property owner, multiproperty owners, PROPERTY OWNER's lease.",
		]) {
			expect(sanitizeBanlist(text)).not.toMatch(/property owners?\b/i);
		}
	});

	it('rewrites "real estate investor(s)", which persona-consistency.spec.ts bans on / and /pricing', () => {
		expect(
			sanitizeBanlist(
				"Real estate investors and any real estate investor benefit.",
			),
		).toBe("Property investors and any property investor benefit.");
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

describe("runGates docuseal_mention", () => {
	it("rejects even one DocuSeal mention, because TenantFlow's e-signing is its own", () => {
		const d = {
			...seoDraft,
			content: `${seoDraft.content}\n\nSign it with DocuSeal.`,
		};
		expect(gateNames(d)).toContain("docuseal_mention");
	});

	it.each(["title", "excerpt", "meta_description"] as const)(
		"checks the %s too, and names it in the repair hint",
		(field) => {
			const d = { ...seoDraft, [field]: `${seoDraft[field]} DocuSeal` };
			const hit = runGates(d, seoCtx).find(
				(f) => f.gate === "docuseal_mention",
			);
			expect(hit?.message).toBe(`${field} 1x`);
			expect(hit?.fix).toContain(field);
		},
	);

	it("passes a draft that never mentions DocuSeal", () => {
		expect(gateNames(seoDraft)).not.toContain("docuseal_mention");
	});
});

describe("runGates banlist: the title, the excerpt and the content, and the persona word", () => {
	const banlistFailures = (d: Draft) =>
		runGates(d, seoCtx).filter((f) => f.gate === "banlist");
	const withText = (field: "title" | "excerpt" | "content", text: string) => ({
		...seoDraft,
		[field]: `${seoDraft[field]} ${text}`,
	});

	for (const field of ["title", "excerpt", "content"] as const) {
		it(`rejects a banlist phrase in the ${field}`, () => {
			expect(
				banlistFailures(withText(field, "with Rent Collection built in")),
			).toEqual([
				expect.objectContaining({ message: `rent collection (${field})` }),
			]);
		});

		it(`rejects the persona word in the ${field}, as persona-consistency.spec.ts does`, () => {
			for (const text of [
				"for a single-property owner",
				"for multiproperty owners",
				"for Property Owners",
				"PROPERTY OWNER",
			]) {
				expect(banlistFailures(withText(field, text)), text).toEqual([
					expect.objectContaining({ message: `property owner (${field})` }),
				]);
			}
		});

		it(`accepts what the spec's regex does not match in the ${field}`, () => {
			for (const text of [
				"on property ownership",
				"keyed by property owner_id",
				"property owners2",
			]) {
				expect(banlistFailures(withText(field, text)), text).toEqual([]);
			}
		});
	}

	it("reports the title first, as the trigger checks it first", () => {
		expect(
			banlistFailures({
				...seoDraft,
				title: `${seoDraft.title} for property owners`,
				content: `${seoDraft.content}\nautopay`,
			}),
		).toEqual([expect.objectContaining({ message: "property owner (title)" })]);
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
