import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { loginAsOwner } from "../../auth-helpers";
import {
	gotoAuthedDashboard,
	waitForDashboardContent,
} from "../../lib/authed-dashboard";
import { type Box, boxesOf, boxOf, polledRead } from "../../lib/measure";

/**
 * The canonical owner Sidebar in a real browser — Phase 66.2 wave 6, UI-SPEC
 * S-10 (D-34, D-36, D-39, D-40, D-41, D-46 to D-50; VD-26 to VD-37; T-COOKIE).
 *
 * WHAT JSDOM CANNOT DECIDE, AND THEREFORE WHAT THIS FILE EXISTS FOR. Plans
 * 66.2-31 to 66.2-35 moved the owner shell onto the vendored shadcn Sidebar and
 * pinned every class in unit tests. None of those tests can tell whether:
 *   - the neutralizers beat the unscoped `@layer base` list and link rules in
 *     globals.css (the Phase 65 defect class: the classes were present in the
 *     broken build too, so only a computed value answers it);
 *   - the rail, rows, sub rows and sheet have their real S-2/S-4 geometry;
 *   - Radix traps focus in the sheet and `hideOthers` hides the page;
 *   - the collapsed rail is `inert`, so Tab skips it;
 *   - the server renders the persisted `sidebar_state` without a hydration error;
 *   - the scrim closes the sheet.
 *
 * IT RUNS UNDER `owner-axe`, NOT `owner`. CI's `e2e-smoke` job invokes
 * `--project=smoke --project=public --project=owner-axe`; the `owner` /
 * `firefox` / `mobile-chrome` projects consume a storageState CI never
 * produces, so a spec matched only there gates nothing. Authentication is
 * in-test via `loginAsOwner` with no storageState, and `playwright.config.ts`
 * lists this filename in the `owner-axe` allowlist and in the other three
 * projects' testIgnore, so it executes exactly once.
 *
 * GEOMETRY GOES THROUGH `lib/measure.ts` ONLY (`boxOf`, `boxesOf`,
 * `polledRead`); computed styles through `toHaveCSS` or a `getComputedStyle`
 * evaluate. `measure-is-the-only-geometry-read.test.ts` enforces the first rule.
 *
 * HYDRATION ERRORS USE A LOCAL COLLECTOR, never `setupErrorMonitoring`: that
 * helper's ignore list filters "Hydration failed", so it cannot fail on the one
 * class of error the cookie matrix below exists to catch. A self-test proves the
 * local collector can fail.
 *
 * NO PRODUCTION WRITE. The onboarding tour's `user_tour_progress` traffic is
 * fulfilled by `page.route` in every authenticated test before `loginAsOwner`
 * runs, so no request for that table reaches Supabase. The `sidebar_state`
 * collapse preference is a browser cookie only.
 *
 * NOTHING IS UPLOADED. This file sets no `trace`, `screenshot` or `video`
 * option and logs no cookie or session value (CLAUDE.md §CI: CI authenticates
 * against production).
 */

// The 200ms sheet and collapse transitions become instant under the global
// reduced-motion rule in globals.css, which removes the transition race rather
// than waiting it out (the dashboard-smoke posture).
test.use({ contextOptions: { reducedMotion: "reduce" } });

const WCAG_2_1_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const DESKTOP_SIDEBAR = '[data-slot="sidebar"]:not([data-mobile="true"])';
const MOBILE_SHEET = '[data-slot="sidebar"][data-mobile="true"]';
const TRIGGER = '[data-slot="sidebar-trigger"]';
const RAIL = '[data-slot="sidebar-rail"]';

/** Mirrors `SIDEBAR_COOKIE_NAME` in `src/lib/sidebar-state.ts` (specs import nothing from `src/`). */
const SIDEBAR_COOKIE = "sidebar_state";
/** Mirrors `SIDEBAR_COOKIE_MAX_AGE` in `src/lib/sidebar-state.ts`: 7 days. */
const COOKIE_MAX_AGE_S = 604800;

const HYDRATION_ERROR = /hydrat|Minified React error #(418|423|425)/i;

const VIEWPORTS = [
	{ width: 375, height: 667 },
	{ width: 900, height: 800 },
	{ width: 1024, height: 768 },
	{ width: 1280, height: 720 },
] as const;

/** The same base-URL expression `auth-helpers.ts` uses. */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3050";

const TOUR_PROGRESS_ROUTE = "**/rest/v1/user_tour_progress*";

/**
 * Waits until react-dom has hydrated the node `selector` matches. react-dom
 * precaches a fiber on every host node it hydrates (`__reactFiber$<random>`), so
 * an own key starting with `__react` is the hydration signal; visibility is not
 * (the apply-token.spec.ts gate).
 */
async function waitForHydration(page: Page, selector: string): Promise<void> {
	await page.waitForFunction(
		(target) => {
			const node = document.querySelector(target);
			return (
				node !== null &&
				Object.keys(node).some((key) => key.startsWith("__react"))
			);
		},
		selector,
		{ timeout: 20000 },
	);
}

/**
 * Collects every console error or warning and every uncaught page error whose
 * text matches `HYDRATION_ERROR`, into a live array. Attach it before the first
 * navigation so the first document load is covered.
 */
function collectHydrationErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on("console", (message) => {
		const type = message.type();
		const text = message.text();
		if (
			(type === "error" || type === "warning") &&
			HYDRATION_ERROR.test(text)
		) {
			errors.push(`${type}: ${text}`);
		}
	});
	page.on("pageerror", (error) => {
		if (HYDRATION_ERROR.test(error.message)) {
			errors.push(`pageerror: ${error.message}`);
		}
	});
	return errors;
}

/** Plants `sidebar_state` on the browser context only (never on a server). */
async function seedSidebarCookie(
	page: Page,
	value: "true" | "false" | "garbage",
): Promise<void> {
	await page
		.context()
		.addCookies([{ name: SIDEBAR_COOKIE, value, url: BASE_URL }]);
}

interface TourProgressTraffic {
	gets: number;
	writes: number;
}

/**
 * Answers every `user_tour_progress` request locally, so none reaches
 * production. GET answers with a completed row, so the tour never opens over a
 * test that is not about it; any other method answers 201 with an empty body.
 * The counters are live.
 */
async function fulfillTourProgressAsCompleted(
	page: Page,
): Promise<TourProgressTraffic> {
	const traffic: TourProgressTraffic = { gets: 0, writes: 0 };
	await page.route(TOUR_PROGRESS_ROUTE, async (route) => {
		if (route.request().method() === "GET") {
			traffic.gets += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: JSON.stringify([
					{
						tour_key: "owner-onboarding",
						status: "completed",
						current_step: 0,
						completed_at: "2026-01-01T00:00:00.000Z",
						skipped_at: null,
						last_seen_at: "2026-01-01T00:00:00.000Z",
					},
				]),
			});
			return;
		}
		traffic.writes += 1;
		await route.fulfill({
			status: 201,
			headers: { "access-control-allow-origin": "*" },
			body: "",
		});
	});
	return traffic;
}

/**
 * Reads the server-rendered `data-state` of the desktop sidebar: the first
 * opening tag carrying `data-slot="sidebar"` with the closing quote straight
 * after `sidebar`, so `sidebar-wrapper` and the other slots never match.
 */
async function ssrSidebarState(page: Page): Promise<string> {
	const response = await page.goto("/dashboard");
	if (response === null) {
		throw new Error("ssrSidebarState: page.goto returned no response");
	}
	const html = await response.text();
	const tag = /<[^<>]*\bdata-slot="sidebar"[^<>]*>/.exec(html);
	if (tag === null) {
		throw new Error(
			'ssrSidebarState: the response HTML has no data-slot="sidebar" tag',
		);
	}
	const state = /\bdata-state="([^"]*)"/.exec(tag[0]);
	const value = state?.[1];
	if (value === undefined) {
		throw new Error(
			'ssrSidebarState: the data-slot="sidebar" tag carries no data-state',
		);
	}
	return value;
}

/** `expectNear` as a soft assertion, so one run reports every failing cell. */
function expectNearSoft(actual: number, expected: number, label: string): void {
	expect
		.soft(
			Math.abs(actual - expected),
			`${label}: measured ${actual}, expected ${expected} ±0.5`,
		)
		.toBeLessThanOrEqual(0.5);
}

/** `actual` within ±0.5px of `expected`, with the measured value in the failure. */
function expectNear(actual: number, expected: number, label: string): void {
	expect(
		Math.abs(actual - expected),
		`${label}: measured ${actual}, expected ${expected} ±0.5`,
	).toBeLessThanOrEqual(0.5);
}

/**
 * The computed `color` a probe span gets from `var(<token>)` (the
 * applications.spec.ts method). It throws when `<token>` is not declared on the
 * root element: an undeclared custom property makes `var()` invalid at computed
 * time, the span then inherits the body text color, and every comparison
 * against it would be meaningless. That is the case for the `--color-sidebar-*`
 * names, which globals.css declares in `@theme inline`: Tailwind inlines them
 * into the utilities as `var(--sidebar-*)` and emits no custom property, so the
 * resolvable token is the `--sidebar-*` property they alias.
 */
async function resolveColor(page: Page, token: string): Promise<string> {
	return page.evaluate((customProperty) => {
		const declared = getComputedStyle(document.documentElement)
			.getPropertyValue(customProperty)
			.trim();
		if (declared === "") {
			throw new Error(`resolveColor: ${customProperty} is not declared`);
		}
		const probe = document.createElement("span");
		probe.style.color = `var(${customProperty})`;
		document.body.appendChild(probe);
		const value = getComputedStyle(probe).color;
		probe.remove();
		return value;
	}, token);
}

declare global {
	interface Window {
		__sidebarCookieWrites?: string[];
	}
}

/**
 * Records every `document.cookie` write that starts with `sidebar_state=`, in
 * every document this page loads. Nothing else is recorded, so the `sb-*` auth
 * cookies never enter test state.
 */
async function captureCookieWrites(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			"cookie",
		);
		const read = descriptor?.get;
		const write = descriptor?.set;
		if (read === undefined || write === undefined) {
			return;
		}
		window.__sidebarCookieWrites = [];
		Object.defineProperty(Document.prototype, "cookie", {
			configurable: true,
			enumerable: descriptor?.enumerable ?? true,
			get(this: Document) {
				return read.call(this);
			},
			set(this: Document, value: string) {
				if (typeof value === "string" && value.startsWith("sidebar_state=")) {
					window.__sidebarCookieWrites?.push(value);
				}
				write.call(this, value);
			},
		});
	});
}

async function readCookieWrites(page: Page): Promise<string[]> {
	return page.evaluate(() => [...(window.__sidebarCookieWrites ?? [])]);
}

interface TabStop {
	inSidebar: boolean;
	isTrigger: boolean;
}

/**
 * Presses Tab `presses` times from the page start and records, after each
 * press, whether focus sits inside the desktop sidebar and whether it is the
 * trigger. The walk starts from a throwaway `tabindex=-1` node prepended to
 * `body`, because a blurred element leaves Chromium's sequential-focus starting
 * point where it was, and a walk that started after the sidebar would skip it
 * no matter what.
 */
async function tabWalk(page: Page, presses: number): Promise<TabStop[]> {
	await page.evaluate(() => {
		const start = document.createElement("div");
		start.id = "e2e-tab-walk-start";
		start.tabIndex = -1;
		document.body.prepend(start);
		start.focus();
	});
	const stops: TabStop[] = [];
	for (let press = 0; press < presses; press += 1) {
		await page.keyboard.press("Tab");
		stops.push(
			await page.evaluate(
				({ sidebar, trigger }) => {
					const active = document.activeElement;
					return {
						inSidebar: active !== null && active.closest(sidebar) !== null,
						isTrigger: active !== null && active.matches(trigger),
					};
				},
				{ sidebar: DESKTOP_SIDEBAR, trigger: TRIGGER },
			),
		);
	}
	await page.evaluate(() => {
		document.getElementById("e2e-tab-walk-start")?.remove();
	});
	return stops;
}

/** Records a measured value on the test, for the run report. */
function record(type: string, value: unknown): void {
	test.info().annotations.push({ type, description: JSON.stringify(value) });
}

/**
 * The accessible names of the navigation landmarks Chromium exposes: every
 * AX node with the `navigation` role that the browser does not mark ignored.
 * Playwright's role engine does not model `inert`, so this reads the browser's
 * own accessibility tree through CDP (owner-axe runs Desktop Chrome only).
 */
async function exposedNavigationNames(page: Page): Promise<string[]> {
	const cdp = await page.context().newCDPSession(page);
	try {
		const { nodes } = await cdp.send("Accessibility.getFullAXTree");
		return nodes
			.filter((node) => !node.ignored && node.role?.value === "navigation")
			.map((node) => String(node.name?.value ?? ""));
	} finally {
		await cdp.detach();
	}
}

/**
 * Focuses `target` with a real Tab press, so `:focus-visible` matches: the
 * tabbable element before it is focused programmatically, then Tab moves on.
 */
async function focusByTab(page: Page, target: Locator): Promise<void> {
	await target.evaluate((node) => {
		const tabbable = Array.from(
			document.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
			),
		).filter(
			(element) =>
				element.tabIndex >= 0 &&
				element.getClientRects().length > 0 &&
				element.closest("[inert]") === null,
		);
		const previous = tabbable[tabbable.indexOf(node as HTMLElement) - 1];
		if (previous === undefined) {
			throw new Error("focusByTab: no tabbable element precedes the target");
		}
		previous.focus({ preventScroll: true });
	});
	await page.keyboard.press("Tab");
	await expect(target).toBeFocused();
}

interface Rect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

interface RingPaint {
	/** The rect the focus ring paints: the border box, grown by any outset ring. */
	ring: Rect;
	/** The padding box of the nearest ancestor that clips overflow. */
	clip: Rect;
	clipSlot: string;
	inset: boolean;
	spread: number;
	boxShadow: string;
}

/**
 * Where the focused row's ring paints, against the nearest ancestor that clips
 * overflow (any `overflow-x`/`overflow-y` other than `visible`). A box-shadow
 * is clipped by an ancestor's overflow, never by the element's own, so the walk
 * starts at the parent; the ancestor is tagged so `boxOf` can measure it. The
 * spread is the largest non-zero spread among the computed shadow layers; an
 * `inset` ring paints inside the border box. The clip's padding box is its
 * border box minus its left/top borders, `clientWidth` by `clientHeight`.
 */
async function ringPaintOf(page: Page, row: Locator): Promise<RingPaint> {
	const style = await row.evaluate((node) => {
		const computed = getComputedStyle(node);
		const layers: string[] = [];
		let depth = 0;
		let current = "";
		for (const char of computed.boxShadow) {
			if (char === "(") depth += 1;
			if (char === ")") depth -= 1;
			if (char === "," && depth === 0) {
				layers.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		layers.push(current.trim());
		let spread = 0;
		let inset = false;
		for (const layer of layers) {
			const lengths = layer
				.replace(/[a-z-]+\([^)]*\)/g, "")
				.match(/-?[\d.]+px/g);
			const value =
				lengths && lengths.length >= 4
					? Number.parseFloat(lengths[3] ?? "0")
					: 0;
			if (value > spread) {
				spread = value;
				inset = /\binset\b/.test(layer);
			}
		}
		for (const tagged of document.querySelectorAll("[data-e2e-ring-clip]")) {
			tagged.removeAttribute("data-e2e-ring-clip");
		}
		let clipNode = node.parentElement;
		while (clipNode !== null) {
			const clipStyle = getComputedStyle(clipNode);
			if (
				clipStyle.overflowX !== "visible" ||
				clipStyle.overflowY !== "visible"
			) {
				break;
			}
			clipNode = clipNode.parentElement;
		}
		const clip = clipNode ?? document.documentElement;
		clip.setAttribute("data-e2e-ring-clip", "");
		const clipStyle = getComputedStyle(clip);
		return {
			spread,
			inset,
			boxShadow: computed.boxShadow,
			clipSlot: clip.getAttribute("data-slot") ?? clip.tagName.toLowerCase(),
			clipBorderLeft: Number.parseFloat(clipStyle.borderLeftWidth),
			clipBorderTop: Number.parseFloat(clipStyle.borderTopWidth),
			clipWidth: clip.clientWidth,
			clipHeight: clip.clientHeight,
		};
	});
	const box = await boxOf(row);
	const clipBox = await boxOf(page.locator("[data-e2e-ring-clip]"));
	await page.evaluate(() => {
		for (const tagged of document.querySelectorAll("[data-e2e-ring-clip]")) {
			tagged.removeAttribute("data-e2e-ring-clip");
		}
	});
	const grow = style.inset ? 0 : style.spread;
	const clipLeft = clipBox.x + style.clipBorderLeft;
	const clipTop = clipBox.y + style.clipBorderTop;
	return {
		ring: {
			left: box.x - grow,
			top: box.y - grow,
			right: box.x + box.width + grow,
			bottom: box.y + box.height + grow,
		},
		clip: {
			left: clipLeft,
			top: clipTop,
			right: clipLeft + style.clipWidth,
			bottom: clipTop + style.clipHeight,
		},
		clipSlot: style.clipSlot,
		inset: style.inset,
		spread: style.spread,
		boxShadow: style.boxShadow,
	};
}

interface RowWidths {
	inner: number;
	coreW: number;
	subW: number;
}

/**
 * Derives the row widths from the rail container instead of hard-coding them:
 * its border box minus its computed left and right borders (the canonical 1px
 * `border-r`) is the inner width; minus the 24px S-2 inset (12px each side) the
 * core row; minus the sub list's 32px `margin-left` the sub row.
 */
async function rowWidths(container: Locator): Promise<RowWidths> {
	const box = await boxOf(container);
	const borders = await container.evaluate((node) => {
		const style = getComputedStyle(node);
		return {
			left: Number.parseFloat(style.borderLeftWidth),
			right: Number.parseFloat(style.borderRightWidth),
		};
	});
	const inner = box.width - borders.left - borders.right;
	const coreW = inner - 24;
	return { inner, coreW, subW: coreW - 32 };
}

/** Logs in with the tour answered locally and the trigger hydrated. */
async function openShell(page: Page): Promise<string[]> {
	const errors = collectHydrationErrors(page);
	await fulfillTourProgressAsCompleted(page);
	await gotoAuthedDashboard(page);
	await waitForHydration(page, TRIGGER);
	return errors;
}

test.describe("S-10: no hydration error and no horizontal scroll", () => {
	test("the hydration collector catches a planted hydration error", async ({
		page,
	}) => {
		const errors = collectHydrationErrors(page);
		await page.goto("about:blank");
		await page.evaluate(() => console.error("Hydration failed probe"));
		await expect.poll(() => errors.length).toBe(1);
		expect(errors).toHaveLength(1);
	});

	for (const cookie of ["absent", "true", "false"] as const) {
		test(`sidebar_state ${cookie}: 375, 900, 1024 and 1280 hydrate cleanly with one main`, async ({
			page,
		}) => {
			test.setTimeout(90_000);
			const errors = collectHydrationErrors(page);
			const tour = await fulfillTourProgressAsCompleted(page);
			if (cookie !== "absent") {
				await seedSidebarCookie(page, cookie);
			}
			await gotoAuthedDashboard(page);

			for (const viewport of VIEWPORTS) {
				await page.setViewportSize(viewport);
				await page.reload();
				await waitForHydration(page, TRIGGER);
				await waitForDashboardContent(page);
				const probe = await polledRead(
					() =>
						page.evaluate(() => ({
							body: document.body.scrollWidth,
							html: document.documentElement.scrollWidth,
							viewport: window.innerWidth,
							mains: document.querySelectorAll("main").length,
							mainContent:
								document.querySelectorAll("main#main-content").length,
						})),
					(value) => value.viewport === viewport.width,
				);
				expect(
					probe.body,
					`body scrollWidth at ${viewport.width}px`,
				).toBeLessThanOrEqual(viewport.width + 1);
				expect(
					probe.html,
					`html scrollWidth at ${viewport.width}px`,
				).toBeLessThanOrEqual(viewport.width + 1);
				expect(probe.mains, `main count at ${viewport.width}px`).toBe(1);
				expect(
					probe.mainContent,
					`main#main-content count at ${viewport.width}px`,
				).toBe(1);
			}

			expect(errors).toEqual([]);
			if (cookie === "false") {
				expect(await ssrSidebarState(page)).toBe("collapsed");
			}
			expect(tour.writes, "user_tour_progress writes answered").toBe(0);
		});
	}
});

const CORE_LABELS = [
	"Dashboard",
	"Properties",
	"Tenants",
	"Leases",
	"Applications",
	"Maintenance",
	"Documents",
];

test.describe("desktop rail at 1280px", () => {
	test("S-2/S-9: geometry, list neutralizers and locked navigation (D-40, D-49)", async ({
		page,
	}) => {
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const container = sidebar.locator('[data-slot="sidebar-container"]');

		const rail = await boxOf(container);
		expectNear(rail.x, 0, "rail container x");
		expectNear(rail.y, 0, "rail container y");
		expectNear(rail.width, 224, "rail container width");
		expectNear(rail.height, 720, "rail container height");

		const widths = await rowWidths(container);
		expect(widths.coreW, "CORE_W").toBeGreaterThanOrEqual(199 - 0.5);
		expect(widths.coreW, "CORE_W").toBeLessThanOrEqual(200 + 0.5);
		record("rail container box", rail);
		record("row widths", widths);

		const coreMenu = sidebar.locator('[data-slot="sidebar-menu"]').first();
		const coreRows = coreMenu.locator(
			':scope > [data-slot="sidebar-menu-item"] > [data-slot="sidebar-menu-button"]',
		);
		const rows = await boxesOf(coreRows, { min: 7 });
		expect(rows).toHaveLength(7);
		record("core rows", rows);
		rows.forEach((row, index) => {
			expectNear(row.width, widths.coreW, `core row ${index} width`);
			expectNear(row.height, 40, `core row ${index} height`);
			const next = rows[index + 1];
			if (next !== undefined) {
				expectNear(next.y - (row.y + row.height), 2, `gap after row ${index}`);
			}
		});

		for (const [index, label] of CORE_LABELS.entries()) {
			const row = coreRows.nth(index);
			const text = (await row.innerText()).trim();
			expect(text, `core row ${index} label`).toBe(label);
			await expect(row, `core row ${index} label-in-name`).toHaveAccessibleName(
				text,
			);
		}
		await expect(
			coreMenu.locator('[data-slot="sidebar-menu-sub"]'),
		).toHaveCount(0);

		const toggles = sidebar.locator('[data-slot="collapsible-trigger"]');
		await expect(toggles).toHaveCount(2);
		await expect(toggles.nth(0)).toHaveAccessibleName("Analytics");
		await expect(toggles.nth(1)).toHaveAccessibleName("Reports");

		await expect(sidebar.getByRole("link", { name: "Templates" })).toHaveCount(
			0,
		);
		await expect(
			sidebar.getByRole("button", { name: "Templates" }),
		).toHaveCount(0);

		const footer = sidebar.locator('[data-slot="sidebar-footer"]');
		const footerLinks = footer.getByRole("link");
		await expect(footerLinks).toHaveCount(2);
		await expect(footerLinks.nth(0)).toHaveAccessibleName("Settings");
		await expect(footerLinks.nth(0)).toHaveAttribute("href", "/settings");
		await expect(footerLinks.nth(1)).toHaveAccessibleName("Help & Support");
		await expect(footerLinks.nth(1)).toHaveAttribute("href", "/help");

		const menus = await sidebar
			.locator('[data-slot="sidebar-menu"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => {
					const style = getComputedStyle(node);
					return {
						marginTop: style.marginTop,
						marginBottom: style.marginBottom,
						paddingLeft: style.paddingLeft,
					};
				}),
			);
		expect(menus).toHaveLength(3);
		for (const menu of menus) {
			expect(menu).toEqual({
				marginTop: "0px",
				marginBottom: "0px",
				paddingLeft: "0px",
			});
		}
		const items = await sidebar
			.locator('[data-slot="sidebar-menu-item"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => getComputedStyle(node).marginBottom),
			);
		expect(items.length).toBeGreaterThanOrEqual(9);
		expect(items.every((value) => value === "0px")).toBe(true);
		// Every list item of every menu, the section items included: Collapsible
		// asChild hands them its own data-slot.
		const listItems = await sidebar
			.locator('[data-slot="sidebar-menu"] > li')
			.evaluateAll((nodes) =>
				nodes.map((node) => getComputedStyle(node).marginBottom),
			);
		expect(listItems).toHaveLength(11);
		expect(listItems.every((value) => value === "0px")).toBe(true);

		// The S-2 survivors twMerge keeps and the cascade decides (66.2-34): the
		// row's `p-2` loses to `px-3`, the footer's `p-2` to `px-3 pt-4 pb-2`.
		const rowPadding = await coreRows.first().evaluate((node) => {
			const style = getComputedStyle(node);
			return [
				style.paddingTop,
				style.paddingRight,
				style.paddingBottom,
				style.paddingLeft,
			];
		});
		expect(rowPadding).toEqual(["8px", "12px", "8px", "12px"]);
		const footerPadding = await footer.evaluate((node) => {
			const style = getComputedStyle(node);
			return [
				style.paddingTop,
				style.paddingRight,
				style.paddingBottom,
				style.paddingLeft,
			];
		});
		expect(footerPadding).toEqual(["16px", "12px", "8px", "12px"]);
		record("core row and footer padding (t r b l)", {
			rowPadding,
			footerPadding,
		});

		const content = sidebar.locator('[data-slot="sidebar-content"]');
		const separator = content
			.locator('[data-slot="sidebar-separator"]')
			.first();
		await expect(separator).toHaveCSS("margin-top", "24px");
		await expect(separator).toHaveCSS("margin-bottom", "16px");
		const contentBox = await boxOf(content);
		const separatorBox = await boxOf(separator);
		record("content and separator boxes", { contentBox, separatorBox });
		expectNear(separatorBox.x, contentBox.x + 12, "separator left edge");
		expectNear(
			separatorBox.x + separatorBox.width,
			contentBox.x + contentBox.width - 12,
			"separator right edge",
		);

		const scroll = await polledRead(
			() =>
				content.evaluate((node) => ({
					scrollWidth: node.scrollWidth,
					clientWidth: node.clientWidth,
				})),
			(value) => value.clientWidth > 0,
		);
		expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);

		expect(errors).toEqual([]);
	});

	test("VD-27/VD-35: active section open, sub rows and pinned footer", async ({
		page,
	}) => {
		const errors = await openShell(page);
		await page.goto("/reports/cash-flow");
		await waitForHydration(page, TRIGGER);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const container = sidebar.locator('[data-slot="sidebar-container"]');

		const reports = sidebar.locator('[data-slot="collapsible-trigger"]', {
			hasText: "Reports",
		});
		await expect(reports).toHaveAttribute("aria-expanded", "true");
		const cashFlow = sidebar.locator('[data-slot="sidebar-menu-sub-button"]', {
			hasText: "Cash Flow",
		});
		await expect(cashFlow).toHaveAttribute("aria-current", "page");
		await expect(cashFlow).toHaveAttribute("data-active", "true");

		const widths = await rowWidths(container);
		const dashboardRow = await boxOf(
			sidebar
				.locator('[data-slot="sidebar-menu"]')
				.first()
				.locator('[data-slot="sidebar-menu-button"]')
				.first(),
		);
		const subList = sidebar.locator('[data-slot="sidebar-menu-sub"]');
		await expect(subList).toHaveCount(1);
		const subRows = await boxesOf(
			subList.locator('[data-slot="sidebar-menu-sub-button"]'),
			{ min: 7 },
		);
		expect(subRows).toHaveLength(7);
		record("sub rows", { dashboardRowX: dashboardRow.x, widths, subRows });
		subRows.forEach((row, index) => {
			expectNear(row.width, widths.subW, `sub row ${index} width`);
			expectNear(row.height, 36, `sub row ${index} height`);
			expectNear(row.x, dashboardRow.x + 32, `sub row ${index} x`);
		});

		const subStyle = await subList.evaluate((node) => {
			const style = getComputedStyle(node);
			return {
				marginTop: style.marginTop,
				marginBottom: style.marginBottom,
				marginLeft: style.marginLeft,
				paddingTop: style.paddingTop,
				paddingRight: style.paddingRight,
				paddingBottom: style.paddingBottom,
				paddingLeft: style.paddingLeft,
				borderLeftWidth: style.borderLeftWidth,
			};
		});
		// The logical `px-2.5` survives twMerge and loses the cascade to the
		// physical `pl-0 pr-0` (S-2, PATTERNS #1); jsdom cannot model it.
		expect(subStyle).toEqual({
			marginTop: "0px",
			marginBottom: "0px",
			marginLeft: "32px",
			paddingTop: "4px",
			paddingRight: "0px",
			paddingBottom: "4px",
			paddingLeft: "0px",
			borderLeftWidth: "0px",
		});
		record("sub list computed", subStyle);
		const subItems = await subList
			.locator('[data-slot="sidebar-menu-sub-item"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => getComputedStyle(node).marginBottom),
			);
		expect(subItems).toHaveLength(7);
		expect(subItems.every((value) => value === "0px")).toBe(true);

		await sidebar
			.locator('[data-slot="collapsible-trigger"]', { hasText: "Analytics" })
			.click();
		await expect(subList).toHaveCount(2);
		const content = sidebar.locator('[data-slot="sidebar-content"]');
		const scroll = await polledRead(
			() =>
				content.evaluate((node) => ({
					scrollHeight: node.scrollHeight,
					clientHeight: node.clientHeight,
				})),
			(value) => value.clientHeight > 0,
		);
		expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
		await expect(
			sidebar.locator('[data-slot="sidebar-footer"]'),
		).toBeInViewport();

		await cashFlow.hover();
		await expect(cashFlow).toHaveCSS("text-decoration-line", "none");

		expect(errors).toEqual([]);
	});

	test("VD-26/VD-34: hover never underlines, current row keeps its tint, focus ring", async ({
		page,
	}) => {
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const coreRows = sidebar
			.locator('[data-slot="sidebar-menu"]')
			.first()
			.locator('[data-slot="sidebar-menu-button"]');
		const dashboardRow = coreRows.nth(0);
		const propertiesRow = coreRows.nth(1);

		const logo = sidebar
			.locator('[data-slot="sidebar-header"]')
			.getByRole("link", { name: "TenantFlow" });
		await logo.hover();
		await expect(logo).toHaveCSS("text-decoration-line", "none");

		const accent = await resolveColor(page, "--sidebar-accent");
		await propertiesRow.hover();
		await expect(propertiesRow).toHaveCSS("text-decoration-line", "none");
		await expect(propertiesRow).toHaveCSS("background-color", accent);

		await page.mouse.move(1000, 600);
		const resting = await dashboardRow.evaluate(
			(node) => getComputedStyle(node).backgroundColor,
		);
		expect(resting).not.toBe("rgba(0, 0, 0, 0)");
		await dashboardRow.hover();
		await expect(dashboardRow).toHaveCSS("text-decoration-line", "none");
		const hovered = await dashboardRow.evaluate(
			(node) => getComputedStyle(node).backgroundColor,
		);
		expect(hovered).toBe(resting);

		await page.mouse.move(1000, 600);
		await page.evaluate(() => {
			const start = document.createElement("div");
			start.id = "e2e-focus-start";
			start.tabIndex = -1;
			document.body.prepend(start);
			start.focus();
		});
		let focused = false;
		for (let press = 0; press < 12 && !focused; press += 1) {
			await page.keyboard.press("Tab");
			focused = await dashboardRow.evaluate(
				(node) => node === document.activeElement,
			);
		}
		await page.evaluate(() => {
			document.getElementById("e2e-focus-start")?.remove();
		});
		expect(focused, "12 Tab presses never focused the Dashboard row").toBe(
			true,
		);
		const ring = await resolveColor(page, "--sidebar-ring");
		const shadow = await dashboardRow.evaluate(
			(node) => getComputedStyle(node).boxShadow,
		);
		expect(shadow).toContain("0px 0px 0px 2px");
		expect(shadow).toContain(ring);

		expect(errors).toEqual([]);
	});

	test("D-34/D-52/D-36: collapse controls, shortcut guards, cookie and SSR state (T-COOKIE)", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		await captureCookieWrites(page);
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const trigger = page.locator(TRIGGER);
		const rail = page.locator(RAIL);

		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await rail.click({ position: { x: 12, y: 200 } });
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		// The rail stays clickable from the collapsed state: it sits outside every
		// inert subtree (D-34).
		await rail.click({ position: { x: 12, y: 200 } });
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await page.keyboard.press("ControlOrMeta+b");
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await page.keyboard.press("ControlOrMeta+b");
		await expect(sidebar).toHaveAttribute("data-state", "expanded");

		// Shortcut guards: a synthetic Ctrl+B on an editable target is ignored
		// without preventDefault. The cookie write is synchronous inside setOpen,
		// so an unchanged write count proves no toggle ran.
		const writesBeforeGuards = (await readCookieWrites(page)).length;
		const prevented = await page.evaluate(() => {
			const main = document.querySelector("main#main-content");
			if (main === null) {
				throw new Error("main#main-content is missing");
			}
			const input = document.createElement("input");
			input.setAttribute("data-e2e-shortcut-probe", "");
			const editable = document.createElement("div");
			editable.setAttribute("contenteditable", "true");
			editable.setAttribute("data-e2e-shortcut-probe", "");
			main.append(input, editable);
			const fire = (target: EventTarget) =>
				!target.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "b",
						ctrlKey: true,
						bubbles: true,
						cancelable: true,
					}),
				);
			return { input: fire(input), editable: fire(editable) };
		});
		expect(prevented).toEqual({ input: false, editable: false });
		expect((await readCookieWrites(page)).length).toBe(writesBeforeGuards);
		await expect(sidebar).toHaveAttribute("data-state", "expanded");

		// Positive control: the same event on document.body is handled.
		const bodyPrevented = await page.evaluate(
			() =>
				!document.body.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "b",
						ctrlKey: true,
						bubbles: true,
						cancelable: true,
					}),
				),
		);
		expect(bodyPrevented).toBe(true);
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await page.evaluate(() => {
			for (const node of document.querySelectorAll(
				"[data-e2e-shortcut-probe]",
			)) {
				node.remove();
			}
		});

		// Palette guard: Ctrl/Meta+B is ignored while the palette is open.
		await page.keyboard.press("ControlOrMeta+k");
		const palette = page.getByPlaceholder("Search pages and actions...");
		await expect(palette).toBeVisible();
		await expect(palette).toBeFocused();
		const writesBeforePalette = (await readCookieWrites(page)).length;
		await page.keyboard.press("ControlOrMeta+b");
		expect((await readCookieWrites(page)).length).toBe(writesBeforePalette);
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await page.keyboard.press("Escape");
		await expect(palette).toBeHidden();

		const https = await page.evaluate(() => location.protocol === "https:");
		const writes = await readCookieWrites(page);
		expect(writes.length).toBeGreaterThanOrEqual(8);
		for (const write of writes) {
			expect(write).toMatch(
				/^sidebar_state=(true|false); path=\/; max-age=604800; SameSite=Lax(; Secure)?$/,
			);
			expect(write.endsWith("; Secure"), `Secure on ${write}`).toBe(https);
		}
		record("cookie writes", { https, count: writes.length, writes });

		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		const jar = (await page.context().cookies()).find(
			(cookie) => cookie.name === SIDEBAR_COOKIE,
		);
		expect(jar, "sidebar_state is in the browser jar").toBeDefined();
		if (jar === undefined) {
			throw new Error("sidebar_state is not in the browser jar");
		}
		expect({
			value: jar.value,
			sameSite: jar.sameSite,
			path: jar.path,
			httpOnly: jar.httpOnly,
			secure: jar.secure,
		}).toEqual({
			value: "false",
			sameSite: "Lax",
			path: "/",
			httpOnly: false,
			secure: https,
		});
		expect(
			Math.abs(jar.expires - (Date.now() / 1000 + COOKIE_MAX_AGE_S)),
			"cookie expiry vs now + 604800 s",
		).toBeLessThanOrEqual(120);
		record("cookie jar", {
			sameSite: jar.sameSite,
			path: jar.path,
			httpOnly: jar.httpOnly,
			secure: jar.secure,
			expiresInS: Math.round(jar.expires - Date.now() / 1000),
		});

		expect(await ssrSidebarState(page)).toBe("collapsed");
		await seedSidebarCookie(page, "garbage");
		expect(await ssrSidebarState(page)).toBe("expanded");
		await seedSidebarCookie(page, "true");
		expect(await ssrSidebarState(page)).toBe("expanded");

		expect(errors).toEqual([]);
	});

	test("S12/VD-37: collapsed rail is inert and skipped by Tab; dock re-centers", async ({
		page,
	}) => {
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const trigger = page.locator(TRIGGER);
		const dock = page.getByTestId("quick-actions-dock");
		const logo = sidebar
			.locator('[data-slot="sidebar-header"]')
			.getByRole("link", { name: "TenantFlow" });

		await expect(dock).toHaveCSS("left", "752px");
		expect(
			await logo.evaluate((node) => node.closest("[inert]") === null),
		).toBe(true);
		const expandedWalk = await tabWalk(page, 15);
		expect(
			expandedWalk.filter((stop) => stop.inSidebar).length,
			"Tab stops inside the expanded rail",
		).toBeGreaterThanOrEqual(1);
		// The rail's one unnamed `nav` (S-1) is exposed while expanded: this is the
		// positive control for the collapsed read below.
		await expect
			.poll(
				async () =>
					(await exposedNavigationNames(page)).filter((name) => name === "")
						.length,
				{ message: "unnamed navigation landmarks, rail expanded" },
			)
			.toBe(1);

		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await expect(dock).toHaveCSS("left", "640px");
		expect(
			await logo.evaluate((node) => node.closest("[inert]") !== null),
		).toBe(true);
		const collapsedWalk = await tabWalk(page, 15);
		expect(
			collapsedWalk.filter((stop) => stop.inSidebar).length,
			"Tab stops inside the collapsed rail",
		).toBe(0);
		// S-5: the collapsed rail is hidden from assistive tech, its `nav`
		// landmark included, not only the regions inside it.
		await expect
			.poll(
				async () =>
					(await exposedNavigationNames(page)).filter((name) => name === "")
						.length,
				{ message: "unnamed navigation landmarks, rail collapsed" },
			)
			.toBe(0);
		expect(
			await sidebar
				.getByRole("navigation")
				.evaluate((node) => node.closest("[inert]") !== null),
			"the rail nav sits inside an inert subtree",
		).toBe(true);
		expect(
			collapsedWalk.filter((stop) => stop.isTrigger).length,
			"the collapsed walk reached the trigger",
		).toBeGreaterThanOrEqual(1);

		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await expect(dock).toHaveCSS("left", "752px");

		expect(errors).toEqual([]);
	});

	test("D-34: collapsing with focus inside the rail moves focus to the trigger", async ({
		page,
	}) => {
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const trigger = page.locator(TRIGGER);
		const rail = page.locator(RAIL);
		const dashboardRow = sidebar
			.locator('[data-slot="sidebar-menu"]')
			.first()
			.locator('[data-slot="sidebar-menu-button"]')
			.first();

		// Shortcut path: focus on a rail link, then Cmd/Ctrl+B.
		await dashboardRow.focus();
		await expect(dashboardRow).toBeFocused();
		await page.keyboard.press("ControlOrMeta+b");
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await expect(trigger).toBeFocused();
		// From the trigger the shortcut expands again and focus stays put.
		await page.keyboard.press("ControlOrMeta+b");
		await expect(sidebar).toHaveAttribute("data-state", "expanded");
		await expect(trigger).toBeFocused();

		// Rail path: the click focuses the rail button inside the sidebar.
		await dashboardRow.focus();
		await rail.click({ position: { x: 12, y: 200 } });
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		await expect(trigger).toBeFocused();
		await trigger.click();
		await expect(sidebar).toHaveAttribute("data-state", "expanded");

		expect(errors).toEqual([]);
	});

	test("VD-34: every row's focus ring paints inside its clipping ancestor", async ({
		page,
	}) => {
		const errors = await openShell(page);
		await page.goto("/reports/cash-flow");
		await waitForHydration(page, TRIGGER);
		const sidebar = page.locator(DESKTOP_SIDEBAR);
		const reports = sidebar.locator('[data-slot="collapsible-trigger"]', {
			hasText: "Reports",
		});
		await expect(reports).toHaveAttribute("aria-expanded", "true");
		const ring = await resolveColor(page, "--sidebar-ring");

		const rows: Array<{ label: string; row: Locator; inset: boolean }> = [
			{
				label: "core row Dashboard",
				row: sidebar
					.locator('[data-slot="sidebar-menu"]')
					.first()
					.locator('[data-slot="sidebar-menu-button"]')
					.first(),
				inset: false,
			},
			{ label: "section toggle Reports", row: reports, inset: false },
			{
				label: "sub row Income Statement",
				row: sidebar.locator('[data-slot="sidebar-menu-sub-button"]', {
					hasText: "Income Statement",
				}),
				inset: true,
			},
			{
				label: "current sub row Cash Flow",
				row: sidebar.locator('[data-slot="sidebar-menu-sub-button"]', {
					hasText: "Cash Flow",
				}),
				inset: true,
			},
			{
				label: "footer row Settings",
				row: sidebar
					.locator('[data-slot="sidebar-footer"]')
					.locator('[data-slot="sidebar-menu-button"]')
					.first(),
				inset: false,
			},
		];

		for (const { label, row, inset } of rows) {
			await focusByTab(page, row);
			const paint = await ringPaintOf(page, row);
			record(`ring paint ${label}`, paint);
			expect(paint.boxShadow, `${label}: ring color`).toContain(ring);
			expect(paint.spread, `${label}: ring width`).toBe(2);
			expect(
				paint.ring.left,
				`${label}: ring left vs ${paint.clipSlot}`,
			).toBeGreaterThanOrEqual(paint.clip.left - 0.5);
			expect(
				paint.ring.top,
				`${label}: ring top vs ${paint.clipSlot}`,
			).toBeGreaterThanOrEqual(paint.clip.top - 0.5);
			expect(
				paint.ring.right,
				`${label}: ring right vs ${paint.clipSlot}`,
			).toBeLessThanOrEqual(paint.clip.right + 0.5);
			expect(
				paint.ring.bottom,
				`${label}: ring bottom vs ${paint.clipSlot}`,
			).toBeLessThanOrEqual(paint.clip.bottom + 0.5);
			// The mechanism (S-3): sub rows sit flush with the clipping
			// CollapsibleContent's inline end, so their ring is inset.
			expect(paint.inset, `${label}: inset ring`).toBe(inset);
		}

		expect(errors).toEqual([]);
	});

	test("D-41/D-44: zero WCAG 2.1 A/AA violations, rail expanded and collapsed", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		const errors = await openShell(page);
		const sidebar = page.locator(DESKTOP_SIDEBAR);

		const expanded = await new AxeBuilder({ page })
			.withTags(WCAG_2_1_AA_TAGS)
			.analyze();
		expect(expanded.violations).toEqual([]);

		await page.locator(TRIGGER).click();
		await expect(sidebar).toHaveAttribute("data-state", "collapsed");
		const collapsed = await new AxeBuilder({ page })
			.withTags(WCAG_2_1_AA_TAGS)
			.analyze();
		expect(collapsed.violations).toEqual([]);

		expect(errors).toEqual([]);
	});
});

/**
 * The dashboard at a sheet width, after `useIsMobile` has switched the sidebar
 * into its sheet mode: the desktop branch is gone and the closed sheet is not
 * mounted. Clicking the trigger before that switch would collapse the desktop
 * rail instead of opening the sheet.
 */
async function openSheetShell(page: Page): Promise<string[]> {
	const errors = await openShell(page);
	await expect(page.locator(DESKTOP_SIDEBAR)).toHaveCount(0);
	return errors;
}

/** Opens the nav sheet from the trigger and returns the dialog. */
async function openSheet(page: Page): Promise<Locator> {
	await page.locator(TRIGGER).click();
	const sheet = page.getByRole("dialog", { name: "Navigation menu" });
	await expect(sheet).toBeVisible();
	return sheet;
}

/**
 * Readiness gate for Escape layering, not the property under test. Radix
 * DismissableLayer (1.2.1) attaches each layer's Escape listener in an effect
 * keyed on whether that layer was the highest one at its last render. When the
 * palette mounts over the sheet, both layers learn the new stack only on a
 * re-render that the palette's mount effect schedules, so for about a frame the
 * sheet still holds the only Escape listener (measured: 6 of 10 production-build
 * runs closed the sheet when Escape followed the palette's focus). The same
 * re-render restyles both layers while body pointer events are disabled: the
 * palette's content becomes `pointer-events: auto` and the sheet's `none`. Wait
 * for both, then one frame for the effects of that commit to run.
 */
async function waitForLayerStack(page: Page, lower: Locator): Promise<void> {
	await expect(page.getByRole("dialog", { name: "Command Palette" })).toHaveCSS(
		"pointer-events",
		"auto",
	);
	await expect(lower).toHaveCSS("pointer-events", "none");
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => setTimeout(resolve, 0));
			}),
	);
}

const SHEET_VIEWPORTS = [
	{ width: 375, height: 667 },
	{ width: 900, height: 800 },
] as const;

for (const viewport of SHEET_VIEWPORTS) {
	test.describe(`mobile sheet at ${viewport.width}px`, () => {
		test.use({ viewport });

		test("open: named Radix dialog, 288px, focus moves in and stays trapped (D-41)", async ({
			page,
		}) => {
			const errors = await openSheetShell(page);
			const trigger = page.locator(TRIGGER);
			const sheet = page.getByRole("dialog", { name: "Navigation menu" });

			// The dock is `hidden lg:block` (66.2-35): absent below 64rem.
			await expect(page.getByTestId("quick-actions-dock")).toBeHidden();

			await expect(trigger).toHaveAccessibleName("Toggle navigation menu");
			await expect(trigger).toHaveAttribute("aria-expanded", "false");
			await trigger.click();
			await expect(sheet).toBeVisible();
			await expect(sheet).toHaveAccessibleDescription(
				"Main navigation for your TenantFlow account",
			);
			await expect(trigger).toHaveAttribute("aria-expanded", "true");

			const sheetBox = await boxOf(page.locator(MOBILE_SHEET));
			record("sheet box", sheetBox);
			expectNear(sheetBox.width, 288, "sheet width");
			expectNear(sheetBox.x, 0, "sheet x");

			await expect
				.poll(() =>
					sheet.evaluate((node) => node.contains(document.activeElement)),
				)
				.toBe(true);
			const presses = [...Array.from({ length: 30 }, () => "Tab"), "Shift+Tab"];
			for (const [index, key] of presses.entries()) {
				await page.keyboard.press(key);
				const inside = await page.evaluate(
					(selector) => document.activeElement?.closest(selector) != null,
					MOBILE_SHEET,
				);
				expect(
					inside,
					`focus inside the sheet after press ${index + 1} (${key})`,
				).toBe(true);
			}

			expect(
				await page
					.locator("main#main-content")
					.evaluate((node) => node.closest('[aria-hidden="true"]') !== null),
				"main#main-content is under an aria-hidden ancestor",
			).toBe(true);
			expect(
				await page.evaluate(() => getComputedStyle(document.body).overflow),
			).toBe("hidden");

			expect(errors).toEqual([]);
		});

		test("every close path returns focus to the trigger (D-46, D-47, D-48)", async ({
			page,
		}) => {
			test.setTimeout(60_000);
			const errors = await openSheetShell(page);
			const trigger = page.locator(TRIGGER);
			const sheetElement = page.locator(MOBILE_SHEET);

			let sheet = await openSheet(page);
			const closeButtons = sheet.getByRole("button", { name: /close/i });
			await expect(closeButtons).toHaveCount(1);
			const close = closeButtons.first();
			await expect(close).toBeVisible();
			await expect(close).toHaveAccessibleName("Close navigation menu");
			const closeBox = await boxOf(close);
			record("close button box", closeBox);
			expectNear(closeBox.width, 44, "close button width");
			expectNear(closeBox.height, 44, "close button height");
			await expect(
				sheet.getByRole("button", { name: "Close", exact: true }),
			).toHaveCount(0);
			// The sheet's own corner X exists and is hidden, not absent.
			await expect(page.locator(`${MOBILE_SHEET} > button`)).toHaveCount(1);
			await expect(page.locator(`${MOBILE_SHEET} > button`)).toHaveCSS(
				"display",
				"none",
			);

			const expectClosedWithFocusOnTrigger = async (path: string) => {
				await expect(sheetElement, `sheet hidden after ${path}`).toBeHidden();
				await expect(trigger, `trigger focused after ${path}`).toBeFocused();
			};

			await page.keyboard.press("Escape");
			await expectClosedWithFocusOnTrigger("Escape");

			sheet = await openSheet(page);
			await sheet
				.getByRole("button", { name: "Close navigation menu" })
				.click();
			await expectClosedWithFocusOnTrigger("the close button");

			sheet = await openSheet(page);
			// The left sheet ends at 288px, so this point is on the scrim.
			await page.mouse.click(viewport.width - 10, 100);
			await expectClosedWithFocusOnTrigger("a scrim click");

			sheet = await openSheet(page);
			await sheet
				.getByRole("link", { name: "Properties", exact: true })
				.click();
			await page.waitForURL("**/properties");
			await expectClosedWithFocusOnTrigger("the Properties link");

			await page.goto("/dashboard");
			await waitForHydration(page, TRIGGER);
			await expect(page.locator(DESKTOP_SIDEBAR)).toHaveCount(0);
			// Readiness gate: the dashboard's data tables write their nuqs page
			// state into the URL once their data lands, and a write that lands
			// while the palette's router.push is in flight replaces it (measured:
			// two "/dashboard?page=1&perPage=10" navigations and no /properties in
			// 2 of 16 production-build runs; deferred-items.md). Let the page
			// finish loading before the palette navigates.
			await waitForDashboardContent(page);
			await page.waitForLoadState("networkidle");
			sheet = await openSheet(page);
			const palette = page.getByPlaceholder("Search pages and actions...");
			await page.keyboard.press("ControlOrMeta+k");
			await expect(palette).toBeVisible();
			await expect(palette).toBeFocused();
			await waitForLayerStack(page, sheetElement);
			await expect(sheetElement).toHaveAttribute("data-state", "open");
			// Escape layering: one Escape closes only the palette.
			await page.keyboard.press("Escape");
			await expect(palette).toBeHidden();
			await expect(sheetElement).toHaveAttribute("data-state", "open");
			await expect(sheet).toBeVisible();

			await page.keyboard.press("ControlOrMeta+k");
			await expect(palette).toBeVisible();
			await expect(palette).toBeFocused();
			await palette.fill("Properties");
			await page
				.getByRole("option", { name: "Properties", exact: true })
				.click();
			await page.waitForURL("**/properties");
			await expect(palette).toBeHidden();
			await expectClosedWithFocusOnTrigger("a palette selection");

			expect(errors).toEqual([]);
		});

		test("scoped axe on the open sheet, including aria-dialog-name (D-41)", async ({
			page,
		}) => {
			const errors = await openSheetShell(page);
			await openSheet(page);

			const scoped = await new AxeBuilder({ page })
				.include(MOBILE_SHEET)
				.withTags(WCAG_2_1_AA_TAGS)
				.analyze();
			expect(scoped.violations).toEqual([]);

			const dialogName = await new AxeBuilder({ page })
				.include(MOBILE_SHEET)
				.withRules(["aria-dialog-name"])
				.analyze();
			expect(dialogName.violations).toEqual([]);
			expect(
				dialogName.passes.some((rule) => rule.id === "aria-dialog-name"),
				"aria-dialog-name evaluated the sheet",
			).toBe(true);

			expect(errors).toEqual([]);
		});

		if (viewport.width === 375) {
			test("every sheet row is at least 44px below 48rem (VD-33)", async ({
				page,
			}) => {
				const errors = await openSheetShell(page);
				const sheet = await openSheet(page);

				// D-50: sweeps that read children open the sections first.
				const toggles = sheet.locator('[data-slot="collapsible-trigger"]');
				await expect(toggles).toHaveCount(2);
				for (const toggle of await toggles.all()) {
					if ((await toggle.getAttribute("aria-expanded")) === "false") {
						await toggle.click();
						await expect(toggle).toHaveAttribute("aria-expanded", "true");
					}
				}
				await expect(
					sheet.locator('[data-slot="sidebar-menu-sub-button"]'),
				).toHaveCount(10);

				const rows = await boxesOf(
					page.locator(
						`${MOBILE_SHEET} [data-slot="sidebar-menu-button"], ${MOBILE_SHEET} [data-slot="collapsible-trigger"], ${MOBILE_SHEET} [data-slot="sidebar-menu-sub-button"]`,
					),
					{ min: 21 },
				);
				expect(rows).toHaveLength(21);
				record("sheet row heights at 375", {
					min: Math.min(...rows.map((row) => row.height)),
					heights: rows.map((row) => row.height),
				});
				rows.forEach((row, index) => {
					expect(
						row.height,
						`sheet row ${index} height ${row.height}`,
					).toBeGreaterThanOrEqual(44 - 0.5);
				});

				expect(errors).toEqual([]);
			});
		}
	});
}

const TRIGGER_STEP_COPY =
	"Access Properties, Tenants, Leases, and more from the menu.";

/**
 * Opens the onboarding tour and advances it to step 5. The `user_tour_progress`
 * route is installed BEFORE `loginAsOwner`: GET answers 200 `[]` (postgrest-js
 * `maybeSingle()` maps an empty array to null, i.e. "not started") and every
 * other method 201 with an empty body ("persisted"), so the tour opens and no
 * production row is written. The localStorage tour key is deliberately unset.
 */
async function openTourAtStep5(
	page: Page,
): Promise<{ step: Locator; traffic: TourProgressTraffic }> {
	const traffic: TourProgressTraffic = { gets: 0, writes: 0 };
	await page.route(TOUR_PROGRESS_ROUTE, async (route) => {
		if (route.request().method() === "GET") {
			traffic.gets += 1;
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				headers: { "access-control-allow-origin": "*" },
				body: "[]",
			});
			return;
		}
		traffic.writes += 1;
		await route.fulfill({
			status: 201,
			headers: { "access-control-allow-origin": "*" },
			body: "",
		});
	});
	await loginAsOwner(page);

	const populated = page.getByTestId("kpi-bento-row");
	const empty = page.locator('[data-slot="empty-title"]', {
		hasText: "Welcome to TenantFlow",
	});
	await expect(populated.or(empty)).toBeVisible({ timeout: 15000 });
	if (await empty.isVisible()) {
		throw new Error(
			"Tour step 5 is unreachable on the empty-state dashboard: steps 2 and 4 have no target there. The dashboard-smoke header records owner A as populated; restore owner A's data.",
		);
	}
	await waitForHydration(page, TRIGGER);

	const step = page.locator('[data-slot="tour-step"]');
	await expect(step).toBeVisible({ timeout: 20000 });
	const title = step.locator('[data-slot="tour-title"]');
	for (let click = 0; click < 4; click += 1) {
		const current = (await title.innerText()).trim();
		if (current === "Navigate Your Portal") {
			break;
		}
		// Keyboard activation, as a keyboard user would: at 1280x720 with the rail
		// expanded, step 1 places its footer below the fold of the fixed layer,
		// where a pointer click cannot reach it (deferred-items.md, 66.2-36).
		await step.getByRole("button", { name: "Next step" }).focus();
		await page.keyboard.press("Enter");
		await expect(title).not.toHaveText(current);
	}
	await expect(title).toHaveText("Navigate Your Portal");
	return { step, traffic };
}

/**
 * The step's box once floating-ui has placed it. The step first renders at
 * `translate(0px, 0px)` from the viewport origin and moves when the async
 * `computePosition` resolves, so neither a box nor a transform marks the
 * placement. Two consecutive poll reads (at least 100ms apart) returning the
 * same box do: that gate is layout settling, independent of where the step
 * lands.
 */
async function placedStepBox(step: Locator): Promise<Box> {
	let previous: Box | null = null;
	const settled = await polledRead(
		async () => {
			const box = await boxOf(step);
			const stable =
				previous !== null &&
				previous.x === box.x &&
				previous.y === box.y &&
				previous.width === box.width &&
				previous.height === box.height;
			previous = box;
			return { box, stable };
		},
		(read) => read.stable,
	);
	return settled.box;
}

/** The step's box lies inside the viewport (±0.5). */
function expectInsideViewport(
	box: Box,
	viewport: { width: number; height: number },
): void {
	expect(box.x, "step left edge").toBeGreaterThanOrEqual(-0.5);
	expect(box.y, "step top edge").toBeGreaterThanOrEqual(-0.5);
	expect(box.x + box.width, "step right edge").toBeLessThanOrEqual(
		viewport.width + 0.5,
	);
	expect(box.y + box.height, "step bottom edge").toBeLessThanOrEqual(
		viewport.height + 0.5,
	);
}

test.describe("tour step 5 targets the trigger when the sidebar is a sheet or collapsed (D-39, VD-36)", () => {
	const triggerCases = [
		{
			label: "375px sheet",
			viewport: { width: 375, height: 667 },
			collapsed: false,
		},
		{
			label: "900px sheet",
			viewport: { width: 900, height: 800 },
			collapsed: false,
		},
		{
			label: "1280px collapsed",
			viewport: { width: 1280, height: 720 },
			collapsed: true,
		},
	] as const;

	for (const testCase of triggerCases) {
		test(`${testCase.label}: step 5 sits below the trigger with the menu copy`, async ({
			page,
		}) => {
			test.setTimeout(60_000);
			const errors = collectHydrationErrors(page);
			await page.setViewportSize(testCase.viewport);
			if (testCase.collapsed) {
				await seedSidebarCookie(page, "false");
			}
			const { step, traffic } = await openTourAtStep5(page);

			await expect(step).toContainText(TRIGGER_STEP_COPY);
			const stepBox = await placedStepBox(step);
			const triggerBox = await boxOf(page.locator(TRIGGER));
			record("tour step and trigger boxes", { stepBox, triggerBox });
			expectInsideViewport(stepBox, testCase.viewport);
			expect(stepBox.y, "step top vs trigger bottom").toBeGreaterThanOrEqual(
				triggerBox.y + triggerBox.height - 0.5,
			);

			expect(
				traffic.gets,
				"the tour progress GET was intercepted",
			).toBeGreaterThanOrEqual(1);
			record("tour progress traffic", traffic);
			expect(errors).toEqual([]);
		});
	}

	test("1280px expanded: step 5 sits right of the rail with the rail copy", async ({
		page,
	}) => {
		test.setTimeout(60_000);
		const errors = collectHydrationErrors(page);
		const { step, traffic } = await openTourAtStep5(page);

		await expect(step).toContainText("Use the sidebar to access Properties");
		const stepBox = await placedStepBox(step);
		const railBox = await boxOf(
			page.locator(DESKTOP_SIDEBAR).locator('[data-slot="sidebar-container"]'),
		);
		record("tour step and rail boxes", { stepBox, railBox });
		expectInsideViewport(stepBox, { width: 1280, height: 720 });
		expect(stepBox.x, "step left vs rail right").toBeGreaterThanOrEqual(
			railBox.x + railBox.width - 0.5,
		);

		expect(
			traffic.gets,
			"the tour progress GET was intercepted",
		).toBeGreaterThanOrEqual(1);
		record("tour progress traffic", traffic);
		expect(errors).toEqual([]);
	});
});

/**
 * CP-4 follow-up: the dashboard layout at every rail state the sidebar makes
 * reachable. Collapsing the rail widens the dashboard to the whole viewport, so
 * the same viewport now lays the dashboard out at two content widths; these
 * checks run at both. Measured before the fixes (owner A, production build):
 *   - the KPI row's Revenue tile split "$" from "7,500" onto two lines at 900,
 *     1024 collapsed, 1280 collapsed and 1440 (and Occupancy "33" from "%" at
 *     1280 collapsed), and its stat grid overflowed the tile by 1px at 1280
 *     collapsed;
 *   - at 1024 expanded the four-column trends row gave Quick Actions a 158px
 *     column and its buttons overflowed the card by 10.31px;
 *   - the dock reserved 112px of main padding for a 90px band and no scroll
 *     padding, so a focused quick action stayed under the dock.
 */
interface DashboardCell {
	width: number;
	height: number;
	collapsed: boolean;
}

const KPI_STAT = '[data-testid="kpi-bento-row"] [data-slot="stat"]';
const QUICK_ACTIONS = '[data-tour="quick-actions"]';
const DOCK_PANEL = '[data-testid="quick-actions-dock"] > div';

const DESKTOP_DASHBOARD_CELLS: readonly DashboardCell[] = [
	{ width: 1024, height: 768, collapsed: false },
	{ width: 1024, height: 768, collapsed: true },
	{ width: 1280, height: 720, collapsed: false },
	{ width: 1280, height: 720, collapsed: true },
	{ width: 1440, height: 900, collapsed: false },
	{ width: 1440, height: 900, collapsed: true },
];

const KPI_CELLS: readonly DashboardCell[] = [
	{ width: 375, height: 667, collapsed: false },
	{ width: 900, height: 800, collapsed: false },
	...DESKTOP_DASHBOARD_CELLS,
];

function cellLabel(cell: DashboardCell): string {
	if (cell.width < 1024) return `${cell.width}px`;
	return `${cell.width}px ${cell.collapsed ? "collapsed" : "expanded"}`;
}

/**
 * Reloads the populated dashboard at `cell`: the rail state through the
 * `sidebar_state` cookie, the viewport, then hydration, the six KPI values and
 * the client-loaded trends charts.
 */
async function openDashboardCell(
	page: Page,
	cell: DashboardCell,
): Promise<void> {
	await seedSidebarCookie(page, cell.collapsed ? "false" : "true");
	await page.setViewportSize({ width: cell.width, height: cell.height });
	await page.reload();
	await waitForHydration(page, TRIGGER);
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }),
	).toBeVisible({ timeout: 10000 });
	await expect(
		page.locator(`${KPI_STAT} [data-slot="stat-value"]`),
	).toHaveCount(6);
	await waitForHydration(page, '[data-testid="kpi-bento-row"]');
	await expect(
		page.locator('[data-tour="trends-section"] [role="img"] svg').first(),
	).toBeAttached({ timeout: 15000 });
	if (cell.width >= 1024) {
		await expect(page.locator(DESKTOP_SIDEBAR)).toHaveAttribute(
			"data-state",
			cell.collapsed ? "collapsed" : "expanded",
		);
	}
}

interface Insets {
	left: number;
	right: number;
	scrollWidth: number;
	clientWidth: number;
}

/**
 * Border plus padding on each side, and the overflow pair, of `locator`, in
 * one snapshot polled until the box has laid out. A node with no layout box
 * reads `scrollWidth` 0 and `clientWidth` 0, which would satisfy every
 * `scrollWidth <= clientWidth` assertion vacuously, so `clientWidth > 0` is the
 * gate.
 */
async function insetsOf(locator: Locator): Promise<Insets> {
	return polledRead(
		() =>
			locator.evaluate((node) => {
				const style = getComputedStyle(node);
				return {
					left:
						Number.parseFloat(style.borderLeftWidth) +
						Number.parseFloat(style.paddingLeft),
					right:
						Number.parseFloat(style.borderRightWidth) +
						Number.parseFloat(style.paddingRight),
					scrollWidth: node.scrollWidth,
					clientWidth: node.clientWidth,
				};
			}),
		(value) => value.clientWidth > 0,
	);
}

async function pixels(locator: Locator, property: string): Promise<string> {
	return locator.evaluate(
		(node, name) => getComputedStyle(node).getPropertyValue(name),
		property,
	);
}

test.describe("CP-4 follow-up: dashboard layout at every rail state", () => {
	test("each KPI value stays on one line inside its tile", async ({ page }) => {
		test.setTimeout(120_000);
		const errors = await openShell(page);
		for (const cell of KPI_CELLS) {
			await openDashboardCell(page, cell);
			const stats = page.locator(KPI_STAT);
			for (let index = 0; index < 6; index += 1) {
				const stat = stats.nth(index);
				const label =
					(await stat.locator('[data-slot="stat-label"]').textContent()) ?? "";
				const where = `${cellLabel(cell)} ${label}`;
				const value = stat.locator('[data-slot="stat-value"]');
				const lineHeight = Number.parseFloat(
					await pixels(value, "line-height"),
				);
				const tile = await boxOf(stat);
				const insets = await insetsOf(stat);
				const parts = await boxesOf(value.locator(":scope > *"), { min: 1 });
				const ticker = await boxOf(value.locator(":scope > .tabular-nums"));
				record(`kpi ${where}`, { tile, insets, parts, lineHeight });

				expectNearSoft(ticker.height, lineHeight, `${where} ticker height`);
				const contentLeft = tile.x + insets.left;
				const contentRight = tile.x + tile.width - insets.right;
				let previousRight = Number.NEGATIVE_INFINITY;
				for (const part of parts) {
					const centerY = part.y + part.height / 2;
					expect
						.soft(
							centerY >= ticker.y - 0.5 &&
								centerY <= ticker.y + ticker.height + 0.5,
							`${where}: a value part sits on another line (center ${centerY}, ticker ${ticker.y}..${ticker.y + ticker.height})`,
						)
						.toBe(true);
					expect
						.soft(part.x, `${where}: value parts run left to right on one line`)
						.toBeGreaterThanOrEqual(previousRight - 0.5);
					previousRight = part.x + part.width;
					expect
						.soft(part.x, `${where}: value starts inside the tile`)
						.toBeGreaterThanOrEqual(contentLeft - 0.5);
					expect
						.soft(part.x + part.width, `${where}: value ends inside the tile`)
						.toBeLessThanOrEqual(contentRight + 0.5);
				}
				expect
					.soft(insets.scrollWidth, `${where}: tile scrollWidth vs clientWidth`)
					.toBeLessThanOrEqual(insets.clientWidth);
			}
		}
		expect(errors).toEqual([]);
	});

	test("the Quick Actions card's content stays inside its column", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const errors = await openShell(page);
		for (const cell of DESKTOP_DASHBOARD_CELLS) {
			await openDashboardCell(page, cell);
			const where = cellLabel(cell);
			const card = page.locator(QUICK_ACTIONS);
			const cardBox = await boxOf(card);
			const insets = await insetsOf(card);
			const buttons = await boxesOf(card.locator("button"), { min: 4 });
			record(`quick actions ${where}`, { cardBox, insets, buttons });
			expect
				.soft(
					insets.scrollWidth,
					`${where}: Quick Actions scrollWidth vs clientWidth`,
				)
				.toBeLessThanOrEqual(insets.clientWidth);
			for (const button of buttons) {
				expect
					.soft(
						button.x + button.width,
						`${where}: a quick action ends inside the card`,
					)
					.toBeLessThanOrEqual(cardBox.x + cardBox.width - insets.right + 0.5);
			}
		}
		expect(errors).toEqual([]);
	});

	test("the dock's band is reserved: main padding, scroll padding and scroll end", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const errors = await openShell(page);
		for (const cell of DESKTOP_DASHBOARD_CELLS) {
			await openDashboardCell(page, cell);
			const where = cellLabel(cell);
			const dock = await boxOf(page.locator(DOCK_PANEL));
			const clearance = cell.height - dock.y;
			const mainPadding = Number.parseFloat(
				await pixels(page.locator("main#main-content"), "padding-bottom"),
			);
			const scrollPadding = Number.parseFloat(
				await pixels(page.locator("html"), "scroll-padding-bottom"),
			);
			expectNearSoft(mainPadding, clearance, `${where}: main padding-bottom`);
			expectNearSoft(
				scrollPadding,
				clearance,
				`${where}: html scroll-padding-bottom`,
			);

			await page.evaluate(() =>
				window.scrollTo({
					top: document.documentElement.scrollHeight,
					behavior: "instant",
				}),
			);
			const footer = await boxOf(page.locator("main#main-content > footer"));
			const dockAtEnd = await boxOf(page.locator(DOCK_PANEL));
			record(`dock band ${where}`, { dock, clearance, footer, dockAtEnd });
			expect
				.soft(
					footer.y + footer.height,
					`${where}: the last content ends above the dock at scroll end`,
				)
				.toBeLessThanOrEqual(dockAtEnd.y + 0.5);
		}
		expect(errors).toEqual([]);
	});

	test("a quick action focused by Tab under the dock scrolls clear of it (WCAG 2.4.11)", async ({
		page,
	}) => {
		test.setTimeout(90_000);
		const errors = await openShell(page);
		for (const cell of DESKTOP_DASHBOARD_CELLS) {
			await openDashboardCell(page, cell);
			const where = cellLabel(cell);
			// The last quick action: low enough in the page at every cell to be
			// scrolled under the dock (the first one sits above it at 1440x900).
			const target = page.locator(QUICK_ACTIONS).locator("button").last();
			const dock = await boxOf(page.locator(DOCK_PANEL));
			const before = await boxOf(target);
			const scrollY = await page.evaluate(() => window.scrollY);
			const parkAt = before.y + scrollY - (dock.y + 4);
			await page.evaluate(
				(top) => window.scrollTo({ top, behavior: "instant" }),
				parkAt,
			);
			const parked = await boxOf(target);
			// Positive control: the target really is under the dock before Tab.
			expect(
				parked.y < dock.y + dock.height && parked.y + parked.height > dock.y,
				`${where}: the target is parked under the dock (target ${parked.y}..${parked.y + parked.height}, dock ${dock.y}..${dock.y + dock.height})`,
			).toBe(true);

			await target.evaluate((node) => {
				const tabbable = Array.from(
					document.querySelectorAll<HTMLElement>(
						'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
					),
				).filter(
					(element) =>
						element.tabIndex >= 0 &&
						element.getClientRects().length > 0 &&
						element.closest("[inert]") === null,
				);
				const previous = tabbable[tabbable.indexOf(node as HTMLElement) - 1];
				if (previous === undefined) {
					throw new Error("no tabbable element precedes the quick action");
				}
				previous.focus({ preventScroll: true });
			});
			await page.keyboard.press("Tab");
			expect(
				await target.evaluate((node) => node === document.activeElement),
				`${where}: Tab reached the quick action`,
			).toBe(true);
			const focused = await boxOf(target);
			const dockAfter = await boxOf(page.locator(DOCK_PANEL));
			record(`focus clearance ${where}`, { dock, parked, focused, dockAfter });
			expect
				.soft(
					focused.y + focused.height,
					`${where}: the focused quick action ends above the dock`,
				)
				.toBeLessThanOrEqual(dockAfter.y + 0.5);
		}
		expect(errors).toEqual([]);
	});

	for (const viewport of SHEET_VIEWPORTS) {
		test(`${viewport.width}px: no dock, so no reserved band`, async ({
			page,
		}) => {
			test.setTimeout(60_000);
			const errors = await openShell(page);
			await openDashboardCell(page, { ...viewport, collapsed: false });
			await expect(page.getByTestId("quick-actions-dock")).toBeHidden();
			// pb-24 below 40rem and sm:pb-6 above it, as before the dock band.
			expect(
				await pixels(page.locator("main#main-content"), "padding-bottom"),
			).toBe(viewport.width < 640 ? "96px" : "24px");
			expect(await pixels(page.locator("html"), "scroll-padding-bottom")).toBe(
				"auto",
			);
			expect(errors).toEqual([]);
		});
	}
});
