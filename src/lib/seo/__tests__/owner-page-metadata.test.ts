/**
 * ownerPageMetadata helper tests.
 *
 * Pins the contract added in PR #725 (cycle-1 review of P1 og:title
 * template) and PR #726 (Session 13 P2 — bake the " | TenantFlow"
 * suffix into the helper output so deep (owner) sub-route layouts
 * get the full title without depending on parent template merge,
 * which intermediate layouts clobber via shallow merge).
 */

import { describe, expect, it } from "vitest";
import { ownerPageMetadata } from "../owner-page-metadata";

describe("ownerPageMetadata", () => {
	it("sets the plain page title on the document title field", () => {
		// The root `(owner)/layout.tsx` declares `title.template = "%s | TenantFlow"`,
		// which Next.js handles specially for top-level `title` — it propagates
		// across the metadata merge. So child layouts pass just the page name.
		const meta = ownerPageMetadata("Income Statement");
		expect(meta.title).toBe("Income Statement");
	});

	it("bakes ' | TenantFlow' suffix into openGraph.title and twitter.title", () => {
		// PR #726 P2 fix: intermediate layouts setting `openGraph: { title: "X" }`
		// shallow-replace the parent's entire openGraph object, including its
		// title.template. The helper now writes a complete ogTitle string so
		// deep leaves don't depend on template propagation working through
		// shallow merge.
		const meta = ownerPageMetadata("Income Statement");
		expect(meta.openGraph).toMatchObject({
			title: "Income Statement | TenantFlow",
		});
		expect(meta.twitter).toMatchObject({
			title: "Income Statement | TenantFlow",
		});
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
		expect(meta.title).toBe("Tax & Compliance");
		expect(meta.openGraph).toMatchObject({
			title: "Tax & Compliance | TenantFlow",
		});
	});
});
