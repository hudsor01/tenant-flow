/**
 * /blog/page/[page] and /blog/category/[category]/page/[page]: page N of a
 * listing (2026-11-24 SEO audit BL1, CT-1). Page 1 has one URL, the bare
 * listing; anything that isn't a canonical page number is a 404.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NOT_FOUND");
	},
	permanentRedirect: (url: string) => {
		throw new Error(`REDIRECT ${url}`);
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

	it("sends page 1 to the bare listing", async () => {
		await expect(hub("1")).rejects.toMatchObject({
			message: "REDIRECT /blog",
		});
		await expect(category("1")).rejects.toMatchObject({
			message: "REDIRECT /blog/category/tax-prep",
		});
	});

	it.each(["0", "02", "x"])("404s %j", async (page) => {
		await expect(hub(page)).rejects.toMatchObject({ message: "NOT_FOUND" });
		await expect(category(page)).rejects.toMatchObject({
			message: "NOT_FOUND",
		});
	});
});
