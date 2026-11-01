/**
 * LoadingSpinner text sizes (D-30, C12d).
 *
 * The size variants used to set `text-(--font-*)` classes over variables no
 * stylesheet declares, so the text fell back to the inherited size, and the
 * project `cn` stripped them next to the color variant. Each size now uses a
 * theme font size with the `/normal` line-height modifier: tailwind-merge
 * drops a separate line-height class next to a font size, so the modifier is
 * what keeps the authored 1.5 line-height.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSpinner } from "#components/ui/loading-spinner";

const TEXT = "Loading units";

const SIZE_CLASSES = [
	["sm", "text-xs/normal"],
	["default", "text-sm/normal"],
	["lg", "text-base/normal"],
	["xl", "text-lg/normal"],
] as const;

function textClasses(): string[] {
	return (screen.getByText(TEXT).getAttribute("class") ?? "").split(/\s+/);
}

describe("LoadingSpinner text sizes come from the theme (D-30, C12d)", () => {
	it.each(SIZE_CLASSES)(
		"size %s renders %s after the cn merge",
		(size, expected) => {
			render(<LoadingSpinner size={size} text={TEXT} />);
			const classes = textClasses();
			expect(classes).toContain(expected);
			expect(
				classes.filter((cls) => /^text-(xs|sm|base|lg)(\/|$)/.test(cls)),
			).toEqual([expected]);
			expect(classes.filter((cls) => cls.includes("--font-"))).toEqual([]);
			expect(classes.filter((cls) => /^leading-/.test(cls))).toEqual([]);
		},
	);

	it("keeps the size class next to the primary color variant", () => {
		render(<LoadingSpinner size="lg" variant="primary" text={TEXT} />);
		const classes = textClasses();
		expect(classes).toContain("text-base/normal");
		expect(classes).toContain("text-accent-main");
	});

	it("renders no text paragraph without text, and still renders the icon", () => {
		const { container } = render(<LoadingSpinner size="lg" />);
		expect(container.querySelector("p")).toBeNull();
		const icon = container.querySelector("svg");
		expect(icon).not.toBeNull();
		expect((icon?.getAttribute("class") ?? "").split(/\s+/)).toContain(
			"size-8",
		);
	});
});
