/**
 * The Help Center's articles (2026-11-24 SEO audit HC1, HC7): distinct
 * slugs, a review date under a year old (each article's steps were traced
 * through the app on that date; re-trace and move it), and links that land.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, helpArticle } from "#app/help/help-articles";
import { parseLocalYmd } from "#lib/formatters/date";

const DAY_MS = 24 * 60 * 60 * 1000;
const FEATURE_DETAILS = readFileSync(
	join(process.cwd(), "src/components/landing/feature-details-section.tsx"),
	"utf8",
);

describe("help articles", () => {
	it("has distinct, URL-safe slugs", () => {
		const slugs = HELP_ARTICLES.map((article) => article.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	it.each(HELP_ARTICLES.map((a) => [a.slug, a] as const))(
		"%s was reviewed within the last year",
		(slug, article) => {
			const reviewed = parseLocalYmd(article.reviewedAt);
			expect(reviewed, `${slug}: reviewedAt must be YYYY-MM-DD`).toBeDefined();
			expect(article.publishedAt <= article.reviewedAt).toBe(true);
			const ageDays = (Date.now() - (reviewed?.getTime() ?? 0)) / DAY_MS;
			expect(ageDays).toBeGreaterThan(-1);
			expect(
				ageDays,
				`${slug}: re-trace its steps through the app, then move reviewedAt`,
			).toBeLessThanOrEqual(366);
		},
	);

	it.each(HELP_ARTICLES.map((a) => [a.slug, a] as const))(
		"%s links only to pages that exist",
		(_slug, article) => {
			for (const { href } of article.related) {
				if (href.startsWith("/help/")) {
					expect(helpArticle(href.slice("/help/".length))).toBeDefined();
				} else if (href.startsWith("/features#")) {
					expect(FEATURE_DETAILS).toContain(
						`id: "${href.slice("/features#".length)}"`,
					);
				} else {
					expect(href).toMatch(/^\/[a-z-]+(\/[a-z-]+)*$/);
				}
			}
		},
	);

	it("never links an article to itself", () => {
		for (const article of HELP_ARTICLES) {
			expect(article.related.map((link) => link.href)).not.toContain(
				`/help/${article.slug}`,
			);
		}
	});
});
