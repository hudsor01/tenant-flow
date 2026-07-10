/**
 * BlogPagination Component Tests
 *
 * The pagination controls are REAL `<Link>` anchors carrying `?page=N`
 * hrefs so the paginated URLs exist in the SSR HTML and are crawlable
 * (page 2+ posts were crawl orphans when these were hrefless `<button>`s).
 * An enabled click performs real navigation (no nuqs hijack) so the Server
 * Component re-runs and the post grid changes; the onClick is a guard that
 * only preventDefaults a disabled boundary link.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetPage = vi.hoisted(() => vi.fn());
const mockPage = vi.hoisted(() => ({ value: 1 }));

vi.mock("nuqs", () => ({
	parseAsInteger: {
		withDefault: () => ({
			parse: (v: string) => parseInt(v, 10),
		}),
	},
	useQueryState: () => [mockPage.value, mockSetPage] as const,
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/blog",
}));

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

import { BlogPagination } from "./blog-pagination";

describe("BlogPagination", () => {
	beforeEach(() => {
		mockSetPage.mockClear();
		mockPage.value = 1;
	});

	it('renders "Page 1 of 5" text', () => {
		render(<BlogPagination totalPages={5} />);
		expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
	});

	it("next link carries a crawlable ?page=2 href on page 1", () => {
		render(<BlogPagination totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("href", "/blog?page=2");
	});

	it("prev link points back to the bare path (no ?page=1) from page 2", () => {
		mockPage.value = 2;
		render(<BlogPagination totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		expect(prev).toHaveAttribute("href", "/blog");
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("href", "/blog?page=3");
	});

	it("previous link is aria-disabled on page 1", () => {
		render(<BlogPagination totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		expect(prev).toHaveAttribute("aria-disabled", "true");
	});

	it("next link is aria-disabled on the last page", () => {
		mockPage.value = 5;
		render(<BlogPagination totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		expect(next).toHaveAttribute("aria-disabled", "true");
	});

	it("both links are enabled on a middle page", () => {
		mockPage.value = 3;
		render(<BlogPagination totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		const next = screen.getByRole("link", { name: "Next page" });
		expect(prev).toHaveAttribute("aria-disabled", "false");
		expect(next).toHaveAttribute("aria-disabled", "false");
	});

	it("returns null when totalPages is 0", () => {
		const { container } = render(<BlogPagination totalPages={0} />);
		expect(container.firstChild).toBeNull();
	});

	it("returns null when totalPages is 1", () => {
		const { container } = render(<BlogPagination totalPages={1} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nav element with aria-label", () => {
		render(<BlogPagination totalPages={5} />);
		const nav = screen.getByRole("navigation", {
			name: "Blog pagination",
		});
		expect(nav).toBeInTheDocument();
	});

	it("lets an enabled next click navigate (no setPage hijack, default not prevented)", () => {
		mockPage.value = 3;
		render(<BlogPagination totalPages={5} />);
		const next = screen.getByRole("link", { name: "Next page" });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		next.dispatchEvent(event);
		expect(mockSetPage).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it("lets an enabled prev click navigate (no setPage hijack, default not prevented)", () => {
		mockPage.value = 2;
		render(<BlogPagination totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		prev.dispatchEvent(event);
		expect(mockSetPage).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it("preventDefaults a disabled boundary link and never calls setPage", () => {
		render(<BlogPagination totalPages={5} />);
		const prev = screen.getByRole("link", { name: "Previous page" });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		prev.dispatchEvent(event);
		expect(mockSetPage).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);
	});

	it("applies custom className", () => {
		const { container } = render(
			<BlogPagination totalPages={5} className="custom-pagination" />,
		);
		const nav = container.querySelector("nav");
		expect(nav).toHaveClass("custom-pagination");
	});
});
