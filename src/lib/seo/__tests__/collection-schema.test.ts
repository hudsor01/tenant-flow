/**
 * Page-level JSON-LD for list, about and contact pages (2026-11-24 SEO audit
 * C2, RS2, CT-3, BL3, AB9, CT3).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/generate-metadata", () => ({
	getSiteUrl: () => "https://tenantflow.app",
	organizationRef: () => ({ "@id": "https://tenantflow.app/#organization" }),
}));

import {
	createBlogJsonLd,
	createCollectionPageJsonLd,
	createItemListJsonLd,
	createOrganizationPageJsonLd,
} from "../collection-schema";

const PAGES = [
	{ name: "TenantFlow vs Buildium", path: "/compare/buildium" },
	{ name: "TenantFlow vs AppFolio", path: "/compare/appfolio" },
];

const LIST = {
	"@type": "ItemList",
	itemListElement: [
		{
			"@type": "ListItem",
			position: 1,
			name: "TenantFlow vs Buildium",
			url: "https://tenantflow.app/compare/buildium",
		},
		{
			"@type": "ListItem",
			position: 2,
			name: "TenantFlow vs AppFolio",
			url: "https://tenantflow.app/compare/appfolio",
		},
	],
};

describe("collection JSON-LD", () => {
	it("lists pages in order, with absolute URLs", () => {
		expect(createItemListJsonLd(PAGES)).toEqual({
			"@context": "https://schema.org",
			...LIST,
		});
	});

	it("makes the list a CollectionPage's main entity", () => {
		expect(
			createCollectionPageJsonLd({
				name: "Free Landlord Resources",
				path: "/resources",
				description: "Free printable landlord tools.",
				pages: PAGES,
			}),
		).toEqual({
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			name: "Free Landlord Resources",
			url: "https://tenantflow.app/resources",
			description: "Free printable landlord tools.",
			mainEntity: LIST,
		});
	});

	it("gives the blog hub a Blog with a BlogPosting per listed post", () => {
		const blog = createBlogJsonLd({
			path: "/blog",
			description: "Guides.",
			posts: [
				{
					title: "A post",
					slug: "a-post",
					publishedAt: "2026-11-22T18:00:00Z",
					image: "https://images.unsplash.com/x",
				},
				{ title: "Draft-dated", slug: "b", publishedAt: null, image: null },
			],
		});
		expect(blog).toMatchObject({
			"@type": "Blog",
			url: "https://tenantflow.app/blog",
			publisher: { "@id": "https://tenantflow.app/#organization" },
			inLanguage: "en-US",
		});
		expect(blog.blogPost).toEqual([
			{
				"@type": "BlogPosting",
				headline: "A post",
				url: "https://tenantflow.app/blog/a-post",
				datePublished: "2026-11-22T18:00:00Z",
				image: "https://images.unsplash.com/x",
			},
			{
				"@type": "BlogPosting",
				headline: "Draft-dated",
				url: "https://tenantflow.app/blog/b",
			},
		]);
	});

	it.each(["AboutPage", "ContactPage"] as const)(
		"points a %s at the Organization node, with no founder (D-09)",
		(type) => {
			expect(
				createOrganizationPageJsonLd(type, { name: "About", path: "/about" }),
			).toEqual({
				"@context": "https://schema.org",
				"@type": type,
				name: "About",
				url: "https://tenantflow.app/about",
				mainEntity: { "@id": "https://tenantflow.app/#organization" },
			});
		},
	);
});
