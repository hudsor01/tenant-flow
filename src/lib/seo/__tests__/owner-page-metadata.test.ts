/**
 * ownerPageMetadata helper tests.
 *
 * Pins the canonical contract after PR #727 (Session 14 P1 fix):
 * the " | TenantFlow" suffix is baked into ALL THREE title fields
 * (document title, openGraph.title, twitter.title) directly by the
 * helper. The parent (owner)/layout.tsx no longer sets any title
 * template, so there's no propagation/double-application surface.
 *
 * History of the rule changes that landed here:
 *   - PR #724/#725 relied on Next.js title.template propagation
 *     from the (owner) parent. Broke on deep leaves (intermediate
 *     shallow-merge clobbered the openGraph object) and required
 *     the helper to bake suffix only into og/twitter (PR #726).
 *   - PR #726's bake created a double-suffix on direct children of
 *     (owner) because the parent template still applied to the
 *     already-suffixed child string. And the document title still
 *     missed deep leaves because Next.js title.template only
 *     propagates one level (intermediate plain-string titles don't
 *     re-export it).
 *   - PR #727 removes templates entirely and bakes into all three
 *     fields. Tests here pin that.
 */

import { describe, expect, it } from "vitest";
import { ownerPageMetadata } from "../owner-page-metadata";

describe("ownerPageMetadata", () => {
	it("bakes ' | TenantFlow' suffix into the document title", () => {
		const meta = ownerPageMetadata("Income Statement");
		expect(meta.title).toBe("Income Statement | TenantFlow");
	});

	it("bakes ' | TenantFlow' suffix into openGraph.title and twitter.title", () => {
		const meta = ownerPageMetadata("Income Statement");
		expect(meta.openGraph).toMatchObject({
			title: "Income Statement | TenantFlow",
		});
		expect(meta.twitter).toMatchObject({
			title: "Income Statement | TenantFlow",
		});
	});

	it("produces the SAME suffixed title across all three fields (no drift)", () => {
		// Regression guard against the PR #726 era where doc title was
		// plain and og/twitter were suffixed (different sources of truth).
		const meta = ownerPageMetadata("Dashboard");
		const og = meta.openGraph as { title?: unknown };
		const tw = meta.twitter as { title?: unknown };
		expect(meta.title).toBe(og.title);
		expect(meta.title).toBe(tw.title);
	});

	it("omits description fields entirely when no description arg is provided", () => {
		const meta = ownerPageMetadata("Income Statement");
		expect(meta.description).toBeUndefined();
		expect(meta.openGraph).not.toHaveProperty("description");
		expect(meta.twitter).not.toHaveProperty("description");
	});

	it("propagates description into top-level + openGraph + twitter when provided", () => {
		// PR #725 cycle-2 fix: the original refactor dropped per-route
		// description strings on 10 layouts (dashboard, settings, etc.).
		// The helper restores them in all three metadata surfaces.
		const meta = ownerPageMetadata(
			"Dashboard",
			"Overview of your property portfolio, revenue, and activity",
		);
		expect(meta.description).toBe(
			"Overview of your property portfolio, revenue, and activity",
		);
		expect(meta.openGraph).toMatchObject({
			title: "Dashboard | TenantFlow",
			description: "Overview of your property portfolio, revenue, and activity",
		});
		expect(meta.twitter).toMatchObject({
			title: "Dashboard | TenantFlow",
			description: "Overview of your property portfolio, revenue, and activity",
		});
	});

	it("handles a title that already contains characters Next.js might escape", () => {
		// Guards against future regression if someone tries to template-substitute
		// inside the title string. The helper does plain concatenation.
		const meta = ownerPageMetadata("Tax & Compliance");
		expect(meta.title).toBe("Tax & Compliance | TenantFlow");
		expect(meta.openGraph).toMatchObject({
			title: "Tax & Compliance | TenantFlow",
		});
	});
});
