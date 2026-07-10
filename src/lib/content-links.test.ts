/**
 * Content Links Mapping Tests
 *
 * Tests for the static bidirectional slug mapping config used to
 * establish internal linking between blog, resource, and compare pages.
 *
 */

import { describe, expect, it } from "vitest";
import {
	BLOG_TO_COMPETITOR,
	BLOG_TO_RESOURCE,
	RESOURCE_TO_BLOGS,
} from "./content-links";

describe("content-links", () => {
	describe("RESOURCE_TO_BLOGS", () => {
		it("has exactly 3 keys", () => {
			expect(Object.keys(RESOURCE_TO_BLOGS)).toHaveLength(3);
		});

		it("has 'seasonal-maintenance-checklist' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty(
				"seasonal-maintenance-checklist",
			);
		});

		it("has 'landlord-tax-deduction-tracker' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty(
				"landlord-tax-deduction-tracker",
			);
		});

		it("has 'security-deposit-reference-card' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty(
				"security-deposit-reference-card",
			);
		});

		it("seasonal-maintenance-checklist maps to its 3 live maintenance slugs", () => {
			expect(RESOURCE_TO_BLOGS["seasonal-maintenance-checklist"]).toEqual([
				"twelve-month-preventive-maintenance-calendar-rentals",
				"spring-rental-maintenance-checklist",
				"fall-rental-maintenance-checklist",
			]);
		});

		it("landlord-tax-deduction-tracker maps to its 3 live tax-deduction slugs", () => {
			expect(RESOURCE_TO_BLOGS["landlord-tax-deduction-tracker"]).toEqual([
				"mortgage-interest-deduction-rental-property-schedule-e",
				"repairs-deduction-schedule-e-line-14",
				"legal-accounting-fees-landlord-deduction",
			]);
		});

		it("security-deposit-reference-card maps to its live security-deposit slug", () => {
			expect(RESOURCE_TO_BLOGS["security-deposit-reference-card"]).toEqual([
				"security-deposit-deadlines-and-caps-all-50-states",
			]);
		});
	});

	describe("BLOG_TO_RESOURCE", () => {
		it("has exactly 7 entries", () => {
			expect(Object.keys(BLOG_TO_RESOURCE)).toHaveLength(7);
		});

		it("maps every seasonal-maintenance slug to 'seasonal-maintenance-checklist'", () => {
			expect(
				BLOG_TO_RESOURCE[
					"twelve-month-preventive-maintenance-calendar-rentals"
				],
			).toBe("seasonal-maintenance-checklist");
			expect(BLOG_TO_RESOURCE["spring-rental-maintenance-checklist"]).toBe(
				"seasonal-maintenance-checklist",
			);
			expect(BLOG_TO_RESOURCE["fall-rental-maintenance-checklist"]).toBe(
				"seasonal-maintenance-checklist",
			);
		});

		it("maps every tax-deduction slug to 'landlord-tax-deduction-tracker'", () => {
			expect(
				BLOG_TO_RESOURCE[
					"mortgage-interest-deduction-rental-property-schedule-e"
				],
			).toBe("landlord-tax-deduction-tracker");
			expect(BLOG_TO_RESOURCE["repairs-deduction-schedule-e-line-14"]).toBe(
				"landlord-tax-deduction-tracker",
			);
			expect(BLOG_TO_RESOURCE["legal-accounting-fees-landlord-deduction"]).toBe(
				"landlord-tax-deduction-tracker",
			);
		});

		it("maps the security-deposit slug to 'security-deposit-reference-card'", () => {
			expect(
				BLOG_TO_RESOURCE["security-deposit-deadlines-and-caps-all-50-states"],
			).toBe("security-deposit-reference-card");
		});
	});

	describe("BLOG_TO_COMPETITOR", () => {
		it("has exactly 3 entries", () => {
			expect(Object.keys(BLOG_TO_COMPETITOR)).toHaveLength(3);
		});

		it("maps 'buildium-vs-doorloop-vs-tenantflow-2026' to 'buildium'", () => {
			expect(
				BLOG_TO_COMPETITOR["buildium-vs-doorloop-vs-tenantflow-2026"],
			).toBe("buildium");
		});

		it("maps the appfolio-alternatives slug to 'appfolio'", () => {
			expect(
				BLOG_TO_COMPETITOR[
					"appfolio-alternatives-under-25-month-for-first-time-landlords"
				],
			).toBe("appfolio");
		});

		it("maps the rentredi-alternatives slug to 'rentredi'", () => {
			expect(
				BLOG_TO_COMPETITOR[
					"rentredi-alternatives-under-30-month-for-budget-conscious-landlords"
				],
			).toBe("rentredi");
		});
	});
});
