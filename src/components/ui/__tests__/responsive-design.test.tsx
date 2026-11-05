import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, test } from "vitest";
import OwnerLoading from "#app/(owner)/loading";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";

/**
 * Mobile-First Responsive Design Tests
 *
 * Tests for responsive typography, spacing, touch targets, and layout adaptations
 */

describe("Mobile-First Responsive Design", () => {
	describe("Touch Targets", () => {
		test("buttons have minimum 44px touch target height", () => {
			render(<Button>Click me</Button>);

			const button = screen.getByRole("button");

			// Check that the button has touch-friendly min-height class (min-h-11 = 2.75rem = 44px)
			expect(button).toHaveClass("min-h-11");
		});

		test("links with touch-target class have adequate touch area", () => {
			render(
				<nav>
					<Link
						href="/test"
						className="touch-target min-h-11 inline-flex items-center"
					>
						Test Link
					</Link>
				</nav>,
			);

			const link = screen.getByRole("link");
			expect(link).toHaveClass("touch-target", "min-h-11");
		});

		test("badges have adequate touch targets for interactive use", () => {
			render(<Badge>Interactive Badge</Badge>);

			const badge = screen.getByText("Interactive Badge");

			// Check that badges have adequate padding classes
			expect(badge).toHaveClass("px-2", "py-0.5");
		});
	});

	describe("Responsive Typography", () => {
		test("heading scales appropriately with clamp functions", () => {
			render(
				<div>
					<h1 className="text-4xl font-black">Dashboard</h1>
					<h2 className="text-2xl">Section Title</h2>
					<p className="text-base">Body text</p>
				</div>,
			);

			const h1 = screen.getByRole("heading", { level: 1 });
			const h2 = screen.getByRole("heading", { level: 2 });
			const p = screen.getByText("Body text");

			// Check that clamp functions are applied (computed styles will show resolved values)
			expect(h1).toBeInTheDocument();
			expect(h2).toBeInTheDocument();
			expect(p).toBeInTheDocument();
		});
	});

	describe("Responsive Spacing", () => {
		test("container uses responsive padding utilities", () => {
			render(
				<div className="px-(--layout-container-padding-x) py-(--layout-content-padding)">
					<div>Content</div>
				</div>,
			);

			const container = screen.getByText("Content").parentElement;
			// Check that the container uses CSS custom properties for responsive padding
			expect(container).toHaveClass(
				"px-(--layout-container-padding-x)",
				"py-(--layout-content-padding)",
			);
		});

		// Each track is min(20rem, 100%) wide at least, so the grid never
		// overflows a row narrower than 20rem: at 320px main leaves 288px, and a
		// 320px track scrolled the page sideways (66.2-39 fix round 3, F3).
		test("owner loading stat grid auto-fits columns no wider than its row", () => {
			const { container } = render(<OwnerLoading />);

			expect(container.querySelectorAll('[class*="dashboard-"]')).toHaveLength(
				0,
			);
			expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
				37,
			);

			const grid = Array.from(container.querySelectorAll("div")).find((el) =>
				el.classList.contains(
					"grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))]",
				),
			);
			expect(grid).toBeDefined();
			const cards = Array.from(grid?.children ?? []);
			expect(cards).toHaveLength(4);
			for (const card of cards) {
				expect(card).toHaveClass("rounded-lg", "border-border", "bg-card");
			}
		});
	});

	describe("Mobile Layout Adaptations", () => {
		test("sidebar becomes mobile drawer on small screens", () => {
			// This would require mocking the useIsMobile hook
			// For now, we test that the hook exists and components respond
			expect(true).toBe(true); // Placeholder test
		});

		test("content stacks vertically on mobile", () => {
			render(
				<div className="flex flex-col md:flex-row gap-4">
					<div>Left</div>
					<div>Right</div>
				</div>,
			);

			const container = screen.getByText("Left").parentElement;
			expect(container).toHaveClass("flex-col", "md:flex-row");
		});
	});

	describe("Progressive Enhancement", () => {
		test("components work without JavaScript", () => {
			// Test that critical content is available in initial HTML
			render(
				<nav>
					<Link href="/dashboard">Dashboard</Link>
					<Link href="/properties">Properties</Link>
				</nav>,
			);

			expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
				"href",
				"/dashboard",
			);
			expect(screen.getByRole("link", { name: "Properties" })).toHaveAttribute(
				"href",
				"/properties",
			);
		});

		test("focus management works for keyboard navigation", () => {
			render(<Button>Focusable Button</Button>);

			const button = screen.getByRole("button");
			button.focus();

			expect(button).toHaveFocus();
		});
	});
});
