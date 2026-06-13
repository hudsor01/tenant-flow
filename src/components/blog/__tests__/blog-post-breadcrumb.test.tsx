/**
 * Tests for BlogPostBreadcrumb.
 *
 * Pins the path-derivation rule so visible breadcrumb segments match the
 * JSON-LD BreadcrumbList emitted by `createBreadcrumbJsonLd`. Drift between
 * the two is a documented search-penalty risk (Pitfall 2).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

import { BlogPostBreadcrumb } from "#components/blog/blog-post-breadcrumb";

describe("BlogPostBreadcrumb", () => {
	it("renders 4 segments and humanizes the kebab category slug into a label", () => {
		// `category` is the raw `blogs.category` value — the kebab SLUG. The
		// node links to the slug verbatim and renders the human label.
		render(<BlogPostBreadcrumb title="The Test Post" category="lease-law" />);

		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
			"href",
			"/blog",
		);
		expect(screen.getByRole("link", { name: "Lease Law" })).toHaveAttribute(
			"href",
			"/blog/category/lease-law",
		);
		expect(screen.getByText("The Test Post")).toBeInTheDocument();
	});

	it("renders 3 segments (Home > Blog > Title) when category is null", () => {
		render(<BlogPostBreadcrumb title="Uncategorized Post" category={null} />);

		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
			"href",
			"/",
		);
		expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
			"href",
			"/blog",
		);
		// No category link rendered when category is null
		expect(
			screen.queryByRole("link", { name: /Law/i }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Uncategorized Post")).toBeInTheDocument();
	});

	it("links the category node to the slug verbatim and shows the mapped label", () => {
		render(<BlogPostBreadcrumb title="Vault Post" category="software-vault" />);
		expect(
			screen.getByRole("link", { name: "Software Vault" }),
		).toHaveAttribute("href", "/blog/category/software-vault");
	});

	it('uses aria-current="page" on the title segment', () => {
		render(<BlogPostBreadcrumb title="Active Post" category="maintenance" />);
		const current = screen.getByText("Active Post");
		expect(current).toHaveAttribute("aria-current", "page");
	});

	it('renders inside a nav landmark with aria-label="breadcrumb"', () => {
		render(<BlogPostBreadcrumb title="Some Post" category="tax-prep" />);
		const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
		expect(nav).toBeInTheDocument();
	});
});
