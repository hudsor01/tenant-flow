/**
 * Breadcrumbs utility tests
 *
 * Tests the generateBreadcrumbs function that converts
 * pathname strings into breadcrumb items for navigation.
 */

import { describe, expect, it } from "vitest";
import { generateBreadcrumbs } from "../breadcrumbs";

describe("generateBreadcrumbs", () => {
	describe("basic path handling", () => {
		it("should return empty array for root path", () => {
			const result = generateBreadcrumbs("/");
			expect(result).toEqual([]);
		});

		it("should generate single breadcrumb for top-level path", () => {
			const result = generateBreadcrumbs("/dashboard");
			expect(result).toEqual([{ href: "/dashboard", label: "Dashboard" }]);
		});

		it("should generate multiple breadcrumbs for nested path", () => {
			const result = generateBreadcrumbs("/properties/new");
			expect(result).toEqual([
				{ href: "/properties", label: "Properties" },
				{ href: "/properties/new", label: "Create New" },
			]);
		});
	});

	describe("label mapping", () => {
		it("should map known route segments to labels", () => {
			const testCases = [
				{ path: "/dashboard", expected: "Dashboard" },
				{ path: "/properties", expected: "Properties" },
				{ path: "/tenants", expected: "Tenants" },
				{ path: "/units", expected: "Units" },
				{ path: "/leases", expected: "Leases" },
				{ path: "/maintenance", expected: "Maintenance" },
				{ path: "/analytics", expected: "Analytics" },
				{ path: "/reports", expected: "Reports" },
				{ path: "/settings", expected: "Settings" },
			];

			for (const { path, expected } of testCases) {
				const result = generateBreadcrumbs(path);
				expect(result[0]?.label).toBe(expected);
			}
		});

		it("should map analytics sub-routes correctly", () => {
			const result = generateBreadcrumbs("/analytics/property-performance");
			expect(result).toEqual([
				{ href: "/analytics", label: "Analytics" },
				{
					href: "/analytics/property-performance",
					label: "Property Performance",
				},
			]);
		});

		// D-29: the statement routes are hub sub-routes now, so every one of them
		// resolves under the `Reports` parent rather than a separate section.
		it("should map reports hub routes correctly", () => {
			const testCases = [
				{
					path: "/reports/income-statement",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/income-statement", label: "Income Statement" },
					],
				},
				{
					path: "/reports/cash-flow",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/cash-flow", label: "Cash Flow" },
					],
				},
				{
					path: "/reports/balance-sheet",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/balance-sheet", label: "Balance Sheet" },
					],
				},
				{
					path: "/reports/expenses",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/expenses", label: "Expenses" },
					],
				},
				{
					path: "/reports/tax-documents",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/tax-documents", label: "Tax Documents" },
					],
				},
				{
					path: "/reports/year-end",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/year-end", label: "Year-End" },
					],
				},
				{
					path: "/reports/generate",
					expected: [
						{ href: "/reports", label: "Reports" },
						{ href: "/reports/generate", label: "Generate" },
					],
				},
			];

			for (const { path, expected } of testCases) {
				const result = generateBreadcrumbs(path);
				expect(result).toEqual(expected);
			}
		});

		// /analytics/financial stays live under full separation, so BOTH segments
		// must keep resolving to real labels rather than falling through to the
		// capitalize-the-slug default.
		it("should still map the live /analytics/financial route", () => {
			expect(generateBreadcrumbs("/analytics/financial")).toEqual([
				{ href: "/analytics", label: "Analytics" },
				{ href: "/analytics/financial", label: "Financial" },
			]);
		});

		it("should capitalize unknown segments", () => {
			const result = generateBreadcrumbs("/custom/unknown-route");
			expect(result).toEqual([
				{ href: "/custom", label: "Custom" },
				{ href: "/custom/unknown-route", label: "Unknown-route" },
			]);
		});
	});

	describe("UUID handling", () => {
		it('should detect UUID segments and use "Details" label', () => {
			const uuid = "550e8400-e29b-41d4-a716-446655440000";
			const result = generateBreadcrumbs(`/properties/${uuid}`);
			expect(result).toEqual([
				{ href: "/properties", label: "Properties" },
				{ href: `/properties/${uuid}`, label: "Properties Details" },
			]);
		});

		it("should handle UUID in nested paths", () => {
			const uuid = "550e8400-e29b-41d4-a716-446655440000";
			const result = generateBreadcrumbs(`/tenants/${uuid}/edit`);
			expect(result).toEqual([
				{ href: "/tenants", label: "Tenants" },
				{ href: `/tenants/${uuid}`, label: "Tenants Details" },
				{ href: `/tenants/${uuid}/edit`, label: "Edit" },
			]);
		});

		it("should detect lowercase UUIDs", () => {
			const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
			const result = generateBreadcrumbs(`/leases/${uuid}`);
			expect(result[1]?.label).toBe("Leases Details");
		});

		it("should detect uppercase UUIDs", () => {
			const uuid = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
			const result = generateBreadcrumbs(`/leases/${uuid}`);
			expect(result[1]?.label).toBe("Leases Details");
		});

		it("should not treat non-UUID strings as UUIDs", () => {
			const result = generateBreadcrumbs("/properties/new");
			expect(result[1]?.label).toBe("Create New");
		});
	});

	describe("edge cases", () => {
		it("should handle trailing slashes", () => {
			// Filter(Boolean) removes empty strings from split
			const result = generateBreadcrumbs("/dashboard/");
			expect(result).toEqual([{ href: "/dashboard", label: "Dashboard" }]);
		});

		it("should handle deep nesting", () => {
			const result = generateBreadcrumbs(
				"/analytics/property-performance/overview",
			);
			expect(result.length).toBe(3);
			expect(result[2]?.label).toBe("Overview");
		});

		it("should handle documents routes", () => {
			const result = generateBreadcrumbs("/documents/lease-template");
			expect(result).toEqual([
				{ href: "/documents", label: "Documents" },
				{ href: "/documents/lease-template", label: "Lease Template" },
			]);
		});
	});
});
