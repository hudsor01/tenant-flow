import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_CATEGORY_LABELS,
	DEFAULT_CATEGORY_SLUGS,
	documentCategorySlugSchema,
	makeCategorySchema,
} from "../documents";

describe("documentCategorySlugSchema", () => {
	it("accepts every default slug", () => {
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(documentCategorySlugSchema.safeParse(slug).success).toBe(true);
		}
	});

	it("accepts arbitrary lowercase-snake_case slugs (Phase 65: any-slug shape)", () => {
		expect(documentCategorySlugSchema.safeParse("warranty").success).toBe(true);
		expect(
			documentCategorySlugSchema.safeParse("home_office_2024").success,
		).toBe(true);
	});

	it("rejects malformed slugs", () => {
		expect(documentCategorySlugSchema.safeParse("LEASE").success).toBe(false);
		expect(documentCategorySlugSchema.safeParse("lease 1").success).toBe(false);
		expect(documentCategorySlugSchema.safeParse("lease-1").success).toBe(false);
		expect(documentCategorySlugSchema.safeParse("").success).toBe(false);
		expect(documentCategorySlugSchema.safeParse("a".repeat(51)).success).toBe(
			false,
		);
		expect(documentCategorySlugSchema.safeParse(null).success).toBe(false);
		expect(documentCategorySlugSchema.safeParse(undefined).success).toBe(false);
	});

	it("exposes a label for every default slug", () => {
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(DEFAULT_CATEGORY_LABELS[slug]).toBeTruthy();
			expect(typeof DEFAULT_CATEGORY_LABELS[slug]).toBe("string");
		}
	});

	it("default slug list matches the seed function in migration 20260427023101", () => {
		// If you change DEFAULT_CATEGORY_SLUGS, ALSO update the seed function —
		// otherwise new owners get the wrong starter set.
		expect([...DEFAULT_CATEGORY_SLUGS]).toEqual([
			"lease",
			"receipt",
			"tax_return",
			"inspection_report",
			"maintenance_invoice",
			"insurance",
			"other",
		]);
	});

	it("migration seed function is in lockstep with DEFAULT_CATEGORY_SLUGS", () => {
		// The seed function inserts the seven defaults via VALUES tuples.
		// This regex pulls those slug literals and asserts they match
		// DEFAULT_CATEGORY_SLUGS — closes the three-source-of-truth gap
		// (table seed, default labels constant, new-user trigger).
		//
		// Source-of-truth file changed from the Phase-65 migration to the
		// single prod baseline after issue #749's chain reset (the
		// per-phase migration files were collapsed into one baseline).
		const migrationSql = readFileSync(
			"supabase/migrations/20260528161124_baseline_from_prod.sql",
			"utf8",
		);
		// Anchor on the CREATE OR REPLACE FUNCTION header so the lazy
		// match doesn't latch onto the `perform` call inside the new-user
		// trigger (which appears earlier alphabetically in the baseline
		// file than the seed function's own definition).
		const seedFn = migrationSql.match(
			/CREATE OR REPLACE FUNCTION public\.seed_default_document_categories[\s\S]*?on conflict/i,
		)?.[0];
		expect(seedFn, "seed function block not found").toBeDefined();
		const slugSet = new Set(
			Array.from(seedFn!.matchAll(/'([a-z_]+)'/g)).map((m) => m[1] as string),
		);
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(
				slugSet.has(slug),
				`slug '${slug}' missing from seed function`,
			).toBe(true);
		}
	});
});

describe("makeCategorySchema", () => {
	it("returns a runtime enum gating against the allowed set", () => {
		const schema = makeCategorySchema(["lease", "insurance"]);
		expect(schema.safeParse("lease").success).toBe(true);
		expect(schema.safeParse("insurance").success).toBe(true);
		expect(schema.safeParse("warranty").success).toBe(false);
	});

	it("falls through to the any-slug shape when the allowed list is empty", () => {
		// Loading-state callers shouldn't false-reject every value while
		// the categories query is still in flight.
		const schema = makeCategorySchema([]);
		expect(schema.safeParse("lease").success).toBe(true);
		expect(schema.safeParse("warranty").success).toBe(true);
		// But malformed slugs still fail through documentCategorySlugSchema.
		expect(schema.safeParse("LEASE").success).toBe(false);
		expect(schema.safeParse("").success).toBe(false);
	});
});
