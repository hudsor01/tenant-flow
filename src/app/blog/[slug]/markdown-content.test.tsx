/**
 * @vitest-environment jsdom
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownContent from "./markdown-content";

/** What a post writes, in `blogs.content`, where the plan table goes. */
const PLAN_COMPARISON_MARKER = "{{plan-comparison}}";

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

	it("renders the plan comparison marker as a table of the paid plans, in a scroll region", () => {
		const { container } = render(
			<MarkdownContent
				content={`Intro.\n\n${PLAN_COMPARISON_MARKER}\n\nAfter.`}
			/>,
		);
		expect(container).not.toHaveTextContent(PLAN_COMPARISON_MARKER);
		const table = container.querySelector("div[tabindex='0'] > table");
		expect(table).not.toBeNull();
		const rows = [...(table?.querySelectorAll("tbody tr") ?? [])].map(
			(row) => row.querySelector("td")?.textContent,
		);
		expect(rows).toEqual(["Starter", "Growth", "Max"]);
	});
});
