/**
 * BlogPagination Component Tests
 *
 * The pagination controls are REAL `<Link>` anchors so the paginated URLs
 * exist in the SSR HTML and are crawlable (page 2+ posts were crawl orphans
 * when these were hrefless `<button>`s). Page N lives at `<basePath>/page/N`
 * and page 1 at the bare path (2026-11-24 SEO audit BL1, CT-1). The onClick
 * only preventDefaults a disabled boundary link.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: (e: React.MouseEvent) => void;
		className?: string;
	}) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}));

import { expectNavigation } from "#test/utils/expect-navigation";
import { BlogPagination } from "./blog-pagination";

describe("BlogPagination", () => {
	it('renders "Page 1 of 5" text', () => {
		render(<BlogPagination basePath="/blog" currentPage={1} totalPages={5} />);
		expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
	});

	it("next link carries a crawlable /page/2 href on page 1", () => {
		render(<BlogPagination basePath="/blog" currentPage={1} totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("href", "/blog/page/2");
	});

	it("prev link points back to the bare path (no /page/1) from page 2", () => {
		render(<BlogPagination basePath="/blog" currentPage={2} totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		expect(prev).toHaveAttribute("href", "/blog");
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("href", "/blog/page/3");
	});

	it("previous link is aria-disabled on page 1", () => {
		render(<BlogPagination basePath="/blog" currentPage={1} totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		expect(prev).toHaveAttribute("aria-disabled", "true");
	});

	it("next link is aria-disabled on the last page", () => {
		render(<BlogPagination basePath="/blog" currentPage={5} totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("aria-disabled", "true");
	});

	it("both links are enabled on a middle page", () => {
		render(<BlogPagination basePath="/blog" currentPage={3} totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		const next = screen.getByRole("link", { name: "Next page" });
		expect(prev).toHaveAttribute("aria-disabled", "false");
		expect(next).toHaveAttribute("aria-disabled", "false");
	});

	it("returns null when totalPages is 0", () => {
		const { container } = render(
			<BlogPagination basePath="/blog" currentPage={1} totalPages={0} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("returns null when totalPages is 1", () => {
		const { container } = render(
			<BlogPagination basePath="/blog" currentPage={1} totalPages={1} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders nav element with aria-label", () => {
		render(<BlogPagination basePath="/blog" currentPage={1} totalPages={5} />);
		const nav = screen.getByRole("navigation", {
			name: "Blog pagination",
		});
		expect(nav).toBeInTheDocument();
	});

	it("lets an enabled next click navigate to its page", () => {
		const navigations = expectNavigation();
		render(<BlogPagination basePath="/blog" currentPage={3} totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		next.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true }),
		);
		expect(navigations).toEqual(["/blog/page/4"]);
	});

	it("lets an enabled prev click navigate to its page", () => {
		const navigations = expectNavigation();
		render(<BlogPagination basePath="/blog" currentPage={2} totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		prev.dispatchEvent(
			new MouseEvent("click", { bubbles: true, cancelable: true }),
		);
		expect(navigations).toEqual(["/blog"]);
	});

	it("preventDefaults a disabled boundary link", () => {
		render(<BlogPagination basePath="/blog" currentPage={1} totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		prev.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it("builds a category listing's page links from its base path", () => {
		render(
			<BlogPagination
				basePath="/blog/category/lease-law"
				currentPage={2}
				totalPages={3}
			/>,
		);
		expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute(
			"href",
			"/blog/category/lease-law",
		);
		expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
			"href",
			"/blog/category/lease-law/page/3",
		);
	});

	it("applies custom className", () => {
		const { container } = render(
			<BlogPagination
				basePath="/blog"
				currentPage={1}
				totalPages={5}
				className="custom-pagination"
			/>,
		);
		const nav = container.querySelector("nav");
		expect(nav).toHaveClass("custom-pagination");
	});
});
