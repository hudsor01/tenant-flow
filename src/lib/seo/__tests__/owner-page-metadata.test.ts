/**
 * ownerPageMetadata helper tests.
 *
 * Pins the canonical contract after PR #727 cycle-1 review:
 *   - meta.title is `{ absolute: "X | TenantFlow" }`. The `.absolute`
 *     form opts out of every ancestor title.template — required
 *     because the ROOT app/layout (via generateSiteMetadata) still
 *     has `title.template = "%s | TenantFlow"`, which would
 *     otherwise apply to a plain-string child title and produce
 *     "X | TenantFlow | TenantFlow" in the browser tab.
 *   - openGraph.title and twitter.title are plain strings. (owner)/
 *     layout.tsx no longer sets openGraph.title.template or
 *     twitter.title.template, and no ancestor template exists for
 *     those fields, so the plain string is what users see.
 *
 * History:
 *   - PR #724/#725: relied on title.template propagation. Broke
 *     on deep leaves.
 *   - PR #726: baked suffix into og/twitter only. Created double-
 *     suffix on direct children of (owner) (parent template applied
 *     to already-suffixed string) and still missed doc-title suffix
 *     on deep leaves.
 *   - PR #727 (this): removed (owner)'s openGraph/twitter templates;
 *     baked suffix into all 3 fields; uses title.absolute to opt
 *     out of the root title.template that still applies to the
 *     document <title>.
 */

import { describe, expect, it } from "vitest";
import { ownerPageMetadata } from "../owner-page-metadata";

// Narrow accessor for the title.absolute form. Next.js's Metadata
// type is intentionally loose; this helper hides the cast surface.
function readDocTitle(title: unknown): string | undefined {
	if (typeof title === "string") return title;
	if (title && typeof title === "object" && "absolute" in title) {
		const candidate = (title as { absolute?: unknown }).absolute;
		return typeof candidate === "string" ? candidate : undefined;
	}
	return undefined;
}

describe("ownerPageMetadata", () => {
	it("bakes ' | TenantFlow' suffix into the document title (via title.absolute)", () => {
		const meta = ownerPageMetadata("Income Statement");
		expect(readDocTitle(meta.title)).toBe("Income Statement | TenantFlow");
	});

	it("uses title.absolute form (opts out of ancestor title.template)", () => {
		// Regression guard: PR #727 cycle-1 review caught that a
		// plain-string `title` lets the ROOT app/layout title.template
		// apply on top, producing a double-suffix. .absolute opts out.
		const meta = ownerPageMetadata("Dashboard");
		expect(meta.title).toEqual({ absolute: "Dashboard | TenantFlow" });
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
		expect(readDocTitle(meta.title)).toBe(og.title);
		expect(readDocTitle(meta.title)).toBe(tw.title);
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
		expect(readDocTitle(meta.title)).toBe("Tax & Compliance | TenantFlow");
		expect(meta.openGraph).toMatchObject({
			title: "Tax & Compliance | TenantFlow",
		});
	});
});
