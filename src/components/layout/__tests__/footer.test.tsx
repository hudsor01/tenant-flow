/**
 * SEO-06 regression pin for the sitewide footer.
 *
 * Pins that the footer renders a `/sitemap.xml` link as an external link
 * (`target="_blank"` + `rel` containing `noopener`). The marketing crawl
 * audit depends on the sitemap being reachable from sitewide chrome — a
 * refactor that drops or de-externalizes this link silently regresses
 * the discoverability surface.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: ReactNode;
		href: string;
		className?: string;
		target?: string;
		rel?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

import Footer from "#components/layout/footer";

describe("Footer", () => {
	it("renders the /sitemap.xml link", () => {
		render(<Footer />);
		const link = screen.getByRole("link", { name: "Sitemap" });
		expect(link).toHaveAttribute("href", "/sitemap.xml");
	});

	it("renders the sitemap link as an external link", () => {
		render(<Footer />);
		const link = screen.getByRole("link", { name: "Sitemap" });
		expect(link).toHaveAttribute("target", "_blank");
		expect(link.getAttribute("rel")).toContain("noopener");
	});
});
