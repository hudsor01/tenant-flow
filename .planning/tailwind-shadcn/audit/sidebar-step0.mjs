// Wave 6 Step 0 (D-42) for the Tailwind v4 / shadcn remediation (66.2-30): re-measure the
// hand-rolled owner drawer's claimed defects S1-S8 on the LIVE post-W5 owner shell (a local
// `next start` of HEAD, synthetic owner A via loginAsOwner), each with a positive control, and
// capture the wave-6 sidebar before-screenshots. Run under bun (it imports
// tests/e2e/auth-helpers.ts directly; plain node cannot):
//
//   bun .planning/tailwind-shadcn/audit/sidebar-step0.mjs claims [--start [--port 3062]] [--base-url <url>]
//   bun .planning/tailwind-shadcn/audit/sidebar-step0.mjs shots <label> [--start [--port 3062]] [--base-url <url>]
//
// claims writes $TW_AUDIT_OUT/step0-claims.json = { meta, claims: { S1..S8: { widths: { "<w>":
// {...} }, control: { passed, ... }, verdict } }, informational, writes }. verdict is CONFIRMED
// when the claim's rule holds AND its control passed, else NOT_REPRODUCED. It exits 0 once the
// file is written (the plan judges), except that a tour which never opens (S7) exits 1.
// shots writes $TW_AUDIT_OUT/screens-<label>/sidebar/<state>-<theme>-<width>.png and
// screens-<label>/manifest.json (the layout screens.mjs --diff reads).
//
// Safety (copied from screens.mjs): the output dir must resolve outside the repo (exit 2,
// nothing created). This file reads no env file itself; the bun runtime loads the worktree's
// local env file into the process at startup. Credentials are tested for presence only and
// never printed or written (absent: exit 3, "credentials not in environment", an authentication
// gate, never a pass). No trace, HAR or video is recorded and nothing is uploaded. --start
// refuses a port that already accepts connections, starts `next start` with
// SKIP_ENV_VALIDATION=true in its own process group and stops it (and waits for the port to
// close) before exiting.
// Write protection: every context fulfills **/rest/v1/user_tour_progress** locally (GET/HEAD ->
// 200 [], writes -> a synthetic 201 row, preflight -> 204) and never continues it; a request log
// counts table writes (non-RPC POST/PUT/PATCH/DELETE to /rest/v1/) that were not fulfilled
// (tableWritesForwarded) and tour-progress requests answered by the network
// (tourProgressForwarded). Both must be 0. The probes do no fill or submit; clicks are limited to
// the nav trigger, toggles, links, the search pill, palette options, the Settings footer and the
// tour's Next button.
// Sign-in budget: one loginAsOwner API sign-in per process (its module cache); runs >= 60 s apart.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();

// ---------- output dir: resolved and checked before anything else ----------
const OUT = path.resolve(process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit"));
const realish = (p) => {
	let head = p;
	const tail = [];
	while (!fs.existsSync(head)) {
		tail.unshift(path.basename(head));
		const up = path.dirname(head);
		if (up === head) break;
		head = up;
	}
	return path.join(fs.realpathSync(head), ...tail);
};
{
	const rel = path.relative(realish(ROOT), realish(OUT));
	if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
		console.error(`sidebar-step0: refusing to write inside the repo (${OUT})`);
		process.exit(2);
	}
}

const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const axeModule = require("@axe-core/playwright");
const AxeBuilder = axeModule.default ?? axeModule.AxeBuilder;

const THEME_KEY = "tenantflow-theme-mode";
const TOUR_KEY = "tenantflow:tour-progress";
const VIEWPORTS = { 375: 812, 900: 800, 1024: 800, 1280: 800 };
const SETTLE_MS = 450;
const ASIDE = 'aside[data-tour="sidebar-nav"]';
const TRIGGER = 'button[aria-label="Open navigation menu"]';
const OVERLAY_DESC = 'direct child of the AppShell root (the aside\'s parent) matching div.fixed.inset-0.z-40';
const PALETTE = "Command Palette";
const STEP5_TITLE = "Navigate Your Portal";

const fail = (msg, code = 2) => {
	console.error(`sidebar-step0: ${msg}`);
	process.exit(code);
};
const trunc = (s) => String(s).slice(0, 300);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (...a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }).stdout.trim();

// ---------- argv ----------
function parseArgs(argv) {
	const a = { mode: null, label: null, start: false, port: 3062, baseUrl: null };
	const pos = [];
	for (let i = 0; i < argv.length; i++) {
		const x = argv[i];
		const val = () => {
			const v = argv[++i];
			if (v === undefined || v.startsWith("--")) fail(`${x} needs a value`);
			return v;
		};
		if (x === "--start") a.start = true;
		else if (x === "--port") a.port = Number(val());
		else if (x === "--base-url") a.baseUrl = val().replace(/\/+$/, "");
		else if (x.startsWith("--")) fail(`unknown flag ${x}`);
		else pos.push(x);
	}
	a.mode = pos[0];
	if (a.mode === "claims") {
		if (pos.length !== 1) fail("usage: sidebar-step0.mjs claims [--start [--port N]] [--base-url <url>]");
	} else if (a.mode === "shots") {
		if (pos.length !== 2) fail("usage: sidebar-step0.mjs shots <label> [--start [--port N]] [--base-url <url>]");
		a.label = pos[1];
		if (!/^[\w.-]+$/.test(a.label)) fail("label must match [A-Za-z0-9_.-]+");
	} else fail("usage: sidebar-step0.mjs claims|shots <label> [options]");
	if (!Number.isInteger(a.port) || a.port <= 0 || a.port > 65535) fail("--port must be a TCP port");
	if (a.start && a.baseUrl) fail("--start and --base-url are exclusive");
	return a;
}

// ---------- server helpers (screens.mjs) ----------
const portAccepts = (port) =>
	Promise.all(
		["127.0.0.1", "::1"].map(
			(host) =>
				new Promise((resolve) => {
					const sock = net.connect({ host, port });
					const done = (v) => {
						sock.destroy();
						resolve(v);
					};
					sock.setTimeout(1000, () => done(false));
					sock.once("connect", () => done(true));
					sock.once("error", () => done(false));
				}),
		),
	).then((r) => r.some(Boolean));

const getStatus = async (url) => {
	try {
		const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
		await res.arrayBuffer().catch(() => {});
		return res.status;
	} catch {
		return 0;
	}
};

async function startServer(port, logFile) {
	if (await portAccepts(port)) fail(`port ${port} already accepts connections; refusing to measure another server`);
	const bin = path.join(ROOT, "node_modules/.bin/next");
	if (!fs.existsSync(bin)) fail("node_modules/.bin/next not found");
	const log = fs.openSync(logFile, "a");
	const child = spawn(bin, ["start", "-p", String(port)], {
		cwd: ROOT,
		env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
		detached: true,
		stdio: ["ignore", log, log],
	});
	let exited = false;
	child.once("exit", () => {
		exited = true;
	});
	const stop = async () => {
		if (!exited) {
			try {
				process.kill(-child.pid, "SIGTERM");
			} catch {}
			for (let i = 0; i < 100 && !exited; i++) await sleep(100);
			if (!exited) {
				try {
					process.kill(-child.pid, "SIGKILL");
				} catch {}
				for (let i = 0; i < 50 && !exited; i++) await sleep(100);
			}
		}
		for (let i = 0; i < 300 && (await portAccepts(port)); i++) await sleep(100);
		fs.closeSync(log);
	};
	const base = `http://localhost:${port}`;
	for (let i = 0; i < 120; i++) {
		if (exited) break;
		if ((await getStatus(`${base}/`)) === 200) return { base, stop };
		await sleep(1000);
	}
	await stop();
	fail(`next start did not answer GET / with 200 within 120 s (log: ${logFile})`, 1);
}

const ownerCredentialsPresent = () =>
	Boolean(process.env.E2E_OWNER_EMAIL) &&
	Boolean(process.env.E2E_OWNER_PASSWORD) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.TEST_SUPABASE_PUBLISHABLE_KEY);

// ---------- write protection ----------
const writes = { tourProgressIntercepted: 0, tourProgressReads: 0, tourProgressWrites: 0, tourProgressPreflights: 0, tourProgressForwarded: 0, tableWritesForwarded: 0, tableWritesForwardedUrls: [] };
const fulfilled = new WeakSet();
const writeCandidates = [];
const TOUR_PATH = "/rest/v1/user_tour_progress";
const isTourUrl = (u) => {
	try {
		return new URL(u).pathname.startsWith(TOUR_PATH);
	} catch {
		return false;
	}
};

async function protect(ctx) {
	await ctx.route("**/rest/v1/user_tour_progress**", async (route) => {
		const req = route.request();
		fulfilled.add(req);
		writes.tourProgressIntercepted++;
		const method = req.method();
		const origin = req.headers().origin;
		const cors = origin
			? {
					"access-control-allow-origin": origin,
					"access-control-allow-credentials": "true",
					"access-control-allow-headers": req.headers()["access-control-request-headers"] ?? "*",
					"access-control-allow-methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
					"access-control-expose-headers": "content-range, content-profile",
				}
			: {};
		if (method === "OPTIONS") {
			writes.tourProgressPreflights++;
			return route.fulfill({ status: 204, headers: cors, body: "" });
		}
		if (method === "GET" || method === "HEAD") {
			writes.tourProgressReads++;
			return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: method === "HEAD" ? "" : "[]" });
		}
		writes.tourProgressWrites++;
		let row = {};
		try {
			const body = req.postDataJSON();
			row = Array.isArray(body) ? (body[0] ?? {}) : (body ?? {});
		} catch {}
		return route.fulfill({
			status: 201,
			headers: { ...cors, "content-type": "application/json" },
			body: JSON.stringify([{ ...row, last_seen_at: new Date().toISOString() }]),
		});
	});
	ctx.on("request", (req) => {
		const m = req.method();
		if (!["POST", "PUT", "PATCH", "DELETE"].includes(m)) return;
		let p;
		try {
			p = new URL(req.url()).pathname;
		} catch {
			return;
		}
		if (p.startsWith("/rest/v1/") && !p.startsWith("/rest/v1/rpc/")) writeCandidates.push(req);
	});
	ctx.on("requestfinished", async (req) => {
		if (!isTourUrl(req.url()) || fulfilled.has(req)) return;
		const res = await req.response().catch(() => null);
		if (res && !res.fromServiceWorker()) writes.tourProgressForwarded++;
	});
}
const finalizeWrites = () => {
	const forwarded = writeCandidates.filter((r) => !fulfilled.has(r));
	writes.tableWritesForwarded = forwarded.length;
	writes.tableWritesForwardedUrls = forwarded.map((r) => `${r.method()} ${new URL(r.url()).pathname}`);
	return writes;
};

// ---------- page helpers ----------
let BASE = "http://localhost:3062";
let loginAsOwner = null;
const settle = (page, ms = SETTLE_MS) => page.waitForTimeout(ms);

async function newOwnerPage(browser, width, { theme = "light", tourSeed = true } = {}) {
	const ctx = await browser.newContext({ viewport: { width, height: VIEWPORTS[width] }, deviceScaleFactor: 1, reducedMotion: "reduce", timezoneId: "UTC", locale: "en-US" });
	await protect(ctx);
	await ctx.addInitScript(
		({ theme, themeKey, tourKey, tourSeed }) => {
			try {
				localStorage.setItem(themeKey, theme);
				if (tourSeed) localStorage.setItem(tourKey, JSON.stringify({ "owner-onboarding": "completed" }));
			} catch {}
		},
		{ theme, themeKey: THEME_KEY, tourKey: TOUR_KEY, tourSeed },
	);
	const page = await ctx.newPage();
	const consoleErrors = [];
	page.on("console", (m) => {
		if (m.type() === "error") consoleErrors.push(trunc(m.text()));
	});
	page.on("pageerror", (e) => consoleErrors.push(trunc(e?.message ?? e)));
	await loginAsOwner(page);
	return { ctx, page, consoleErrors };
}

async function go(page, route) {
	const res = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60000 });
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await page.evaluate(async () => {
		await document.fonts.ready;
	});
	await settle(page);
	return res ? res.status() : null;
}

const pathOf = (page) => new URL(page.url()).pathname;
const waitPath = (page, p) => page.waitForURL((u) => new URL(u).pathname === p, { timeout: 30000 });

const asideState = (page) =>
	page.evaluate((sel) => {
		const a = document.querySelector(sel);
		const root = a?.parentElement;
		const overlays = root ? [...root.children].filter((el) => el.tagName === "DIV" && el.matches("div.fixed.inset-0.z-40")) : [];
		return {
			asideRole: a?.getAttribute("role") ?? null,
			asideAriaModal: a?.getAttribute("aria-modal") ?? null,
			asideX: a ? Math.round(a.getBoundingClientRect().x * 100) / 100 : null,
			overlayCount: overlays.length,
		};
	}, ASIDE);

async function openDrawer(page) {
	await page.locator(TRIGGER).click();
	await settle(page);
	const s = await asideState(page);
	if (s.asideRole !== "dialog") throw new Error("drawer did not open (aside role is not dialog)");
	return s;
}

async function openPaletteByKey(page) {
	await page.keyboard.press("Control+k");
	const dlg = page.getByRole("dialog", { name: PALETTE });
	await dlg.waitFor({ state: "visible", timeout: 10000 });
	await settle(page);
	return dlg;
}

const visibleRatio = (r, vw, vh) => {
	if (!r || r.width <= 0 || r.height <= 0) return 0;
	const w = Math.max(0, Math.min(r.x + r.width, vw) - Math.max(r.x, 0));
	const h = Math.max(0, Math.min(r.y + r.height, vh) - Math.max(r.y, 0));
	return Math.round(((w * h) / (r.width * r.height)) * 1000) / 1000;
};

// ---------- claims ----------
async function probeS1(page) {
	await go(page, "/properties");
	await page.locator(TRIGGER).focus();
	await page.keyboard.press("Enter");
	await settle(page);
	const s = await asideState(page);
	const focus = () =>
		page.evaluate((sel) => {
			const el = document.activeElement;
			return {
				inAside: el ? el.closest(sel) !== null : false,
				label: el ? (el.getAttribute("aria-label") ?? (el.textContent ?? "").trim().slice(0, 60)) : null,
				tag: el?.tagName ?? null,
			};
		}, ASIDE);
	const f0 = await focus();
	const tabs = [];
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press("Tab");
		await page.waitForTimeout(100);
		tabs.push(await focus());
	}
	await settle(page);
	const after = await asideState(page);
	const value = {
		asideRole: s.asideRole,
		asideAriaModal: s.asideAriaModal,
		asideX: s.asideX,
		activeInAside: f0.inAside,
		activeLabel: f0.label,
		tabs: tabs.map((t) => ({ inAside: t.inAside, tag: t.tag, label: t.label })),
		tabsIntoAside: tabs.filter((t) => t.inAside).length,
		asideRoleAfterTabs: after.asideRole,
	};
	value.holds = value.asideRole === "dialog" && value.asideAriaModal === "true" && value.activeInAside === false && value.tabsIntoAside === 0;
	// control: the palette moves focus into its dialog
	await page.reload({ waitUntil: "load" });
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await settle(page);
	const dlg = await openPaletteByKey(page);
	const activeInPalette = await dlg.evaluate((d) => d.contains(document.activeElement));
	return { value, control: { activeInPalette, passed: activeInPalette === true } };
}

async function axNameOf(page, selector) {
	const cdp = await page.context().newCDPSession(page);
	try {
		await cdp.send("DOM.enable");
		await cdp.send("Accessibility.enable");
		const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
		const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
		if (!nodeId) return { role: null, name: null };
		const { nodes } = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
		const n = nodes[0] ?? {};
		return { role: n.role?.value ?? null, name: n.name?.value ?? "", ignored: n.ignored ?? false };
	} finally {
		await cdp.detach().catch(() => {});
	}
}

async function probeS2(page) {
	await go(page, "/properties");
	await openDrawer(page);
	const dialogCount = await page.getByRole("dialog").count();
	const namedDialogCount = await page.getByRole("dialog", { name: /\S/ }).count();
	const ax = await axNameOf(page, ASIDE);
	const axe = await new AxeBuilder({ page }).include(ASIDE).withRules(["aria-dialog-name"]).analyze();
	const value = {
		dialogCount,
		namedDialogCount,
		axRole: ax.role,
		axName: ax.name,
		axIgnored: ax.ignored,
		axeViolations: axe.violations.length,
		axeViolationIds: axe.violations.map((v) => v.id),
		axeNodes: axe.violations.reduce((n, v) => n + v.nodes.length, 0),
	};
	value.holds = value.namedDialogCount === 0 && value.axName === "" && value.axeViolations === 1;
	await go(page, "/properties");
	await openPaletteByKey(page);
	const paletteNamed = await page.getByRole("dialog", { name: PALETTE }).count();
	return { value, control: { paletteNamedCount: paletteNamed, passed: paletteNamed === 1 } };
}

const scrollInfo = (page) =>
	page.evaluate(() => ({
		scrollY: window.scrollY,
		htmlOverflow: getComputedStyle(document.documentElement).overflow,
		bodyOverflow: getComputedStyle(document.body).overflow,
		bodyScrollLocked: document.body.hasAttribute("data-scroll-locked"),
		scrollable: document.documentElement.scrollHeight - window.innerHeight,
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
	}));

async function probeS3(page) {
	const candidates = [];
	let route = null;
	for (const r of ["/dashboard", "/reports/cash-flow", "/properties"]) {
		await go(page, r);
		const s = await scrollInfo(page);
		candidates.push({ route: r, scrollable: s.scrollable });
		if (s.scrollable >= 700) {
			route = r;
			break;
		}
	}
	if (!route) throw new Error(`no candidate route scrolls by >= 700 px: ${JSON.stringify(candidates)}`);
	await go(page, route);
	await openDrawer(page);
	const open = await scrollInfo(page);
	const px = open.innerWidth - 40;
	const py = Math.round(open.innerHeight / 2);
	await page.mouse.move(px, py);
	await page.mouse.wheel(0, 600);
	await settle(page);
	const after = await scrollInfo(page);
	const st = await asideState(page);
	const value = {
		route,
		candidates,
		htmlOverflow: open.htmlOverflow,
		bodyOverflow: open.bodyOverflow,
		wheelAt: { x: px, y: py },
		scrollYBefore: open.scrollY,
		scrollYAfter: after.scrollY,
		scrollDelta: after.scrollY - open.scrollY,
		asideRoleAfter: st.asideRole,
	};
	value.holds = value.htmlOverflow === "visible" && value.bodyOverflow === "visible" && value.scrollDelta >= 300 && value.asideRoleAfter === "dialog";
	await page.reload({ waitUntil: "load" });
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await page.evaluate(() => window.scrollTo(0, 0));
	await settle(page);
	await openPaletteByKey(page);
	const c0 = await scrollInfo(page);
	await page.mouse.move(px, py);
	await page.mouse.wheel(0, 600);
	await settle(page);
	const c1 = await scrollInfo(page);
	const control = {
		scrollYBefore: c0.scrollY,
		scrollYAfter: c1.scrollY,
		bodyOverflow: c0.bodyOverflow,
		bodyScrollLocked: c0.bodyScrollLocked,
	};
	control.passed = Math.abs(c1.scrollY - c0.scrollY) <= 1 && (c0.bodyOverflow === "hidden" || c0.bodyScrollLocked);
	return { value, control };
}

async function probeS4(page) {
	// (a) palette select from the drawer's search pill
	await go(page, "/properties");
	await openDrawer(page);
	await page.locator(`${ASIDE} button`, { hasText: "Search pages and actions" }).click();
	await page.getByRole("dialog", { name: PALETTE }).waitFor({ state: "visible", timeout: 10000 });
	await settle(page);
	await page.getByRole("option", { name: "Leases", exact: true }).click();
	await waitPath(page, "/leases");
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await settle(page);
	const a = { finalPath: pathOf(page), ...(await asideState(page)) };
	// (c) logo click
	await go(page, "/properties");
	await openDrawer(page);
	await page.locator(`${ASIDE} a[href="/dashboard"]`, { hasText: "TenantFlow" }).click();
	await waitPath(page, "/dashboard");
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await settle(page);
	const c = { finalPath: pathOf(page), ...(await asideState(page)) };
	const stays = (s) => s.asideRole === "dialog" && s.asideX === 0 && s.overlayCount === 1;
	const value = { overlaySelector: OVERLAY_DESC, a, c, holds: stays(a) && stays(c) };
	// control: a core link closes the drawer
	await go(page, "/properties");
	await openDrawer(page);
	await page.locator(`${ASIDE} a[href="/leases"]`).click();
	await waitPath(page, "/leases");
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await settle(page);
	const k = { finalPath: pathOf(page), ...(await asideState(page)) };
	return { value, control: { ...k, passed: k.asideRole === null && k.asideX <= -223 && k.overlayCount === 0 } };
}

async function probeS5(page) {
	await go(page, "/dashboard");
	const btn = page.locator(`${ASIDE} button[aria-haspopup="true"]`, { hasText: "Settings" });
	const info = await btn.evaluate((b, sel) => ({
		tagName: b.tagName,
		href: b.getAttribute("href"),
		ancestorAnchor: b.closest("a") !== null,
		settingsAnchors: document.querySelectorAll(`${sel} a[href="/settings"]`).length,
	}), ASIDE);
	const urlBefore = page.url();
	await btn.click();
	await settle(page);
	const popover = await btn.evaluate((b) =>
		[...(b.parentElement?.querySelectorAll("a[href], button") ?? [])]
			.filter((el) => el !== b)
			.map((el) => ({ tag: el.tagName, text: (el.textContent ?? "").replace(/\s+/g, " ").trim(), href: el.getAttribute("href") })),
	);
	await page.locator(`${ASIDE} button`, { hasText: "Keyboard Shortcuts" }).click();
	await settle(page);
	const dialogCount = await page.locator('[role="dialog"]').count();
	const urlUnchanged = page.url() === urlBefore;
	const anchors = popover.filter((p) => p.tag === "A");
	const buttons = popover.filter((p) => p.tag === "BUTTON");
	const value = { ...info, popover, dialogCountAfterShortcuts: dialogCount, urlUnchanged };
	value.holds =
		info.tagName === "BUTTON" &&
		info.href === null &&
		info.settingsAnchors === 0 &&
		popover.length === 2 &&
		anchors.length === 1 &&
		anchors[0].href === "/help" &&
		buttons.length === 1 &&
		buttons[0].text.includes("Keyboard Shortcuts") &&
		dialogCount === 0 &&
		urlUnchanged;
	await openPaletteByKey(page);
	const settingsOptions = await page.getByRole("option", { name: "Settings", exact: true }).count();
	return { value, control: { settingsOptions, passed: settingsOptions >= 1 } };
}

const sectionState = (page, label) =>
	page.evaluate(
		({ sel, label }) => {
			const t = document.querySelector(`${sel} button[aria-controls="nav-section-${label}"]`);
			const region = document.getElementById(`nav-section-${label}`);
			const cur = document.querySelector(`${sel} a[aria-current="page"]`);
			const cs = region ? getComputedStyle(region) : null;
			return {
				ariaExpanded: t?.getAttribute("aria-expanded") ?? null,
				inert: region ? region.hasAttribute("inert") : null,
				maxHeight: cs?.maxHeight ?? null,
				opacity: cs?.opacity ?? null,
				currentHref: cur?.getAttribute("href") ?? null,
				currentVisible: cur ? cur.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : null,
			};
		},
		{ sel: ASIDE, label },
	);

async function probeS6(page, width) {
	const mobile = width < 1024;
	const routes = [
		["/reports/cash-flow", "Reports"],
		["/analytics/financial", "Analytics"],
	];
	const value = { drawerOpened: mobile, routes: {} };
	for (const [route, label] of routes) {
		await go(page, route);
		if (mobile) await openDrawer(page);
		value.routes[route] = { section: label, ...(await sectionState(page, label)) };
	}
	const collapsed = (s) => s.ariaExpanded === "false" && s.inert === true && s.maxHeight === "0px" && s.opacity === "0" && s.currentVisible === false;
	let clientNavOk = true;
	if (!mobile) {
		await go(page, "/dashboard");
		await openPaletteByKey(page);
		await page.getByRole("option", { name: "Cash Flow", exact: true }).click();
		await waitPath(page, "/reports/cash-flow");
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await settle(page);
		const s = await sectionState(page, "Reports");
		value.clientNav = { from: "/dashboard", to: pathOf(page), ariaExpanded: s.ariaExpanded };
		clientNavOk = s.ariaExpanded === "false";
	}
	value.holds = Object.values(value.routes).every(collapsed) && clientNavOk;
	await go(page, "/reports/cash-flow");
	if (mobile) await openDrawer(page);
	await page.locator(`${ASIDE} button[aria-controls="nav-section-Reports"]`).click();
	await settle(page);
	const k = await page.evaluate((sel) => {
		const t = document.querySelector(`${sel} button[aria-controls="nav-section-Reports"]`);
		const region = document.getElementById("nav-section-Reports");
		const link = region?.querySelector('a[href="/reports/cash-flow"]');
		return {
			ariaExpanded: t?.getAttribute("aria-expanded") ?? null,
			inert: region ? region.hasAttribute("inert") : null,
			cashFlowVisible: link ? link.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : null,
		};
	}, ASIDE);
	return { value, control: { ...k, passed: k.ariaExpanded === "true" && k.inert === false && k.cashFlowVisible === true } };
}

async function advanceTourToStep5(page) {
	await page.getByText("Welcome to TenantFlow", { exact: true }).waitFor({ state: "visible", timeout: 20000 });
	await settle(page);
	const step5 = page.getByText(STEP5_TITLE, { exact: true });
	let clicks = 0;
	while (!(await step5.isVisible().catch(() => false)) && clicks < 4) {
		await page.locator('button[aria-label="Next step"]').filter({ visible: true }).first().click();
		clicks++;
		await settle(page);
	}
	await step5.waitFor({ state: "attached", timeout: 5000 });
	return clicks;
}

async function probeS7(page) {
	await go(page, "/dashboard");
	let clicks;
	try {
		clicks = await advanceTourToStep5(page);
	} catch (e) {
		const err = new Error(`tour did not reach step 5: ${trunc(e?.message ?? e)}`);
		err.tourFailure = true;
		throw err;
	}
	await settle(page);
	const m = await page.evaluate(
		({ title }) => {
			const rect = (el) => {
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { x: r.x, y: r.y, width: r.width, height: r.height };
			};
			const target = document.querySelector("[data-tour='sidebar-nav']");
			const t = [...document.querySelectorAll('[data-slot="tour-title"]')].find((el) => (el.textContent ?? "").trim() === title);
			const pop = t ? (t.closest("[data-side]") ?? t.closest('[role="dialog"]')) : null;
			return {
				target: rect(target),
				popover: rect(pop),
				popoverSource: pop ? (pop.hasAttribute("data-side") ? "data-side" : "role=dialog") : null,
				dataSide: pop?.getAttribute("data-side") ?? null,
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
				activeInStep: pop ? pop.contains(document.activeElement) : null,
			};
		},
		{ title: STEP5_TITLE },
	);
	return {
		nextClicks: clicks,
		...m,
		targetVisibleRatio: visibleRatio(m.target, m.innerWidth, m.innerHeight),
		popoverVisibleRatio: visibleRatio(m.popover, m.innerWidth, m.innerHeight),
	};
}

async function probeS8(page) {
	await go(page, "/properties");
	for (const label of ["Analytics", "Reports"]) {
		await page.locator(`${ASIDE} button[aria-controls="nav-section-${label}"]`).click();
		await settle(page);
	}
	const vp = page.viewportSize();
	await page.mouse.move(vp.width - 2, vp.height - 2);
	await settle(page);
	const deco = (i) =>
		page.evaluate(
			({ sel, i }) => {
				const el = document.querySelectorAll(`${sel} a[href]`)[i];
				const cs = getComputedStyle(el);
				const cv = document.createElement("canvas");
				cv.width = 1;
				cv.height = 1;
				const x = cv.getContext("2d", { willReadFrequently: true });
				x.clearRect(0, 0, 1, 1);
				x.fillStyle = cs.textDecorationColor;
				x.fillRect(0, 0, 1, 1);
				const d = x.getImageData(0, 0, 1, 1).data;
				return { line: cs.textDecorationLine, rgba: [d[0], d[1], d[2], +(d[3] / 255).toFixed(3)] };
			},
			{ sel: ASIDE, i },
		);
	const visible = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} a[href]`)].map((el, i) => ({ i, href: el.getAttribute("href"), text: (el.textContent ?? "").trim(), visible: el.checkVisibility() })).filter((a) => a.visible), ASIDE);
	const anchors = [];
	for (const a of visible) {
		const rest = await deco(a.i);
		anchors.push({ href: a.href, text: a.text, rest });
	}
	const loc = page.locator(`${ASIDE} a[href]`);
	for (const [k, a] of visible.entries()) {
		await loc.nth(a.i).hover();
		await settle(page);
		anchors[k].hover = await deco(a.i);
	}
	const value = {
		anchorCount: anchors.length,
		anchors,
		hoveredAllUnderlined: anchors.every((a) => a.hover.line.includes("underline") && a.hover.rgba[3] > 0),
		restAllInvisible: anchors.every((a) => a.rest.rgba[3] === 0 || a.rest.line === "none"),
		hoveredMinAlpha: Math.min(...anchors.map((a) => a.hover.rgba[3])),
	};
	value.holds = value.anchorCount >= 18 && value.hoveredAllUnderlined && value.restAllInvisible;
	await page.mouse.move(vp.width - 2, vp.height - 2);
	await page.addStyleTag({ content: "aside a { text-decoration-line: none !important; }" });
	await loc.nth(visible[0].i).hover();
	await settle(page);
	const k = await deco(visible[0].i);
	return { value, control: { href: visible[0].href, line: k.line, passed: k.line === "none" } };
}

async function informational375(page) {
	await go(page, "/properties");
	await openDrawer(page);
	const rowHeights375 = await page.evaluate((sel) => {
		const a = document.querySelector(sel);
		const out = {};
		const label = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
		const core = [...a.querySelectorAll("nav > div:first-child > a[href]")];
		for (const el of core) out[label(el)] = Math.round(el.getBoundingClientRect().height * 100) / 100;
		for (const id of ["Analytics", "Reports"]) {
			const t = a.querySelector(`button[aria-controls="nav-section-${id}"]`);
			if (t) out[label(t)] = Math.round(t.getBoundingClientRect().height * 100) / 100;
		}
		const s = a.querySelector('button[aria-haspopup="true"]');
		if (s) out[label(s)] = Math.round(s.getBoundingClientRect().height * 100) / 100;
		return out;
	}, ASIDE);
	await go(page, "/properties");
	await page.evaluate(() => {
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
	});
	let before = 0;
	let reached = false;
	const seen = [];
	for (let i = 0; i < 60; i++) {
		await page.keyboard.press("Tab");
		const f = await page.evaluate(
			({ sel, trig }) => {
				const el = document.activeElement;
				return { inAside: el ? el.closest(sel) !== null : false, isTrigger: el ? el.matches(trig) : false, label: el ? (el.getAttribute("aria-label") ?? (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)) : null };
			},
			{ sel: ASIDE, trig: TRIGGER },
		);
		seen.push(f.label);
		if (f.isTrigger) {
			reached = true;
			break;
		}
		if (f.inAside) before++;
	}
	return { rowHeights375, closedTabOrder375: reached ? before : null, closedTabOrder375Sequence: seen };
}

const CLAIM_WIDTHS = { S1: [375, 900], S2: [375, 900], S3: [375, 900], S4: [375, 900], S5: [1280], S6: [1280, 375], S7: [375, 900, 1024, 1280], S8: [1024, 1280] };

async function runClaims(browser) {
	const claims = {};
	for (const id of Object.keys(CLAIM_WIDTHS)) claims[id] = { widths: {}, control: { passed: false, widths: {} }, verdict: "NOT_REPRODUCED" };
	const generic = { S1: probeS1, S2: probeS2, S3: probeS3, S4: probeS4, S5: probeS5, S6: probeS6, S8: probeS8 };
	let informational = {};
	let tourFailure = null;
	for (const width of [375, 900, 1024, 1280]) {
		const { ctx, page } = await newOwnerPage(browser, width, { tourSeed: true });
		try {
			for (const [id, fn] of Object.entries(generic)) {
				if (!CLAIM_WIDTHS[id].includes(width)) continue;
				try {
					const r = await fn(page, width);
					claims[id].widths[String(width)] = r.value;
					claims[id].control.widths[String(width)] = r.control;
				} catch (e) {
					claims[id].widths[String(width)] = { error: trunc(e?.message ?? e), holds: false };
					claims[id].control.widths[String(width)] = { error: trunc(e?.message ?? e), passed: false };
				}
				console.error(`claims ${id} @${width}: holds=${claims[id].widths[String(width)].holds} control=${claims[id].control.widths[String(width)].passed}`);
			}
			if (width === 375) {
				try {
					informational = await informational375(page);
				} catch (e) {
					informational = { error: trunc(e?.message ?? e) };
				}
			}
		} finally {
			await ctx.close();
		}
		// S7 runs in its own context without the tour-completed seed
		const t = await newOwnerPage(browser, width, { tourSeed: false });
		try {
			claims.S7.widths[String(width)] = await probeS7(t.page);
		} catch (e) {
			claims.S7.widths[String(width)] = { error: trunc(e?.message ?? e) };
			if (e?.tourFailure) tourFailure = `${width}: ${trunc(e.message)}`;
		} finally {
			await t.ctx.close();
		}
		console.error(`claims S7 @${width}: target=${claims.S7.widths[String(width)].targetVisibleRatio} popover=${claims.S7.widths[String(width)].popoverVisibleRatio}`);
	}
	for (const id of ["S1", "S2", "S3", "S4", "S5", "S6", "S8"]) {
		const ws = CLAIM_WIDTHS[id].map(String);
		const holds = ws.every((w) => claims[id].widths[w]?.holds === true);
		claims[id].control.passed = ws.every((w) => claims[id].control.widths[w]?.passed === true);
		claims[id].holds = holds;
		claims[id].verdict = holds && claims[id].control.passed ? "CONFIRMED" : "NOT_REPRODUCED";
	}
	const s7 = claims.S7.widths;
	const s7holds = s7["375"]?.targetVisibleRatio === 0 && s7["375"]?.popoverVisibleRatio === 0 && s7["900"]?.targetVisibleRatio === 0;
	const s7control = ["1024", "1280"].every((w) => s7[w]?.targetVisibleRatio === 1 && s7[w]?.popoverVisibleRatio >= 0.9);
	claims.S7.control = { widths: ["1024", "1280"], targetVisibleRatio: { 1024: s7["1024"]?.targetVisibleRatio, 1280: s7["1280"]?.targetVisibleRatio }, popoverVisibleRatio: { 1024: s7["1024"]?.popoverVisibleRatio, 1280: s7["1280"]?.popoverVisibleRatio }, passed: s7control };
	claims.S7.holds = s7holds;
	claims.S7.verdict = s7holds && s7control ? "CONFIRMED" : "NOT_REPRODUCED";
	return { claims, informational, tourFailure };
}

// ---------- shots (66.2-30 Task 3) ----------
// The wave-6 sidebar before-set. Each state has a fixed route. "park" = the pointer moved to
// (innerWidth - 2, innerHeight - 2) so no row is hovered; every state parks after its interaction
// except the two hover states and row-focus (parked before its Tab presses).
const park = async (page) => {
	const vp = page.viewportSize();
	await page.mouse.move(vp.width - 2, vp.height - 2);
};
const DESKTOP_STATES = [
	["rail-expanded", "/dashboard", async (p) => park(p)],
	["current-row", "/properties", async (p) => park(p)],
	["current-row-hover", "/properties", async (p) => p.locator(`${ASIDE} a[href="/properties"]`).hover()],
	["row-hover", "/properties", async (p) => p.locator(`${ASIDE} a[href="/tenants"]`).hover()],
	[
		"row-focus",
		"/properties",
		async (p) => {
			await park(p);
			await p.evaluate(() => {
				if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			});
			for (let i = 0; i < 60; i++) {
				await p.keyboard.press("Tab");
				if (await p.evaluate((sel) => document.activeElement?.matches(`${sel} a[href="/tenants"]`) === true, ASIDE)) return;
			}
			throw new Error('60 Tab presses never focused aside a[href="/tenants"]');
		},
	],
	["reports-default", "/reports/cash-flow", async (p) => park(p)],
	[
		"reports-open",
		"/reports/cash-flow",
		async (p) => {
			await p.locator(`${ASIDE} button[aria-controls="nav-section-Reports"]`).click();
			await park(p);
		},
	],
	["tour-step5", "/dashboard", null],
];
const SHEET_STATES = [
	["closed", "/dashboard", async (p) => park(p)],
	[
		"sheet-open-default",
		"/reports/cash-flow",
		async (p) => {
			await openDrawer(p);
			await park(p);
		},
	],
	[
		"sheet-open-reports",
		"/reports/cash-flow",
		async (p) => {
			await openDrawer(p);
			await p.locator(`${ASIDE} button[aria-controls="nav-section-Reports"]`).click();
			await park(p);
		},
	],
	[
		"palette-over-sheet",
		"/reports/cash-flow",
		async (p) => {
			await openDrawer(p);
			await p.locator(`${ASIDE} button`, { hasText: "Search pages and actions" }).click();
			await p.getByRole("dialog", { name: PALETTE }).waitFor({ state: "visible", timeout: 10000 });
			await park(p);
		},
	],
	["tour-step5", "/dashboard", null],
];
const TOUR_INTERACTION = async (p) => {
	await advanceTourToStep5(p);
	await p.getByText(STEP5_TITLE, { exact: true }).waitFor({ state: "attached", timeout: 5000 });
	await park(p);
};

async function shoot(page, consoleErrors, { outDir, state, route, theme, width, interaction }) {
	const file = `sidebar/${state}-${theme}-${width}.png`;
	const entry = { set: "sidebar", state, route, theme, width, file, sha256: null, status: null, finalUrl: null, themeApplied: null, consoleErrors: [] };
	consoleErrors.length = 0;
	try {
		const res = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60000 });
		entry.status = res ? res.status() : null;
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await settle(page);
		await interaction(page);
		await page.evaluate(async () => {
			await document.fonts.ready;
		});
		await page.waitForTimeout(500);
		const abs = path.join(outDir, file);
		fs.mkdirSync(path.dirname(abs), { recursive: true });
		await page.screenshot({ path: abs, fullPage: false, animations: "disabled", caret: "hide" });
		entry.sha256 = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
		entry.finalUrl = page.url();
		entry.themeApplied = await page.evaluate((t) => document.documentElement.classList.contains("dark") === (t === "dark"), theme);
	} catch (e) {
		entry.error = trunc(e?.message ?? e);
	}
	entry.consoleErrors = [...consoleErrors];
	console.error(`capture ${file}: ${entry.status ?? "error"}${entry.error ? ` (${entry.error})` : ""}${entry.themeApplied === false ? " (theme not applied)" : ""}`);
	return entry;
}

async function runShots(browser, args) {
	const outDir = path.join(OUT, `screens-${args.label}`);
	fs.mkdirSync(outDir, { recursive: true });
	const manifest = {
		label: args.label,
		baseUrl: BASE,
		startedServer: Boolean(server),
		head: git("rev-parse", "HEAD"),
		captures: [],
		notApplicable: [
			{ state: "collapsed", reason: "new behavior, VD-29" },
			{ state: "rail-hover", reason: "new behavior, VD-29" },
		],
		pointer: "parked at (innerWidth - 2, innerHeight - 2) after each interaction, except current-row-hover, row-hover (hovered) and row-focus (parked before Tab)",
	};
	for (const theme of ["light", "dark"]) {
		for (const width of [375, 900, 1024, 1280]) {
			const states = width >= 1024 ? DESKTOP_STATES : SHEET_STATES;
			const seeded = await newOwnerPage(browser, width, { theme, tourSeed: true });
			try {
				for (const [state, route, interaction] of states) {
					if (!interaction) continue;
					manifest.captures.push(await shoot(seeded.page, seeded.consoleErrors, { outDir, state, route, theme, width, interaction }));
				}
			} finally {
				await seeded.ctx.close();
			}
			const tour = await newOwnerPage(browser, width, { theme, tourSeed: false });
			try {
				manifest.captures.push(await shoot(tour.page, tour.consoleErrors, { outDir, state: "tour-step5", route: "/dashboard", theme, width, interaction: TOUR_INTERACTION }));
			} finally {
				await tour.ctx.close();
			}
		}
	}
	manifest.writes = finalizeWrites();
	fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
	const failed = manifest.captures.filter((c) => c.error || c.status !== 200 || c.themeApplied !== true);
	console.error(`sidebar-step0: ${manifest.captures.length} captures; manifest at ${path.join(outDir, "manifest.json")}`);
	if (failed.length) {
		console.error(`sidebar-step0: failed states: ${failed.map((c) => c.file).join(", ")}`);
		return 1;
	}
	return 0;
}

// ---------- main ----------
const args = parseArgs(process.argv.slice(2));
if (!ownerCredentialsPresent()) fail("credentials not in environment", 3);
fs.mkdirSync(OUT, { recursive: true });
let server = null;
const onSignal = async () => {
	if (server) await server.stop();
	process.exit(130);
};
process.once("SIGINT", onSignal);
process.once("SIGTERM", onSignal);
let exitCode = 0;
try {
	if (args.start) {
		server = await startServer(args.port, path.join(OUT, `next-start-${args.mode}${args.label ? `-${args.label}` : ""}.log`));
		BASE = server.base;
	} else {
		BASE = args.baseUrl ?? BASE;
		if ((await getStatus(`${BASE}/`)) !== 200) fail(`${BASE}/ does not answer GET / with 200`);
	}
	process.env.PLAYWRIGHT_BASE_URL = BASE;
	({ loginAsOwner } = await import(path.join(ROOT, "tests/e2e/auth-helpers.ts")));
	const browser = await chromium.launch();
	try {
		if (args.mode === "claims") {
			const { claims, informational, tourFailure } = await runClaims(browser);
			const result = {
				meta: {
					head: git("rev-parse", "HEAD"),
					preW5: git("log", "-1", "--format=%H", "--grep=^docs(66.2-19): record the wave 4 gate"),
					baseUrl: BASE,
					startedServer: Boolean(server),
					viewports: Object.entries(VIEWPORTS).map(([w, h]) => ({ width: Number(w), height: h })),
					playwrightVersion: require("playwright/package.json").version,
					axeVersion: { "@axe-core/playwright": require("@axe-core/playwright/package.json").version, "axe-core": require("axe-core/package.json").version },
					overlaySelector: OVERLAY_DESC,
					settleMs: SETTLE_MS,
					generatedAt: new Date().toISOString(),
				},
				claims,
				informational,
				writes: finalizeWrites(),
			};
			if (tourFailure) result.tourFailure = tourFailure;
			fs.writeFileSync(path.join(OUT, "step0-claims.json"), `${JSON.stringify(result, null, 2)}\n`);
			console.log(JSON.stringify(Object.fromEntries(Object.entries(claims).map(([k, v]) => [k, v.verdict]))));
			if (tourFailure) {
				console.error(`sidebar-step0: tour never reached step 5 (${tourFailure})`);
				exitCode = 1;
			}
		} else {
			exitCode = await runShots(browser, args);
		}
	} finally {
		await browser.close();
	}
} finally {
	if (server) await server.stop();
	process.removeListener("SIGINT", onSignal);
	process.removeListener("SIGTERM", onSignal);
}
process.exit(exitCode);
