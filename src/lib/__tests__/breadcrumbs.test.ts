/**
 * Breadcrumbs utility tests
 *
 * Tests the generateBreadcrumbs function that converts
 * pathname strings into breadcrumb items for navigation.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

	// Phase 65 (DOCS-01, D-07). Each case asserts the FULL crumb array rather than
	// just the leaf: the middle crumb is where the L-06 omission shows up, so
	// pinning it makes that decision visible in the test output.
	describe("documents sub-routes (Phase 65)", () => {
		it("should label the four printable template slugs", () => {
			const testCases = [
				{ slug: "rental-application", expected: "Rental Application" },
				{ slug: "property-inspection", expected: "Property Inspection" },
				{ slug: "maintenance-request", expected: "Maintenance Request" },
				{ slug: "tenant-notice", expected: "Tenant Notice" },
			];

			for (const { slug, expected } of testCases) {
				expect(generateBreadcrumbs(`/documents/templates/${slug}`)).toEqual([
					{ href: "/documents", label: "Documents" },
					// L-06: no LABEL_MAP entry — this resolves via the capitalize
					// fallback, which already yields "Templates". The empty href is
					// NON_ROUTABLE_SEGMENTS: /documents/templates has no page.tsx, and
					// app-shell-header renders `crumb.href ? <Link> : <span>`, so an
					// empty href is what keeps this crumb from linking to a 404.
					{ href: "", label: "Templates" },
					{ href: `/documents/templates/${slug}`, label: expected },
				]);
			}
		});

		// CR-02. Phase 65's Band 3 is the first surface in the app to link the four
		// printable templates, so it is the first phase in which this middle crumb
		// is reachable at all. Asserted as its own case, separately from the label
		// test above, so a future edit that restores `currentPath` here fails with
		// "links to a 404" rather than looking like a label regression.
		it("emits the templates crumb as non-navigable, not as a link to a 404", () => {
			const [, middle] = generateBreadcrumbs(
				"/documents/templates/tenant-notice",
			);
			expect(middle).toEqual({ href: "", label: "Templates" });
			expect(middle?.href).not.toBe("/documents/templates");
		});

		// The paired non-vacuity check: a sibling segment with a real page.tsx must
		// still get a real href, or the assertion above would pass against a
		// generateBreadcrumbs that returned "" for everything.
		it("still emits a real href for segments that do have a route", () => {
			expect(generateBreadcrumbs("/documents/vault")[1]).toEqual({
				href: "/documents/vault",
				label: "Vault",
			});
		});

		// This one PASSES today via the capitalize fallback. It is added for D-07
		// coverage of a real route, not because it changes behaviour — stated
		// explicitly so the suite does not imply coverage it did not add.
		it("should label the vault route", () => {
			expect(generateBreadcrumbs("/documents/vault")).toEqual([
				{ href: "/documents", label: "Documents" },
				{ href: "/documents/vault", label: "Vault" },
			]);
		});
	});

	// UF-01 from the phase-65 security audit. generateBreadcrumbs takes raw URL
	// segments, and LABEL_MAP is a plain object literal carrying Object.prototype.
	// `/properties/__proto__` matches `properties/[id]/page.tsx` and is not a UUID,
	// so a bare `LABEL_MAP[segment]` read resolved Object.prototype into a slot
	// typed `: string`. React refuses to render an object as a child, so a crafted
	// URL took down the owner shell header. `constructor` and `toString` resolve to
	// functions the same way.
	describe("prototype-chain segments cannot escape the string contract", () => {
		it.each([
			"__proto__",
			"constructor",
			"toString",
			"valueOf",
			"hasOwnProperty",
		])("returns a string label for the segment %s", (segment) => {
			const crumbs = generateBreadcrumbs(`/properties/${segment}`);
			const leaf = crumbs[crumbs.length - 1];
			expect(typeof leaf?.label).toBe("string");
			expect(leaf?.label).not.toContain("[object Object]");
			expect(leaf?.label).not.toContain("native code");
		});

		// Non-vacuity: a real mapped segment must still resolve through LABEL_MAP,
		// or the guard above would pass against a function that ignored the map.
		it("still resolves genuine LABEL_MAP entries", () => {
			expect(generateBreadcrumbs("/properties")[0]).toEqual({
				href: "/properties",
				label: "Properties",
			});
		});
	});

	describe("Phase 65 L-06: the templates label is deliberately absent", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/breadcrumbs.ts"),
			"utf8",
		);

		// Anchored on `^\s*templates:\s*"` rather than a bare includes(): the loose
		// form would match the four "…-template…"-shaped keys and the route strings.
		it("does not map the templates segment", () => {
			expect(/^\s*templates:\s*"/m.test(source)).toBe(false);
		});

		// The paired positive — without it the assertion above passes against an
		// emptied file.
		it("does map the five keys that were added", () => {
			for (const key of [
				"vault",
				"rental-application",
				"property-inspection",
				"maintenance-request",
				"tenant-notice",
			]) {
				expect(new RegExp(`^\\s*"?${key}"?:\\s*"`, "m").test(source)).toBe(
					true,
				);
			}
		});

		// The CONDITION for the omission: /documents/templates has no page.tsx, so
		// that crumb is a live 404 and the map declines to bless it. If the route
		// ever ships, this fails and forces the label decision to be revisited
		// rather than silently inherited. That coupling is the point of the guard.
		it("omits the label only because the route does not exist", () => {
			expect(
				existsSync(
					join(process.cwd(), "src/app/(owner)/documents/templates/page.tsx"),
				),
			).toBe(false);
		});

		// The same condition governs NON_ROUTABLE_SEGMENTS (CR-02). Pinned on the
		// source so that shipping templates/page.tsx forces BOTH decisions — the
		// label and the non-navigability — to be revisited together.
		it("marks templates non-routable for the same reason", () => {
			expect(
				/NON_ROUTABLE_SEGMENTS\s*=\s*new Set\(\["templates"\]\)/.test(source),
			).toBe(true);
		});
	});
});
