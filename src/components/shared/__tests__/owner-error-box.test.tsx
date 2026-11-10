/**
 * @vitest-environment jsdom
 * One error box for the owner pages (66.2-39 fix round 4, G4). Five owner
 * pages kept their own copy of the box with a bare message paragraph: its base
 * `p` margin could not collapse past the p-6, so each box stood 40px below its
 * text against 24 above. /leases and /units had been fixed one at a time (and
 * /units differently: p-4, an unpadded title). Every one now renders
 * `OwnerErrorBox`, and the message carries no base margin.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnerErrorBox } from "#components/shared/owner-error-box";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";

const PAGES = [
	"src/app/(owner)/leases/page.tsx",
	"src/app/(owner)/leases/[id]/edit/page.tsx",
	"src/app/(owner)/maintenance/[id]/edit/page.tsx",
	"src/app/(owner)/properties/page.tsx",
	"src/app/(owner)/properties/[id]/edit/page.tsx",
	"src/app/(owner)/tenants/page.tsx",
	"src/app/(owner)/units/page.tsx",
];

describe("the owner error box", () => {
	it("renders its title and a message with no base paragraph margin", () => {
		render(
			<OwnerErrorBox
				title="Error Loading Leases"
				message="Failed to load leases"
			/>,
		);
		expect(
			screen.getByRole("heading", { level: 2, name: "Error Loading Leases" }),
		).toBeInTheDocument();
		const { neutralized, baseline } = computeParagraphCascade(
			screen.getByText("Failed to load leases"),
		);
		expect(baseline.marginBottom).toBe("16px");
		expect(neutralized.marginBottom).toBe("0px");
	});

	it("is the box every owner list and edit page renders on a failed load", () => {
		for (const page of PAGES) {
			const source = readFileSync(join(process.cwd(), page), "utf8");
			expect(source, page).toContain("<OwnerErrorBox");
			expect(source, page).not.toMatch(/bg-destructive\/10 p-[46]/);
		}
	});
});
