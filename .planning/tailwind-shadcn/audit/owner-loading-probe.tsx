// VD-12 computed-style probe for the owner route loading skeleton, src/app/(owner)/loading.tsx.
// Run under bun from the repo root (it imports .tsx files and tests/e2e/auth-helpers.ts directly):
//
//   bun .planning/tailwind-shadcn/audit/owner-loading-probe.tsx <label> [--live] [--start [--port 3062]]
//       [--base-url <url>]
//
// Harness mode (default): compiles src/app/globals.css with the project Tailwind engine
// (src/test/utils/tailwind-engine.ts), renders OwnerLoading with react-dom/server, and loads
// both into a Playwright Chromium page for light/dark x 390/1280 (height 900, deviceScaleFactor 1,
// reduced motion). It measures `#probe-root > div` and takes a full-page screenshot. This is the
// cold-navigation look: only globals.css applies, no other route stylesheet.
//
// Live mode (--live): signs in as the e2e owner through loginAsOwner, opens /dashboard, waits for
// hydration, holds every RSC request for /properties, clicks the Properties link and measures the
// loading boundary that renders inside main#main-content while the request is held. The held
// requests are then continued. It never fills or submits a form.
//
// Outputs: $TW_AUDIT_OUT/owner-loading-<label>.json = { label, mode, captures: [{ theme, width,
// status, checks: [{ name, expected, actual, pass }], allPass, png }], live? } and the PNGs in
// $TW_AUDIT_OUT/owner-loading-<label>/ (harness-<theme>-<width>.png or live-<theme>-<width>.png).
// `png` is relative to $TW_AUDIT_OUT. Capture status is `ok`, `boundary-not-observed` (live: no
// skeleton appeared within 10 s) or `error`. The tool always exits 0 after writing the JSON: it
// reports, the plan's acceptance criteria judge. Usage errors and refusals exit 2.
//
// Safety: the output dir must resolve outside the repo (exit 2 otherwise, nothing created). This
// file reads no env file and imports no env loader; the bun runtime loads the worktree's local env
// file into the process at startup. Credentials are tested for presence only and are never
// printed or written. No trace, HAR or video is recorded. Live mode runs only when the owner
// credentials and the Supabase URL and key are in the process environment; otherwise the JSON
// records live.skipped. --start refuses a port that already accepts connections, starts
// `next start` with SKIP_ENV_VALIDATION=true in its own process group and stops it before exiting.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();

// ---------- output dir: resolved and checked before anything else ----------
const OUT = path.resolve(process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit"));
const realish = (p: string): string => {
	let head = p;
	const tail: string[] = [];
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
		console.error(`owner-loading-probe: refusing to write inside the repo (${OUT})`);
		process.exit(2);
	}
}

const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");

const THEMES = ["light", "dark"] as const;
const WIDTHS = [390, 1280] as const;
const HEIGHT = 900;
const THEME_KEY = "tenantflow-theme-mode";
const TOUR_KEY = "tenantflow:tour-progress";
const SKELETON_COUNT = 37;

type Check = { name: string; expected: string; actual: string; pass: boolean };
type Capture = { theme: string; width: number; status: string; checks: Check[]; allPass: boolean; png: string | null; error?: string; heldRequests?: number };

const fail = (msg: string, code = 2): never => {
	console.error(`owner-loading-probe: ${msg}`);
	process.exit(code);
};
const trunc = (s: unknown) => String(s).slice(0, 300);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- argv ----------
function parseArgs(argv: string[]) {
	const a = { label: "", live: false, start: false, port: 3062, baseUrl: null as string | null };
	const pos: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const x = argv[i];
		const val = () => {
			const v = argv[++i];
			if (v === undefined || v.startsWith("--")) fail(`${x} needs a value`);
			return v;
		};
		if (x === "--live") a.live = true;
		else if (x === "--start") a.start = true;
		else if (x === "--port") a.port = Number(val());
		else if (x === "--base-url") a.baseUrl = val().replace(/\/+$/, "");
		else if (x.startsWith("--")) fail(`unknown flag ${x}`);
		else pos.push(x);
	}
	if (pos.length !== 1) fail("usage: owner-loading-probe.tsx <label> [--live] [--start [--port 3062]] [--base-url <url>]");
	a.label = pos[0];
	if (!/^[\w.-]+$/.test(a.label)) fail("label must match [A-Za-z0-9_.-]+");
	if (!Number.isInteger(a.port) || a.port <= 0 || a.port > 65535) fail("--port must be a TCP port");
	if (a.start && a.baseUrl) fail("--start and --base-url are exclusive");
	if ((a.start || a.baseUrl) && !a.live) fail("--start and --base-url need --live");
	return a;
}

// ---------- the shared page function ----------
// Runs in the browser. mode "harness" measures `#probe-root > div`; mode "live" looks for the
// loading boundary inside main#main-content (4 element children, 37 skeletons) and returns
// { found: false } when it is not there yet.
type MeasureArg = { mode: "harness" | "live"; skeletons: number };
type Measured = { found: boolean; values?: Record<string, Record<string, string>>; refs?: { card: string; border: string }; skeletons?: number; dashboardClassed?: number; overflowX?: number; viewport?: number };
function measureInPage(arg: MeasureArg): Measured {
	const findLive = (): Element | null => {
		const main = document.querySelector("main#main-content");
		if (!main) return null;
		for (const el of Array.from(main.querySelectorAll("*"))) {
			if (el.children.length === 4 && el.querySelectorAll('[data-slot="skeleton"]').length === arg.skeletons) return el;
		}
		return null;
	};
	const root = arg.mode === "harness" ? document.querySelector("#probe-root > div") : findLive();
	if (!root) return { found: false };
	const measure = (rootEl: Element) => {
		const props = ["display", "flexDirection", "rowGap", "columnGap", "paddingTop", "paddingBottom", "paddingLeft", "marginBottom", "borderTopLeftRadius", "borderTopWidth", "borderBottomWidth", "borderTopColor", "backgroundColor", "boxShadow", "overflow", "gridTemplateColumns"];
		const read = (el: Element | undefined | null) => {
			const out: Record<string, string> = {};
			if (!el) return out;
			const cs = getComputedStyle(el);
			for (const p of props) out[p] = String((cs as unknown as Record<string, string>)[p]);
			return out;
		};
		const section = rootEl.children[0];
		const header = section?.children[0];
		const actionInner = rootEl.children[1]?.children[0];
		const grid = rootEl.children[2];
		const card = grid?.children[0];
		const cardInner = card?.children[0];
		const table = rootEl.children[3];
		const tableInner = table?.children[0];
		const headerRow = tableInner?.children[0];
		const row = tableInner?.children[1];
		const values = {
			root: read(rootEl),
			section: read(section),
			header: read(header),
			actionInner: read(actionInner),
			grid: read(grid),
			card: read(card),
			cardInner: read(cardInner),
			table: read(table),
			tableInner: read(tableInner),
			headerRow: read(headerRow),
			row: read(row),
		};
		const cardProbe = document.createElement("div");
		cardProbe.style.setProperty("background-color", "var(--color-card)");
		cardProbe.hidden = true;
		const borderProbe = document.createElement("div");
		borderProbe.style.setProperty("color", "var(--color-border)");
		borderProbe.hidden = true;
		document.body.append(cardProbe, borderProbe);
		const refs = { card: getComputedStyle(cardProbe).backgroundColor, border: getComputedStyle(borderProbe).color };
		cardProbe.remove();
		borderProbe.remove();
		return {
			found: true,
			values,
			refs,
			skeletons: rootEl.querySelectorAll('[data-slot="skeleton"]').length,
			dashboardClassed: document.querySelectorAll('[class*="dashboard-"]').length,
			overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			viewport: window.innerWidth,
		};
	};
	return measure(root);
}

// ---------- the UI-SPEC targets (66.2-UI-SPEC.md, Owner Loading Skeleton) ----------
function evaluateChecks(m: Measured, width: number): Check[] {
	const v = m.values ?? {};
	const refs = m.refs ?? { card: "", border: "" };
	const checks: Check[] = [];
	const eq = (part: string, prop: string, expected: string) => {
		const actual = v[part]?.[prop] ?? "";
		checks.push({ name: `${part}.${prop}`, expected, actual, pass: actual === expected });
	};
	const notNone = (part: string, prop: string) => {
		const actual = v[part]?.[prop] ?? "";
		checks.push({ name: `${part}.${prop}`, expected: "not none", actual, pass: actual !== "" && actual !== "none" });
	};
	eq("root", "display", "flex");
	eq("root", "flexDirection", "column");
	eq("root", "rowGap", "32px");
	eq("section", "paddingTop", "4px");
	eq("section", "paddingBottom", "4px");
	eq("header", "display", "flex");
	eq("header", "flexDirection", "column");
	eq("header", "rowGap", "8px");
	eq("actionInner", "columnGap", "16px");
	eq("grid", "display", "grid");
	eq("grid", "rowGap", "24px");
	eq("grid", "columnGap", "24px");
	eq("grid", "marginBottom", "0px");
	{
		const actual = v.grid?.gridTemplateColumns ?? "";
		const tracks = actual.split(/\s+/).filter(Boolean).map((t) => Number.parseFloat(t));
		const wide = tracks.length > 0 && tracks.every((t) => Number.isFinite(t) && t >= 320);
		const single = width < 700 ? tracks.length === 1 : true;
		checks.push({ name: "grid.gridTemplateColumns", expected: width < 700 ? "1 track >= 320px" : "every track >= 320px", actual, pass: wide && single });
	}
	eq("card", "borderTopLeftRadius", "12px");
	eq("card", "borderTopWidth", "1px");
	eq("card", "borderTopColor", refs.border);
	eq("card", "backgroundColor", refs.card);
	notNone("card", "boxShadow");
	eq("card", "overflow", "hidden");
	eq("cardInner", "paddingTop", "16px");
	eq("table", "borderTopLeftRadius", "16px");
	eq("table", "borderTopWidth", "1px");
	eq("table", "borderTopColor", refs.border);
	eq("table", "backgroundColor", refs.card);
	notNone("table", "boxShadow");
	eq("tableInner", "paddingTop", "32px");
	eq("headerRow", "columnGap", "32px");
	eq("headerRow", "marginBottom", "16px");
	eq("headerRow", "paddingBottom", "16px");
	eq("headerRow", "borderBottomWidth", "1px");
	eq("row", "paddingTop", "16px");
	eq("row", "paddingBottom", "16px");
	checks.push({ name: "skeletonCount", expected: String(SKELETON_COUNT), actual: String(m.skeletons), pass: m.skeletons === SKELETON_COUNT });
	checks.push({ name: "dashboardClassCount", expected: "0", actual: String(m.dashboardClassed), pass: m.dashboardClassed === 0 });
	checks.push({ name: "horizontalOverflow", expected: "<= 0", actual: String(m.overflowX), pass: typeof m.overflowX === "number" && m.overflowX <= 0 });
	return checks;
}

// ---------- server helpers (screens.mjs conventions) ----------
const portAccepts = (port: number) =>
	Promise.all(
		["127.0.0.1", "::1"].map(
			(host) =>
				new Promise<boolean>((resolve) => {
					const sock = net.connect({ host, port });
					const done = (ok: boolean) => {
						sock.destroy();
						resolve(ok);
					};
					sock.setTimeout(1000, () => done(false));
					sock.once("connect", () => done(true));
					sock.once("error", () => done(false));
				}),
		),
	).then((r) => r.some(Boolean));

const getStatus = async (url: string) => {
	try {
		const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
		await res.arrayBuffer().catch(() => {});
		return res.status;
	} catch {
		return 0;
	}
};

async function startServer(port: number, logFile: string) {
	if (await portAccepts(port)) fail(`port ${port} already accepts connections; refusing to probe another server`);
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
		if (!exited && child.pid) {
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
	return fail(`next start did not answer GET / with 200 within 120 s (log: ${logFile})`, 1);
}

const ownerCredentialsPresent = () =>
	Boolean(process.env.E2E_OWNER_EMAIL) &&
	Boolean(process.env.E2E_OWNER_PASSWORD) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.TEST_SUPABASE_PUBLISHABLE_KEY);

// ---------- harness mode ----------
async function runHarness(label: string, outDir: string): Promise<Capture[]> {
	const engineUrl = pathToFileURL(path.join(ROOT, "src/test/utils/tailwind-engine.ts")).href;
	const { loadProjectTailwindEngine } = await import(engineUrl);
	const engine = await loadProjectTailwindEngine();
	const css: string = engine.compiledCss;
	const { createElement } = await import("react");
	const { renderToStaticMarkup } = await import("react-dom/server");
	const loadingUrl = pathToFileURL(path.join(ROOT, "src/app/(owner)/loading.tsx")).href;
	const { default: OwnerLoading } = await import(loadingUrl);
	const markup = renderToStaticMarkup(createElement(OwnerLoading));
	const captures: Capture[] = [];
	const browser = await chromium.launch();
	try {
		for (const theme of THEMES) {
			for (const width of WIDTHS) {
				const capture: Capture = { theme, width, status: "error", checks: [], allPass: false, png: null };
				const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: "reduce" });
				try {
					const page = await ctx.newPage();
					const htmlClass = theme === "dark" ? ' class="dark"' : "";
					await page.setContent(`<!doctype html><html lang="en"${htmlClass}><head><meta charset="utf-8"><style>${css}</style></head><body><div id="probe-root">${markup}</div></body></html>`, { waitUntil: "load" });
					const m: Measured = await page.evaluate(measureInPage, { mode: "harness", skeletons: SKELETON_COUNT });
					if (!m.found) throw new Error("#probe-root > div not found");
					capture.checks = evaluateChecks(m, width);
					capture.allPass = capture.checks.every((c) => c.pass);
					const rel = path.join(`owner-loading-${label}`, `harness-${theme}-${width}.png`);
					await page.screenshot({ path: path.join(OUT, rel), fullPage: true, animations: "disabled" });
					capture.png = rel;
					capture.status = "ok";
				} catch (e) {
					capture.error = trunc((e as Error)?.message ?? e);
				} finally {
					await ctx.close();
				}
				console.error(`harness ${theme} ${width}: ${capture.status}${capture.status === "ok" ? ` allPass=${capture.allPass}` : ""}`);
				captures.push(capture);
			}
		}
	} finally {
		await browser.close();
	}
	return captures;
}

// ---------- live mode ----------
type Route = { continue: () => Promise<void>; request: () => { headers: () => Record<string, string> } };
async function runLive(args: ReturnType<typeof parseArgs>, outDir: string, report: Record<string, unknown>): Promise<Capture[]> {
	const captures: Capture[] = [];
	if (!ownerCredentialsPresent()) {
		report.live = { skipped: "credentials not in environment" };
		return captures;
	}
	let server: { base: string; stop: () => Promise<void> } | null = null;
	let base = args.baseUrl ?? "http://localhost:3062";
	const onSignal = async () => {
		if (server) await server.stop();
		process.exit(130);
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);
	try {
		if (args.start) {
			server = await startServer(args.port, path.join(outDir, "next-start.log"));
			base = server.base;
		} else if ((await getStatus(`${base}/`)) !== 200) fail(`${base}/ does not answer GET / with 200`);
		report.live = { baseUrl: base, startedServer: Boolean(server) };
		process.env.PLAYWRIGHT_BASE_URL = base;
		const { loginAsOwner } = await import(path.join(ROOT, "tests/e2e/auth-helpers.ts"));
		const browser = await chromium.launch();
		try {
			for (const theme of THEMES) {
				for (const width of WIDTHS) {
					const capture: Capture = { theme, width, status: "error", checks: [], allPass: false, png: null };
					const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: "reduce", timezoneId: "UTC", locale: "en-US" });
					const held: Route[] = [];
					try {
						await ctx.addInitScript(
							({ theme, themeKey, tourKey }: { theme: string; themeKey: string; tourKey: string }) => {
								try {
									localStorage.setItem(themeKey, theme);
									localStorage.setItem(tourKey, JSON.stringify({ "owner-onboarding": "completed" }));
								} catch {}
							},
							{ theme, themeKey: THEME_KEY, tourKey: TOUR_KEY },
						);
						const page = await ctx.newPage();
						await loginAsOwner(page);
						await page.goto(`${base}/dashboard`, { waitUntil: "load", timeout: 60000 });
						await page.waitForFunction(
							() => {
								const a = document.querySelector('a[href="/properties"]');
								return Boolean(a) && Object.keys(a as object).some((k) => k.startsWith("__reactFiber$"));
							},
							undefined,
							{ timeout: 30000 },
						);
						await page.route(
							(url: URL) => url.pathname === "/properties",
							async (route: Route) => {
								if (route.request().headers().rsc) {
									held.push(route);
									return;
								}
								await route.continue();
							},
						);
						await page.$eval('a[href="/properties"]', (a: HTMLAnchorElement) => a.click());
						let m: Measured = { found: false };
						const deadline = Date.now() + 10000;
						while (Date.now() < deadline) {
							m = await page.evaluate(measureInPage, { mode: "live", skeletons: SKELETON_COUNT });
							if (m.found) break;
							await sleep(100);
						}
						if (!m.found) {
							capture.status = "boundary-not-observed";
						} else {
							capture.checks = evaluateChecks(m, width);
							capture.allPass = capture.checks.every((c) => c.pass);
							const rel = path.join(`owner-loading-${args.label}`, `live-${theme}-${width}.png`);
							await page.locator("main#main-content").screenshot({ path: path.join(OUT, rel), animations: "disabled" });
							capture.png = rel;
							capture.status = "ok";
						}
						capture.heldRequests = held.length;
						for (const r of held.splice(0)) await r.continue().catch(() => {});
					} catch (e) {
						capture.error = trunc((e as Error)?.message ?? e);
						for (const r of held.splice(0)) await r.continue().catch(() => {});
					} finally {
						await ctx.close();
					}
					console.error(`live ${theme} ${width}: ${capture.status}${capture.status === "ok" ? ` allPass=${capture.allPass}` : ""}`);
					captures.push(capture);
				}
			}
		} finally {
			await browser.close();
		}
	} finally {
		if (server) await server.stop();
		process.removeListener("SIGINT", onSignal);
		process.removeListener("SIGTERM", onSignal);
	}
	return captures;
}

// ---------- main ----------
const args = parseArgs(process.argv.slice(2));
const outDir = path.join(OUT, `owner-loading-${args.label}`);
fs.mkdirSync(outDir, { recursive: true });
const report: Record<string, unknown> = { label: args.label, mode: args.live ? "live" : "harness" };
report.captures = args.live ? await runLive(args, outDir, report) : await runHarness(args.label, outDir);
const reportPath = path.join(OUT, `owner-loading-${args.label}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
console.error(`report: ${reportPath}`);
process.exit(0);
