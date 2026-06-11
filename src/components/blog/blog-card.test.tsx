/**
 * BlogCard Component Tests
 *
 * Tests for the blog card presentation component used across hub,
 * category, and related posts sections.
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

vi.mock("next/image", () => ({
	default: (props: Record<string, unknown>) => (
		<img
			src={props.src as string}
			alt={props.alt as string}
			data-testid="next-image"
		/>
	),
}));

import type { BlogListItem } from "#hooks/api/query-keys/blog-keys";
import { BlogCard } from "./blog-card";

const mockPost: BlogListItem = {
	id: "post-1",
	title: "How to Manage Rental Properties Efficiently",
	slug: "manage-rental-properties",
	excerpt:
		"Learn the best practices for managing rental properties and keeping tenants happy.",
	published_at: "2026-01-15T10:00:00Z",
	category: "Property Management",
	reading_time: 5,
	featured_image: "https://example.com/images/rental.jpg",
	author_user_id: "user-123",
	status: "published",
	tags: ["management", "tips"],
};

describe("BlogCard", () => {
	it("renders the post title", () => {
		render(<BlogCard post={mockPost} />);
		expect(
			screen.getByText("How to Manage Rental Properties Efficiently"),
		).toBeInTheDocument();
	});

	it("renders category and reading time as inline text", () => {
		render(<BlogCard post={mockPost} />);
		expect(screen.getByText("Property Management")).toBeInTheDocument();
		expect(screen.getByText("5 min read")).toBeInTheDocument();
	});

	it("renders Link with correct href", () => {
		render(<BlogCard post={mockPost} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/blog/manage-rental-properties");
	});

	it("renders Image when featured_image is provided", () => {
		render(<BlogCard post={mockPost} />);
		const image = screen.getByTestId("next-image");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute(
			"src",
			"https://example.com/images/rental.jpg",
		);
	});

	it("falls back to the generated per-post cover when featured_image is null", () => {
		const postWithoutImage: BlogListItem = {
			...mockPost,
			featured_image: null,
		};
		render(<BlogCard post={postWithoutImage} />);
		// Unique on-brand cover art from /api/og/blog/[slug] (category palette +
		// slug-hashed composition) — never a shared placeholder.
		const img = screen.getByTestId("next-image");
		expect(img).toHaveAttribute(
			"src",
			"/api/og/blog/manage-rental-properties?v=2",
		);
	});

	it("renders excerpt text", () => {
		render(<BlogCard post={mockPost} />);
		expect(
			screen.getByText(
				"Learn the best practices for managing rental properties and keeping tenants happy.",
			),
		).toBeInTheDocument();
	});

	it("applies custom className when provided", () => {
		const { container } = render(
			<BlogCard post={mockPost} className="custom-card-class" />,
		);
		expect(container.firstChild).toHaveClass("custom-card-class");
	});

	it("renders title in an h3 element", () => {
		render(<BlogCard post={mockPost} />);
		const heading = screen.getByRole("heading", { level: 3 });
		expect(heading).toHaveTextContent(
			"How to Manage Rental Properties Efficiently",
		);
	});

	it("renders dash separator with aria-hidden", () => {
		const { container } = render(<BlogCard post={mockPost} />);
		const separator = container.querySelector('[aria-hidden="true"]');
		expect(separator).toBeInTheDocument();
	});
});
