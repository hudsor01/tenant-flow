import { expect, test } from "@playwright/test";

/**
 * Persona consistency e2e (Phase 4 Plan 04-01 — CONS-01, COPY-01, COPY-02, COPY-03).
 *
 * Plan 04-02 will extend this file with DocuSeal-count + FAQ-count assertions in Wave 2.
 *
 * Source: .planning/phases/04-persona-copy/04-RESEARCH.md § Validation Strategy
 *         .planning/phases/04-persona-copy/04-VALIDATION.md
 */

// Mirrors src/proxy.ts PUBLIC_ROUTES — every public marketing surface that
// renders user-facing copy. If a route is added to PUBLIC_ROUTES, add it here
// so the persona-word + DocuSeal-count + segment-anchor guards run against it.
const PUBLIC_PATHS = [
	"/",
	"/about",
	"/blog",
	"/faq",
	"/pricing",
	"/contact",
	"/compare/buildium",
	"/compare/appfolio",
	"/compare/rentredi",
	"/help",
	"/resources",
	"/features",
	"/privacy",
	"/terms",
	"/security-policy",
	"/support",
] as const;

test.describe("Persona consistency — sitewide", () => {
	// 16 sequential page.goto() per test against the next dev server. Each
	// page is ~300-900ms on a cold compile in CI, so the default 30s test
	// budget gets tight and intermittently aborts with ERR_ABORTED when the
	// dev server is mid-compile. Bumped to 60s — the assertions themselves
	// are sub-millisecond, the budget is purely network/compile time.
	test.setTimeout(60_000);

	test('No "property owners" persona word on any public marketing page', async ({
		page,
	}) => {
		for (const path of PUBLIC_PATHS) {
			await page.goto(path);
			const body = (await page.textContent("body")) ?? "";
			expect(body, `path: ${path}`).not.toMatch(/property owners?\b/i);
		}
	});

	test('No "real estate investors" on key entry-point pages', async ({
		page,
	}) => {
		for (const path of ["/", "/pricing"]) {
			await page.goto(path);
			const body = (await page.textContent("body")) ?? "";
			expect(body, `path: ${path}`).not.toMatch(/real estate investors?\b/i);
		}
	});

	test("No fabricated subscriber-count claims appear on any marketing page", async ({
		page,
	}) => {
		for (const path of PUBLIC_PATHS) {
			await page.goto(path);
			const body = (await page.textContent("body")) ?? "";
			expect(body, `path: ${path}`).not.toMatch(
				/Join 500\+|500\+ (Growth|user|subscriber)/i,
			);
			expect(body, `path: ${path}`).not.toMatch(/2,500\+ user/i);
		}
	});
});

test.describe("Persona consistency — homepage hero (COPY-01 + COPY-03)", () => {
	test("Hero subhead does NOT contain the contradiction phrase", async ({
		page,
	}) => {
		await page.goto("/");
		const body = (await page.textContent("body")) ?? "";
		expect(body).not.toContain("tenants never have to log in");
	});

	test('Hero subhead contains "landlords with 1–15 rentals"', async ({
		page,
	}) => {
		await page.goto("/");
		const body = (await page.textContent("body")) ?? "";
		expect(body).toContain("landlords with 1–15 rentals");
	});

	test('Hero subhead contains "tenants stay off the platform"', async ({
		page,
	}) => {
		await page.goto("/");
		const body = (await page.textContent("body")) ?? "";
		expect(body).toContain("tenants stay off the platform");
	});

	test("Tenants-never-login Badge renders above the h1 on /", async ({
		page,
	}) => {
		await page.goto("/");
		// Badge should be discoverable by its locked text
		const badge = page.getByText("Landlord-only · Tenants never log in", {
			exact: true,
		});
		await expect(badge).toBeVisible();

		// Structural assertion: badge appears in DOM order BEFORE the first h1
		const allText = (await page.textContent("body")) ?? "";
		const badgeIdx = allText.indexOf("Landlord-only · Tenants never log in");
		const h1Text = (await page.locator("h1").first().textContent()) ?? "";
		const h1Idx = allText.indexOf(h1Text.trim().slice(0, 20));
		expect(badgeIdx).toBeGreaterThanOrEqual(0);
		expect(h1Idx).toBeGreaterThan(badgeIdx);
	});

	test("Mobile 375px: badge fits in viewport without horizontal scroll", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");
		await expect(
			page.getByText("Landlord-only · Tenants never log in", { exact: true }),
		).toBeVisible();
		const scrollWidth = await page.evaluate(
			() => document.documentElement.scrollWidth,
		);
		const clientWidth = await page.evaluate(
			() => document.documentElement.clientWidth,
		);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
	});
});

test.describe("Persona consistency — about page (CONS-01)", () => {
	test('About page contains zero "property managers" body-text occurrences', async ({
		page,
	}) => {
		await page.goto("/about");
		const body = (await page.textContent("body")) ?? "";
		expect(body).not.toMatch(/property managers?\b/i);
	});

	test('About page hero contains "landlords"', async ({ page }) => {
		await page.goto("/about");
		const body = (await page.textContent("body")) ?? "";
		expect(body).toMatch(/landlords?/i);
	});
});

test.describe("Persona consistency — pricing page (COPY-02)", () => {
	test("Featured pricing card shows segment-framing badge", async ({
		page,
	}) => {
		await page.goto("/pricing");
		const body = (await page.textContent("body")) ?? "";
		// PR #725 renamed the hardcoded "1–15 rentals" badge to a
		// per-plan `audienceTagline` field in `#config/pricing`. The
		// featured slot renders Growth's tagline ("Built for 6–20 unit
		// portfolios"); Starter and Max use their own. Test still pins
		// segment-framing presence — just on the new shape.
		expect(body).toContain("Built for 6–20 unit portfolios");
	});

	test("Pricing page metadata description references landlords", async ({
		page,
	}) => {
		await page.goto("/pricing");
		const description = await page
			.locator('meta[name="description"]')
			.getAttribute("content");
		expect(description).toMatch(/landlords/i);
	});
});

test.describe("Persona consistency — compare pages (CONS-01)", () => {
	for (const slug of ["buildium", "appfolio", "rentredi"]) {
		test(`/compare/${slug} hero contains "landlords"`, async ({ page }) => {
			await page.goto(`/compare/${slug}`);
			const body = (await page.textContent("body")) ?? "";
			expect(body).toMatch(/landlords?/i);
		});
	}

	test("/compare/buildium preserves Buildium audience descriptor (carve-out)", async ({
		page,
	}) => {
		await page.goto("/compare/buildium");
		const body = (await page.textContent("body")) ?? "";
		expect(body).toContain("Small to mid-sized property managers");
	});
});

test.describe("Persona consistency — DocuSeal de-amp (COPY-04, Wave 2)", () => {
	// COPY-04 audits VISIBLE marketing copy, not the SoftwareApplication
	// JSON-LD `featureList` (KEEP-AS-INFRASTRUCTURE per 04-RESEARCH.md) and
	// not the Next.js RSC streaming payload — both are <script> content. Use
	// innerText (visible text only) to count user-facing mentions.
	test("Site-wide DocuSeal mention count ≤ 15 across all public marketing pages combined", async ({
		page,
	}) => {
		let totalMentions = 0;
		for (const path of PUBLIC_PATHS) {
			await page.goto(path);
			const visible = await page.locator("body").innerText();
			totalMentions += (visible.match(/DocuSeal/g) ?? []).length;
		}
		// Threshold accounts for: pricing.ts feature lists × 2 plans, comparison-table row,
		// /faq strategic entry, logo-cloud wordmark (renders on / and /features),
		// features-client.tsx integrations subtitle, login + confirm-email HERO_STATS.
		// Calibrate down after first run if budget allows.
		expect(totalMentions).toBeLessThanOrEqual(15);
	});

	test("/about renders zero visible DocuSeal mentions", async ({ page }) => {
		await page.goto("/about");
		const visible = await page.locator("body").innerText();
		expect((visible.match(/DocuSeal/g) ?? []).length).toBe(0);
	});

	test("/pricing renders ≤ 3 visible DocuSeal mentions (strategic surfaces only)", async ({
		page,
	}) => {
		await page.goto("/pricing");
		const visible = await page.locator("body").innerText();
		expect((visible.match(/DocuSeal/g) ?? []).length).toBeLessThanOrEqual(3);
	});
});

test.describe("Persona consistency — FAQ canon (COPY-05, Wave 2)", () => {
	test('Homepage FAQ does NOT contain "Is my data secure?"', async ({
		page,
	}) => {
		await page.goto("/");
		const body = (await page.textContent("body")) ?? "";
		expect(body).not.toMatch(/Is my data secure\?/i);
	});

	test('Pricing FAQ does NOT contain "How does the 14-day free trial work?"', async ({
		page,
	}) => {
		await page.goto("/pricing");
		const body = (await page.textContent("body")) ?? "";
		expect(body).not.toMatch(/How does the 14-day free trial work\?/i);
	});

	test('Pricing-FAQ footer links to /faq with "View all FAQs"', async ({
		page,
	}) => {
		await page.goto("/pricing");
		const link = page.getByRole("link", { name: /view all faqs/i });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute("href", "/faq");
	});
});

test.describe("Persona consistency — bulk-zip softening (COPY-06, Wave 2)", () => {
	test('Homepage contains "Tax-season zip exports" or "Tax-Season Bulk Zip"', async ({
		page,
	}) => {
		await page.goto("/");
		// Marketing-home wraps StatsShowcase, HowItWorks and FeaturesSection in
		// <LazySection> (IntersectionObserver-gated). Scroll to bottom so each
		// section enters the viewport and renders its bulk-zip copy into the DOM.
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForLoadState("networkidle");
		const body = (await page.textContent("body")) ?? "";
		expect(body).toMatch(/Tax-[Ss]eason ([Bb]ulk [Zz]ip|zip exports?)/);
	});

	test('No "500 / request" technical jargon on any public page', async ({
		page,
	}) => {
		for (const path of PUBLIC_PATHS) {
			await page.goto(path);
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await page.waitForLoadState("networkidle");
			const body = (await page.textContent("body")) ?? "";
			expect(body, `path: ${path}`).not.toMatch(/500\s*\/\s*request/);
		}
	});
});
