/**
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownContent from "./markdown-content";

describe("MarkdownContent", () => {
	it("renders a body H1 as an anchored H2, so the post title stays the page's only h1", () => {
		const { container } = render(
			<MarkdownContent content={"# Monthly Costs\n\nBody text."} />,
		);
		expect(container.querySelector("h1")).toBeNull();
		const heading = container.querySelector("h2");
		expect(heading).not.toBeNull();
		expect(heading).toHaveTextContent("Monthly Costs");
		expect(heading).toHaveAttribute("id", "monthly-costs");
		expect(heading).toHaveClass("scroll-mt-28");
	});

	it("renders an H2 as an anchored H2", () => {
		const { container } = render(
			<MarkdownContent content={"## First Section\n\nBody text."} />,
		);
		const heading = container.querySelector("h2");
		expect(heading).toHaveTextContent("First Section");
		expect(heading).toHaveAttribute("id", "first-section");
	});
});
