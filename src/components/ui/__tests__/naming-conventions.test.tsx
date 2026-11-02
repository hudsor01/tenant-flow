/**
 * Button contract tests
 *
 * Pins the shadcn new-york-v4 Button contract (D-29): the data-slot,
 * data-variant and data-size attributes, the base and icon classes, the 3px
 * focus ring, the aria-invalid ring, the variant surfaces and asChild through
 * Slot.Root. It also pins the local customizations the file keeps (D-26):
 * typography-small, the 44px touch floor with the h-10/h-9/h-11 heights,
 * text-destructive-foreground and the text-primary-text link color.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cn } from "#lib/utils";
import { render } from "#test/utils/test-render";
import { Button } from "../button";

const DEFAULT_BUTTON_CLASSES = [
	"inline-flex",
	"shrink-0",
	"items-center",
	"justify-center",
	"gap-2",
	"rounded-md",
	"typography-small",
	"whitespace-nowrap",
	"transition-all",
	"outline-none",
	"focus-visible:border-ring",
	"focus-visible:ring-[3px]",
	"focus-visible:ring-ring/50",
	"disabled:pointer-events-none",
	"disabled:opacity-50",
	"aria-invalid:border-destructive",
	"aria-invalid:ring-destructive/20",
	"dark:aria-invalid:ring-destructive/40",
	"[&_svg]:pointer-events-none",
	"[&_svg]:shrink-0",
	"[&_svg:not([class*='size-'])]:size-4",
	"bg-primary",
	"text-primary-foreground",
	"hover:bg-primary-text",
	"dark:hover:bg-primary/90",
	"h-10",
	"px-4",
	"py-2",
	"min-h-11",
];

describe("Button v4 contract (D-29)", () => {
	describe("data attributes", () => {
		it("renders data-slot, data-variant and data-size with the defaults", () => {
			render(<Button>Click me</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveAttribute("data-slot", "button");
			expect(button).toHaveAttribute("data-variant", "default");
			expect(button).toHaveAttribute("data-size", "default");
		});

		it("reflects the variant and size props", () => {
			render(
				<Button variant="outline" size="lg">
					Large outline
				</Button>,
			);
			const button = screen.getByRole("button");

			expect(button).toHaveAttribute("data-slot", "button");
			expect(button).toHaveAttribute("data-variant", "outline");
			expect(button).toHaveAttribute("data-size", "lg");
		});

		it("marks the icon size", () => {
			render(<Button size="icon" aria-label="Close" />);
			const button = screen.getByRole("button", { name: "Close" });

			expect(button).toHaveAttribute("data-size", "icon");
		});
	});

	describe("base and icon classes", () => {
		it("carries the upstream base with typography-small in place of text-sm font-medium", () => {
			render(<Button>Button</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"inline-flex",
				"shrink-0",
				"items-center",
				"justify-center",
				"gap-2",
				"whitespace-nowrap",
				"rounded-md",
				"typography-small",
				"transition-all",
			);
			expect(button).not.toHaveClass("text-sm");
			expect(button).not.toHaveClass("font-medium");
		});

		it("sizes unsized icons to 16px and keeps icons from shrinking", () => {
			render(<Button>Button</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"[&_svg]:pointer-events-none",
				"[&_svg]:shrink-0",
				"[&_svg:not([class*='size-'])]:size-4",
			);
		});

		it("uses gap-2 px-4 py-2 spacing and the disabled state", () => {
			render(<Button disabled>Disabled</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass("gap-2", "px-4", "py-2");
			expect(button).toHaveClass(
				"disabled:pointer-events-none",
				"disabled:opacity-50",
			);
		});
	});

	describe("focus and aria-invalid", () => {
		it("uses the 3px ring and the ring-colored border on keyboard focus", () => {
			render(<Button>Focusable</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"outline-none",
				"focus-visible:border-ring",
				"focus-visible:ring-[3px]",
				"focus-visible:ring-ring/50",
			);
			for (const legacy of [
				"focus-visible:ring-2",
				"focus-visible:ring-offset-2",
				"ring-offset-background",
				"focus-visible:outline-none",
			]) {
				expect(button).not.toHaveClass(legacy);
			}
		});

		it("shows the destructive border and ring when aria-invalid", () => {
			render(<Button aria-invalid="true">Invalid</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"aria-invalid:border-destructive",
				"aria-invalid:ring-destructive/20",
				"dark:aria-invalid:ring-destructive/40",
			);
		});
	});

	describe("variants", () => {
		it("outline uses the default border, shadow-xs and the dark input surfaces", () => {
			render(<Button variant="outline">Outline</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"border",
				"bg-background",
				"shadow-xs",
				"hover:bg-accent",
				"hover:text-accent-foreground",
				"dark:border-input",
				"dark:bg-input/30",
				"dark:hover:bg-input/50",
			);
			expect(button).not.toHaveClass("border-input");
		});

		it("destructive keeps text-destructive-foreground and resolves the ring to destructive", () => {
			render(<Button variant="destructive">Delete</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"bg-destructive",
				"text-destructive-foreground",
				"hover:bg-destructive-text",
				"dark:hover:bg-destructive/90",
				"focus-visible:ring-destructive/20",
				"dark:bg-destructive/60",
				"dark:focus-visible:ring-destructive/40",
			);
			expect(button).not.toHaveClass("text-white");
			expect(button).not.toHaveClass("focus-visible:ring-ring/50");
		});

		it("ghost adds the dark accent hover", () => {
			render(<Button variant="ghost">Ghost</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"hover:bg-accent",
				"hover:text-accent-foreground",
				"dark:hover:bg-accent/50",
			);
		});

		it("secondary is unchanged", () => {
			render(<Button variant="secondary">Secondary</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"bg-secondary",
				"text-secondary-foreground",
				"hover:bg-secondary/80",
			);
		});

		it("link keeps the AA text-primary-text color", () => {
			render(<Button variant="link">Link</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass(
				"text-primary-text",
				"underline-offset-4",
				"hover:underline",
			);
			expect(button).not.toHaveClass("text-primary");
		});
	});

	describe("sizes and the 44px floor", () => {
		it("default is h-10 px-4 py-2 with min-h-11", () => {
			render(<Button>Default</Button>);
			expect(screen.getByRole("button")).toHaveClass(
				"h-10",
				"px-4",
				"py-2",
				"min-h-11",
			);
		});

		it("sm is h-9 px-3 with min-h-11", () => {
			render(<Button size="sm">Small</Button>);
			expect(screen.getByRole("button")).toHaveClass("h-9", "px-3", "min-h-11");
		});

		it("lg is h-11 rounded-md px-8 with min-h-11", () => {
			render(<Button size="lg">Large</Button>);
			expect(screen.getByRole("button")).toHaveClass(
				"h-11",
				"rounded-md",
				"px-8",
				"min-h-11",
			);
		});

		it("icon is size-10 with the 44px floor on both axes", () => {
			render(<Button size="icon" aria-label="Close" />);
			const button = screen.getByRole("button", { name: "Close" });

			expect(button).toHaveClass("size-10", "min-h-11", "min-w-11");
			expect(button).not.toHaveClass("h-10");
			expect(button).not.toHaveClass("w-10");
		});

		it("adds no has-[>svg] padding reduction on any size", () => {
			for (const size of ["default", "sm", "lg", "icon"] as const) {
				const { unmount } = render(
					<Button size={size} aria-label={size}>
						{size}
					</Button>,
				);
				const button = screen.getByRole("button", { name: size });
				const reductions = [...button.classList].filter((cls) =>
					cls.startsWith("has-[>svg]"),
				);
				expect(reductions).toEqual([]);
				unmount();
			}
		});
	});

	describe("asChild", () => {
		it("renders the child element with the Button attributes and classes", () => {
			const { container } = render(
				<Button asChild variant="outline">
					<a href="/x">Go</a>
				</Button>,
			);
			const link = screen.getByRole("link", { name: "Go" });

			expect(container.querySelectorAll("a")).toHaveLength(1);
			expect(container.querySelector("button")).toBeNull();
			expect(link).toHaveAttribute("data-slot", "button");
			expect(link).toHaveAttribute("data-variant", "outline");
			expect(link).toHaveClass("inline-flex");
		});
	});

	describe("call-site merges", () => {
		it("lets a call-site size-8 replace the icon size-10", () => {
			render(<Button size="icon" aria-label="x" className="size-8" />);
			const button = screen.getByRole("button", { name: "x" });

			expect(button).toHaveClass("size-8");
			expect(button).not.toHaveClass("size-10");
		});

		it("lets a call-site shrink replace shrink-0", () => {
			render(<Button className="shrink">Shrinkable</Button>);
			const button = screen.getByRole("button");

			expect(button).toHaveClass("shrink");
			expect(button).not.toHaveClass("shrink-0");
		});
	});

	describe("class list", () => {
		it("renders exactly the 29 default classes with no duplicate or conflict", () => {
			render(<Button>Button</Button>);
			const button = screen.getByRole("button");
			const classList = button.className.split(" ");

			expect(DEFAULT_BUTTON_CLASSES).toHaveLength(29);
			expect([...classList].sort()).toEqual([...DEFAULT_BUTTON_CLASSES].sort());
			expect(new Set(classList).size).toBe(classList.length);
			expect(cn(button.className)).toBe(button.className);
		});
	});
});
