/**
 * /blog/page/[page] and /blog/category/[category]/page/[page]: page N of a
 * listing (2026-11-24 SEO audit BL1, CT-1). Page 1 is redirected to the
 * bare listing by next.config.ts before it reaches them; anything that isn't
 * a canonical page number from 2 up is a 404.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NOT_FOUND");
	},
}));
vi.mock("#app/blog/blog-index", () => ({
	BlogIndex: () => null,
	blogIndexMetadata: vi.fn(),
}));
vi.mock("#app/blog/category/[category]/category-index", () => ({
	CategoryIndex: () => null,
	categoryIndexMetadata: vi.fn(),
}));

import { BlogIndex } from "#app/blog/blog-index";
import { CategoryIndex } from "#app/blog/category/[category]/category-index";
import CategoryListingPage from "#app/blog/category/[category]/page/[page]/page";
import BlogListingPage, { revalidate } from "#app/blog/page/[page]/page";

const hub = (page: string) =>
	BlogListingPage({ params: Promise.resolve({ page }) });
const category = (page: string) =>
	CategoryListingPage({
		params: Promise.resolve({ category: "tax-prep", page }),
	});

describe("listing page N", () => {
	it("renders the hub's page N, statically", async () => {
		expect(revalidate).toBe(300);
		const element = await hub("2");
		expect(element.type).toBe(BlogIndex);
		expect(element.props).toEqual({ page: 2 });
	});

	it("renders a category's page N", async () => {
		const element = await category("3");
		expect(element.type).toBe(CategoryIndex);
		expect(element.props).toEqual({ category: "tax-prep", page: 3 });
	});

	it.each(["1", "0", "02", "x"])("404s %j", async (page) => {
		await expect(hub(page)).rejects.toMatchObject({ message: "NOT_FOUND" });
		await expect(category(page)).rejects.toMatchObject({
			message: "NOT_FOUND",
		});
	});
});
