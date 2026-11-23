/**
 * Content Links Mapping Tests
 *
 * Tests for the static bidirectional slug mapping config used to
 * establish internal linking between blog, resource, and compare pages.
 * That each slug is published is tests/integration/content-links-slugs.test.ts.
 */

import { describe, expect, it } from "vitest";
import {
	BLOG_TO_COMPETITOR,
	BLOG_TO_RESOURCE,
	RESOURCE_TO_BLOGS,
} from "./content-links";

const INSPECTIONS_POST =
	"tenantflow-the-simple-way-to-run-move-in-and-move-out-inspections";
const TAX_SEASON_POST =
	"how-tenantflow-simplifies-tax-season-for-independent-landlords";
const RENT_LEDGER_POST =
	"how-tenantflow-s-rent-ledger-brings-order-to-your-rental-income";
const BUILDIUM_POST =
	"buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords";

describe("content-links", () => {
	describe("RESOURCE_TO_BLOGS", () => {
		it("lists the two resources that have a published post on their topic", () => {
			expect(Object.keys(RESOURCE_TO_BLOGS).sort()).toEqual([
				"landlord-tax-deduction-tracker",
				"seasonal-maintenance-checklist",
			]);
		});

		it("seasonal-maintenance-checklist maps to the inspections post", () => {
			expect(RESOURCE_TO_BLOGS["seasonal-maintenance-checklist"]).toEqual([
				INSPECTIONS_POST,
			]);
		});

		it("landlord-tax-deduction-tracker maps to the tax-season and rent-ledger posts", () => {
			expect(RESOURCE_TO_BLOGS["landlord-tax-deduction-tracker"]).toEqual([
				TAX_SEASON_POST,
				RENT_LEDGER_POST,
			]);
		});

		it("has no entry for the security deposit reference card", () => {
			expect(RESOURCE_TO_BLOGS).not.toHaveProperty(
				"security-deposit-reference-card",
			);
		});
	});

	describe("BLOG_TO_RESOURCE", () => {
		it("reverses RESOURCE_TO_BLOGS exactly", () => {
			expect(BLOG_TO_RESOURCE).toEqual({
				[INSPECTIONS_POST]: "seasonal-maintenance-checklist",
				[TAX_SEASON_POST]: "landlord-tax-deduction-tracker",
				[RENT_LEDGER_POST]: "landlord-tax-deduction-tracker",
			});
		});
	});

	describe("BLOG_TO_COMPETITOR", () => {
		it("maps only the Buildium comparison post, the one competitor with a published post", () => {
			expect(BLOG_TO_COMPETITOR).toEqual({ [BUILDIUM_POST]: "buildium" });
		});
	});
});
