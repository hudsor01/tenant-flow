/**
 * @vitest-environment jsdom
 * No page shows text a link put in its URL (66.2-39 fix round 4, Part 7).
 *
 * Anyone can write a link to tenantflow.app, so a page that prints a query,
 * hash or path value as text lets them put their own sentence on the site:
 * "Your account is locked, call 555-0100" on a TenantFlow page. React escapes
 * it, so this is content spoofing, not script injection. Four pages did it:
 * /auth/update-password printed the hash's `error_description`, /search
 * quoted `?q=` in its no-results title, /billing/checkout/success printed the
 * first 20 characters of `?session_id=`, and the owner shell's breadcrumbs
 * capitalized any `[id]` segment (`src/lib/breadcrumbs.ts`, tested in
 * `breadcrumbs.test.ts`). A search box showing the query in its own field is
 * fine: that is where the visitor typed it.
 *
 * THE INVENTORY. Every non-test file under src/app, src/components, src/hooks
 * and src/lib that reads the URL (`useSearchParams`, `location.hash` /
 * `.search`, nuqs `useQueryState(s)`, `usePathname`, `useParams`, a page's
 * awaited `params` / `searchParams`, a route handler's `request.url`) is in
 * `REVIEWED` with the number of reads and what the values become. A new read,
 * or a new file, fails until it is reviewed the same way: compared with fixed
 * values, used as an id or a query, or shown only in its own input.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render as renderWithQueryClient } from "#test/utils/test-render";

const SENTENCE = "Your account is locked call 555 0100";

const { mockBlogAnonClient, mockGetUser } = vi.hoisted(() => ({
	mockBlogAnonClient: vi.fn(),
	mockGetUser: vi.fn(),
}));

vi.mock("#lib/blog/blog-queries", () => ({
	blogAnonClient: mockBlogAnonClient,
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("#components/layout/page-layout", () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<main>{children}</main>
	),
}));

vi.mock("next/image", () => ({
	default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe("a URL value never reaches the page as text", () => {
	it.each([
		[
			"the auth callback's failure hash",
			"error=access_denied&error_description=This+link+has+expired+or+is+invalid",
			"This link has expired or is invalid.",
		],
		[
			"a crafted description",
			`error=access_denied&error_description=${encodeURIComponent(SENTENCE)}`,
			"This link has expired or is invalid.",
		],
		[
			"Supabase's expired-token code",
			`error=access_denied&error_code=otp_expired&error_description=${encodeURIComponent(SENTENCE)}`,
			"This link has expired or is invalid.",
		],
		[
			"an unknown error",
			`error=${encodeURIComponent(SENTENCE)}&error_description=${encodeURIComponent(SENTENCE)}`,
			"This link could not be used.",
		],
	])(
		"/auth/update-password with %s shows fixed copy",
		async (_name, hash, copy) => {
			mockGetUser.mockResolvedValue({ data: { user: null } });
			window.history.replaceState(null, "", `/auth/update-password#${hash}`);
			const { default: UpdatePasswordPage } = await import(
				"#app/auth/update-password/page"
			);
			renderWithQueryClient(<UpdatePasswordPage />);
			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: "Link Expired or Invalid" }),
				).toBeInTheDocument();
			});
			expect(screen.getByText(copy)).toBeInTheDocument();
			expect(document.body.textContent).not.toContain(SENTENCE);
			expect(document.body.textContent).not.toContain("+");
		},
	);

	it("/search does not quote ?q= in its no-results title; the search box holds it", async () => {
		const { createQueryChain } = await import(
			"#test/mocks/supabase-query-mock"
		);
		mockBlogAnonClient.mockReturnValue({
			from: () => createQueryChain({ data: [], error: null }),
		});
		const { default: SearchPage } = await import("#app/search/page");
		render(
			await SearchPage({ searchParams: Promise.resolve({ q: SENTENCE }) }),
		);
		expect(screen.getByText("No matching articles")).toBeInTheDocument();
		expect(document.body.textContent).not.toContain(SENTENCE);
		expect(
			screen.getByRole("searchbox", { name: "Search the blog" }),
		).toHaveValue(SENTENCE);
	});

	it("/billing/checkout/success does not print ?session_id=", async () => {
		const { default: CheckoutSuccessPage } = await import(
			"#app/(owner)/billing/checkout/success/page"
		);
		// Typed as the route's props, which Next passes whatever the page declares.
		const page: (props: {
			searchParams: Promise<{ session_id?: string }>;
		}) => ReactElement | Promise<ReactElement> = CheckoutSuccessPage;
		render(
			await page({ searchParams: Promise.resolve({ session_id: SENTENCE }) }),
		);
		expect(screen.getByText("Subscription Activated!")).toBeInTheDocument();
		expect(document.body.textContent).not.toContain(SENTENCE.slice(0, 20));
	});
});

/** What each file's URL reads become. A read here is never shown as text. */
const REVIEWED: Record<string, { reads: number; reason: string }> = {
	"src/app/(auth)/login/page.tsx": {
		reads: 3,
		reason:
			"?error= picks one of three fixed messages (unknown codes show nothing); ?redirect= is a navigation target (isValidRedirect)",
	},
	"src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/@modal/(.)maintenance/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/@modal/(.)properties/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/@modal/(.)tenants/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/@modal/(.)tenants/new/page.tsx": {
		reads: 1,
		reason: "?application= is an id whose row prefills the form",
	},
	"src/app/(owner)/@modal/(.)units/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/applications/[id]/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/billing/plans/page.tsx": {
		reads: 1,
		reason: "?source= is passed to stripe-checkout, never rendered",
	},
	"src/app/(owner)/dashboard/page.tsx": {
		reads: 1,
		reason: '?billing= is compared with "updated"',
	},
	"src/app/(owner)/inspections/[id]/page.tsx": {
		reads: 2,
		reason: "record id for the query",
	},
	"src/app/(owner)/leases/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/leases/[id]/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/leases/page.tsx": {
		reads: 1,
		reason: "?tab= selects a tab by value; labels are fixed",
	},
	"src/app/(owner)/maintenance/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/maintenance/[id]/page.tsx": {
		reads: 2,
		reason: "record id for the query",
	},
	"src/app/(owner)/properties/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/properties/[id]/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/properties/page.tsx": {
		reads: 1,
		reason: "?tab= selects a tab by value; labels are fixed",
	},
	"src/app/(owner)/settings/page.tsx": {
		reads: 1,
		reason: "?tab= resolved against the fixed tab list",
	},
	"src/app/(owner)/tenants/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/tenants/[id]/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/(owner)/tenants/new/page.tsx": {
		reads: 1,
		reason: "?application= is an id whose row prefills the form",
	},
	"src/app/(owner)/units/[id]/edit/page.tsx": {
		reads: 1,
		reason: "record id for the query",
	},
	"src/app/api/og/blog/[slug]/route.tsx": {
		reads: 1,
		reason:
			"slug looked up; an unknown one is a 404, the image shows the row's title",
	},
	"src/app/api/og/compare/[competitor]/route.tsx": {
		reads: 1,
		reason: "slug looked up in COMPETITORS; unknown is a 404",
	},
	"src/app/apply/[token]/page.tsx": {
		reads: 1,
		reason: "token looked up and posted back, never rendered",
	},
	"src/app/auth/callback/route.ts": {
		reads: 1,
		reason:
			"code, token_hash, type and next drive the redirect; next is checked as a same-site path",
	},
	"src/app/auth/confirm-email/page.tsx": {
		reads: 1,
		reason:
			'?error= is compared with "invalid_token"; ?email= is the resend address, never rendered',
	},
	"src/app/auth/update-password/page.tsx": {
		reads: 1,
		reason:
			"the hash's error and error_code pick fixed copy; error_description is never read",
	},
	"src/app/blog/[slug]/page.tsx": {
		reads: 2,
		reason: "slug looked up; unknown is a 404",
	},
	"src/app/blog/category/[category]/page.tsx": {
		reads: 4,
		reason:
			"category validated against the category list (unknown is a 404); ?page= is a number",
	},
	"src/app/blog/page.tsx": { reads: 2, reason: "?page= is a number" },
	"src/app/compare/[competitor]/page.tsx": {
		reads: 2,
		reason: "slug looked up in COMPETITORS; unknown is a 404",
	},
	"src/app/search/page.tsx": {
		reads: 1,
		reason:
			"?q= is the query and the search box's value; the no-results title does not repeat it",
	},
	"src/app/sign/[token]/page.tsx": {
		reads: 1,
		reason: "token looked up and posted back, never rendered",
	},
	"src/components/blog/blog-pagination.tsx": {
		reads: 2,
		reason: "?page= parsed as an integer; the pathname builds page links",
	},
	"src/components/dashboard/components/portfolio-preset-menu.tsx": {
		reads: 1,
		reason:
			"table state (page, sort, filters) parsed by nuqs; presets are the owner's own",
	},
	"src/components/documents/documents-vault.client.tsx": {
		reads: 6,
		reason:
			"?q= is the search box's value; entity, categories and dates validated against fixed sets (rejects scrubbed); ?page= is a number",
	},
	"src/components/inspections/inspection-list.client.tsx": {
		reads: 1,
		reason: "?page= parsed as an integer",
	},
	"src/components/layout/navbar.tsx": {
		reads: 1,
		reason: "pathname marks the active link",
	},
	"src/components/leases/wizard/lease-creation-wizard.tsx": {
		reads: 1,
		reason: "property, unit and tenant ids preselect options",
	},
	"src/components/maintenance/maintenance-view.client.tsx": {
		reads: 1,
		reason:
			"?tab= selects a tab; ?unit_id= is an id (the chip shows the unit's stored number)",
	},
	"src/components/maintenance/table/maintenance-table.client.tsx": {
		reads: 2,
		reason: "page and page size parsed as integers",
	},
	"src/components/settings/general-settings.tsx": {
		reads: 1,
		reason: '?email_change= is compared with "confirmed" and "failed"',
	},
	"src/components/shell/app-shell.tsx": {
		reads: 1,
		reason:
			'pathname → generateBreadcrumbs, which labels from LABEL_MAP, a constant or "Details", never the segment',
	},
	"src/components/shell/main-nav.tsx": {
		reads: 1,
		reason: "pathname marks the active link",
	},
	"src/hooks/use-client-data-table.ts": {
		reads: 4,
		reason:
			"page, size and sort parsed by nuqs; a text filter is the filter input's value; faceted values show only their option's label",
	},
	"src/hooks/use-data-table.ts": {
		reads: 4,
		reason:
			"page, size and sort parsed by nuqs; a text filter is the filter input's value; faceted values show only their option's label",
	},
	"src/hooks/use-lightbox-state.ts": {
		reads: 2,
		reason: "a boolean and an integer",
	},
};

const URL_READ =
	/\buseSearchParams\s*\(|\blocation\.(?:hash|search)\b|\buseQueryStates?\s*\(|\busePathname\s*\(|\buseParams\s*\(|\bawait\s+(?:search)?[pP]arams\b|\buse\s*\(\s*params\s*\)|new URL\(\s*request\.url\s*\)/;
const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*|\{\/\*)/;

function urlReads(): Record<string, number> {
	const out = execFileSync(
		"git",
		[
			"ls-files",
			"-z",
			"--",
			"src/app",
			"src/components",
			"src/hooks",
			"src/lib",
		],
		{ cwd: process.cwd(), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
	);
	const counts: Record<string, number> = {};
	for (const path of out.split("\0")) {
		if (!/\.(ts|tsx)$/.test(path)) continue;
		if (/(^|\/)__tests__\/|\.test\.|\.d\.ts$/.test(path)) continue;
		let text: string;
		try {
			text = readFileSync(join(process.cwd(), path), "utf8");
		} catch {
			continue;
		}
		const reads = text
			.split("\n")
			.filter((line) => !COMMENT_LINE.test(line) && URL_READ.test(line)).length;
		if (reads > 0) counts[path] = reads;
	}
	return counts;
}

describe("every URL read is reviewed", () => {
	it("finds the reads (the scan is not vacuous)", () => {
		const planted = [
			"const q = useSearchParams();",
			"const h = window.location.hash;",
			"const { id } = await params;",
			"// useSearchParams() in a comment",
		].filter((line) => !COMMENT_LINE.test(line) && URL_READ.test(line));
		expect(planted).toHaveLength(3);
	});

	it("matches REVIEWED file for file and read for read", () => {
		const found = urlReads();
		expect(Object.keys(found).length).toBeGreaterThan(40);
		expect(
			Object.fromEntries(
				Object.entries(found).map(([path, reads]) => [path, reads]),
			),
		).toEqual(
			Object.fromEntries(
				Object.entries(REVIEWED).map(([path, entry]) => [path, entry.reads]),
			),
		);
		for (const [path, entry] of Object.entries(REVIEWED)) {
			expect(entry.reason.trim(), path).not.toBe("");
		}
	});
});
