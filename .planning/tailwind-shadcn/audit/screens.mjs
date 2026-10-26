// Screenshot matrix + Chromium-decoded pixel diff for the Tailwind v4 / shadcn remediation.
// Run under bun (it imports tests/e2e/auth-helpers.ts directly; plain node cannot):
//
//   bun .planning/tailwind-shadcn/audit/screens.mjs <label> [--sets public,owner] [--routes /a,/b]
//       [--widths 390,1280] [--base-url <url>] [--start [--port 3062]] [--blog-slug <slug>]
//   bun .planning/tailwind-shadcn/audit/screens.mjs --diff <labelA> <labelB>
//
// Capture writes $TW_AUDIT_OUT/screens-<label>/<set>/<slug>-<theme>-<width>.png and
// $TW_AUDIT_OUT/screens-<label>/manifest.json = { label, baseUrl, startedServer, captures: [{ set,
// route, theme, width, file, status, finalUrl, themeApplied, consoleErrors }], skipped: [{ set,
// route, reason }], owner?: { skipped } | { error } }. <slug> is the route without its leading
// slash with every remaining "/" mapped to "_"; the root route is "root". `file` is
// <set>/<slug>-<theme>-<width>.png, relative to screens-<label>/.
// Matrix: themes light/dark x widths 390/1280 (height 844 below 768, else 800); the owner set adds
// /applications at 375 and 320 unless --widths is given. --routes/--widths override the defaults
// for the chosen sets. The blog route uses --blog-slug, else the first /blog/<slug> link on /blog.
//
// Diff writes $TW_AUDIT_OUT/diff-<A>-vs-<B>.json = { summary: { identical, changed, sizeChanged,
// missingInA, missingInB }, files: [{ name, sizeA, sizeB, changedPixels, changedRatio, bbox }],
// missing: { inA, inB } } for every file present in both screens-<A>/ and screens-<B>/ (a pixel
// counts when any channel differs by more than 2), plus a highlight PNG per changed file at
// diff-<A>-vs-<B>/<name>. It always exits 0: it reports, the gates judge.
//
// Safety: the output dir must resolve outside the repo (exit 2 otherwise, nothing created).
// This file reads no env file itself; the bun runtime loads the worktree's local env file into
// the process at startup. Credentials are tested for presence only and never printed or written;
// no trace, HAR or video is recorded and nothing is uploaded. The owner set runs only when the
// owner credentials and Supabase URL/key are in the process environment (otherwise the
// manifest records owner.skipped) and only navigates: no click, fill or submit. --start refuses
// a port that already accepts connections, starts `next start` with SKIP_ENV_VALIDATION=true in
// its own process group and stops it (and waits for the port to close) before exiting.
import { spawn } from "node:child_process";
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
		console.error(`screens: refusing to write inside the repo (${OUT})`);
		process.exit(2);
	}
}

const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");

const PUBLIC_ROUTES = ["/", "/pricing", "/help", "/faq", "/login", "/signup", "/contact", "/blog/:slug", "/privacy", "/auth/confirm-email", "/auth/update-password"];
const OWNER_ROUTES = ["/dashboard", "/properties", "/tenants", "/leases", "/applications", "/maintenance", "/documents", "/documents/lease-template", "/analytics/overview", "/reports/cash-flow", "/settings"];
const EXTRA_WIDTHS = { "/applications": [375, 320] };
const THEMES = ["light", "dark"];
const DEFAULT_WIDTHS = [390, 1280];
const THEME_KEY = "tenantflow-theme-mode";
const TOUR_KEY = "tenantflow:tour-progress";

const fail = (msg, code = 2) => {
	console.error(`screens: ${msg}`);
	process.exit(code);
};
const trunc = (s) => String(s).slice(0, 300);
const slugOf = (route) => (route === "/" ? "root" : route.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\//g, "_"));
const heightFor = (w) => (w < 768 ? 844 : 800);

// ---------- argv ----------
function parseArgs(argv) {
	const a = { label: null, sets: ["public", "owner"], routes: null, widths: null, baseUrl: null, start: false, port: 3062, blogSlug: null, diff: null };
	const pos = [];
	for (let i = 0; i < argv.length; i++) {
		const x = argv[i];
		const val = () => {
			const v = argv[++i];
			if (v === undefined || v.startsWith("--")) fail(`${x} needs a value`);
			return v;
		};
		if (x === "--diff") {
			const A = argv[++i];
			const B = argv[++i];
			if (!A || !B) fail("--diff needs <labelA> <labelB>");
			a.diff = [A, B];
		} else if (x === "--sets") a.sets = val().split(",").filter(Boolean);
		else if (x === "--routes") a.routes = val().split(",").filter(Boolean);
		else if (x === "--widths") a.widths = val().split(",").filter(Boolean).map(Number);
		else if (x === "--base-url") a.baseUrl = val().replace(/\/+$/, "");
		else if (x === "--start") a.start = true;
		else if (x === "--port") a.port = Number(val());
		else if (x === "--blog-slug") a.blogSlug = val();
		else if (x.startsWith("--")) fail(`unknown flag ${x}`);
		else pos.push(x);
	}
	if (a.diff) {
		if (pos.length) fail("--diff takes no label");
		return a;
	}
	if (pos.length !== 1) fail("usage: screens.mjs <label> [options] | --diff <labelA> <labelB>");
	a.label = pos[0];
	if (!/^[\w.-]+$/.test(a.label)) fail("label must match [A-Za-z0-9_.-]+");
	for (const s of a.sets) if (s !== "public" && s !== "owner") fail(`unknown set ${s}`);
	if (a.widths && (a.widths.length === 0 || a.widths.some((w) => !Number.isInteger(w) || w <= 0))) fail("--widths must be positive integers");
	if (!Number.isInteger(a.port) || a.port <= 0 || a.port > 65535) fail("--port must be a TCP port");
	if (a.start && a.baseUrl) fail("--start and --base-url are exclusive");
	return a;
}

// ---------- server helpers ----------
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(port, logFile) {
	if (await portAccepts(port)) fail(`port ${port} already accepts connections; refusing to capture another server`);
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

// ---------- diff ----------
const listPngs = (dir) => {
	const out = [];
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.isFile() && e.name.endsWith(".png")) out.push(path.relative(dir, p).split(path.sep).join("/"));
		}
	};
	if (fs.existsSync(dir)) walk(dir);
	return out.sort();
};

async function runDiff([A, B]) {
	const dirA = path.join(OUT, `screens-${A}`);
	const dirB = path.join(OUT, `screens-${B}`);
	if (!fs.existsSync(dirA)) fail(`missing ${dirA}`);
	if (!fs.existsSync(dirB)) fail(`missing ${dirB}`);
	const la = listPngs(dirA);
	const lb = listPngs(dirB);
	const setA = new Set(la);
	const setB = new Set(lb);
	const both = la.filter((n) => setB.has(n));
	const missing = { inA: lb.filter((n) => !setA.has(n)), inB: la.filter((n) => !setB.has(n)) };
	const hiDir = path.join(OUT, `diff-${A}-vs-${B}`);
	const browser = await chromium.launch();
	const files = [];
	const summary = { identical: 0, changed: 0, sizeChanged: 0, missingInA: missing.inA.length, missingInB: missing.inB.length };
	try {
		const page = await browser.newPage();
		await page.setContent("<!doctype html><html><body></body></html>");
		for (const name of both) {
			const a = `data:image/png;base64,${fs.readFileSync(path.join(dirA, name)).toString("base64")}`;
			const b = `data:image/png;base64,${fs.readFileSync(path.join(dirB, name)).toString("base64")}`;
			const r = await page.evaluate(
				async ({ a, b }) => {
					const bitmap = async (u) => createImageBitmap(await (await fetch(u)).blob());
					const [ia, ib] = await Promise.all([bitmap(a), bitmap(b)]);
					const W = Math.max(ia.width, ib.width);
					const H = Math.max(ia.height, ib.height);
					const pixels = (img) => {
						const c = new OffscreenCanvas(W, H);
						const ctx = c.getContext("2d", { willReadFrequently: true });
						ctx.drawImage(img, 0, 0);
						return ctx.getImageData(0, 0, W, H).data;
					};
					const da = pixels(ia);
					const db = pixels(ib);
					const out = new ImageData(W, H);
					const o = out.data;
					let changed = 0;
					let minX = W;
					let minY = H;
					let maxX = -1;
					let maxY = -1;
					for (let y = 0; y < H; y++) {
						for (let x = 0; x < W; x++) {
							const k = (y * W + x) * 4;
							const outside = x >= ia.width || y >= ia.height || x >= ib.width || y >= ib.height;
							const diff = outside || Math.abs(da[k] - db[k]) > 2 || Math.abs(da[k + 1] - db[k + 1]) > 2 || Math.abs(da[k + 2] - db[k + 2]) > 2 || Math.abs(da[k + 3] - db[k + 3]) > 2;
							if (diff) {
								changed++;
								if (x < minX) minX = x;
								if (y < minY) minY = y;
								if (x > maxX) maxX = x;
								if (y > maxY) maxY = y;
								o[k] = 255;
								o[k + 1] = 0;
								o[k + 2] = 255;
								o[k + 3] = 255;
							} else {
								const g = Math.round((db[k] + db[k + 1] + db[k + 2]) / 3);
								o[k] = g;
								o[k + 1] = g;
								o[k + 2] = g;
								o[k + 3] = 64;
							}
						}
					}
					let highlight = null;
					if (changed) {
						const c = new OffscreenCanvas(W, H);
						c.getContext("2d").putImageData(out, 0, 0);
						const blob = await c.convertToBlob({ type: "image/png" });
						const bytes = new Uint8Array(await blob.arrayBuffer());
						let bin = "";
						for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
						highlight = btoa(bin);
					}
					return {
						sizeA: [ia.width, ia.height],
						sizeB: [ib.width, ib.height],
						changedPixels: changed,
						changedRatio: +(changed / (W * H)).toFixed(6),
						bbox: changed ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
						highlight,
					};
				},
				{ a, b },
			);
			const sizeSame = r.sizeA[0] === r.sizeB[0] && r.sizeA[1] === r.sizeB[1];
			if (!sizeSame) summary.sizeChanged++;
			else if (r.changedPixels) summary.changed++;
			else summary.identical++;
			if (r.highlight) {
				const hp = path.join(hiDir, name);
				fs.mkdirSync(path.dirname(hp), { recursive: true });
				fs.writeFileSync(hp, Buffer.from(r.highlight, "base64"));
			}
			const { highlight: _h, ...entry } = r;
			files.push({ name, ...entry });
			console.error(`diff ${name}: ${r.changedPixels} changed px${sizeSame ? "" : " (size changed)"}`);
		}
	} finally {
		await browser.close();
	}
	const report = { summary, files, missing };
	const reportPath = path.join(OUT, `diff-${A}-vs-${B}.json`);
	fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
	console.log(JSON.stringify(summary));
	console.error(`report: ${reportPath}`);
}

// ---------- capture ----------
const ownerCredentialsPresent = () =>
	Boolean(process.env.E2E_OWNER_EMAIL) &&
	Boolean(process.env.E2E_OWNER_PASSWORD) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL) &&
	Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.TEST_SUPABASE_PUBLISHABLE_KEY);

async function runCapture(args) {
	const outDir = path.join(OUT, `screens-${args.label}`);
	const manifest = { label: args.label, baseUrl: null, startedServer: false, captures: [], skipped: [] };
	let sets = [...args.sets];
	if (sets.includes("owner") && !ownerCredentialsPresent()) {
		manifest.owner = { skipped: "credentials not in environment" };
		sets = sets.filter((s) => s !== "owner");
	}
	fs.mkdirSync(outDir, { recursive: true });
	const writeManifest = () => fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
	if (sets.length === 0) {
		writeManifest();
		console.error(`screens: nothing to capture; manifest at ${path.join(outDir, "manifest.json")}`);
		return 0;
	}

	let server = null;
	let base = args.baseUrl ?? "http://localhost:3062";
	const onSignal = async () => {
		if (server) await server.stop();
		process.exit(130);
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);
	let exitCode = 0;
	try {
		if (args.start) {
			server = await startServer(args.port, path.join(outDir, "next-start.log"));
			base = server.base;
			manifest.startedServer = true;
		} else if ((await getStatus(`${base}/`)) !== 200) fail(`${base}/ does not answer GET / with 200`);
		manifest.baseUrl = base;

		const resolveRoutes = async (set) => {
			const list = args.routes ?? (set === "public" ? PUBLIC_ROUTES : OWNER_ROUTES);
			const out = [];
			for (const r of list) {
				if (r !== "/blog/:slug") {
					out.push(r);
					continue;
				}
				let slug = args.blogSlug;
				if (!slug) {
					try {
						const res = await fetch(`${base}/blog`, { signal: AbortSignal.timeout(30000) });
						slug = (await res.text()).match(/href="\/blog\/([^"/?#]+)"/)?.[1] ?? null;
					} catch {
						slug = null;
					}
				}
				if (slug) out.push(`/blog/${slug}`);
				else manifest.skipped.push({ set, route: r, reason: "no blog slug" });
			}
			return out;
		};

		let loginAsOwner = null;
		if (sets.includes("owner")) {
			process.env.PLAYWRIGHT_BASE_URL = base;
			({ loginAsOwner } = await import(path.join(ROOT, "tests/e2e/auth-helpers.ts")));
		}

		const browser = await chromium.launch();
		try {
			for (const set of sets) {
				const routes = await resolveRoutes(set);
				const widthsOf = (route) => {
					if (args.widths) return args.widths;
					return set === "owner" && EXTRA_WIDTHS[route] ? [...DEFAULT_WIDTHS, ...EXTRA_WIDTHS[route]] : DEFAULT_WIDTHS;
				};
				const allWidths = [...new Set(routes.flatMap(widthsOf))];
				for (const theme of THEMES) {
					for (const width of allWidths) {
						const todo = routes.filter((r) => widthsOf(r).includes(width));
						if (!todo.length) continue;
						const ctx = await browser.newContext({ viewport: { width, height: heightFor(width) }, deviceScaleFactor: 1, reducedMotion: "reduce", timezoneId: "UTC", locale: "en-US" });
						try {
							await ctx.addInitScript(
								({ theme, themeKey, tourKey }) => {
									try {
										localStorage.setItem(themeKey, theme);
										localStorage.setItem(tourKey, JSON.stringify({ "owner-onboarding": "completed" }));
									} catch {}
								},
								{ theme, themeKey: THEME_KEY, tourKey: TOUR_KEY },
							);
							const page = await ctx.newPage();
							let errors = [];
							page.on("console", (m) => {
								if (m.type() === "error") errors.push(trunc(m.text()));
							});
							page.on("pageerror", (e) => errors.push(trunc(e?.message ?? e)));
							if (set === "owner") {
								try {
									await loginAsOwner(page);
								} catch (e) {
									manifest.owner = { error: trunc(e?.message ?? e) };
									exitCode = 1;
									console.error(`screens: owner sign-in failed for ${theme} ${width}; owner captures stop`);
									break;
								}
							}
							for (const route of todo) {
								errors = [];
								const file = `${set}/${slugOf(route)}-${theme}-${width}.png`;
								const entry = { set, route, theme, width, file, status: null, finalUrl: null, themeApplied: null, consoleErrors: [] };
								try {
									const res = await page.goto(`${base}${route}`, { waitUntil: "load", timeout: 60000 });
									entry.status = res ? res.status() : null;
									await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
									await page.evaluate(async () => {
										await document.fonts.ready;
									});
									await page.waitForTimeout(500);
									fs.mkdirSync(path.join(outDir, set), { recursive: true });
									await page.screenshot({ path: path.join(outDir, file), fullPage: true, animations: "disabled", caret: "hide" });
									entry.finalUrl = page.url();
									entry.themeApplied = await page.evaluate((t) => document.documentElement.classList.contains("dark") === (t === "dark"), theme);
								} catch (e) {
									entry.error = trunc(e?.message ?? e);
									exitCode = 1;
								}
								entry.consoleErrors = errors;
								manifest.captures.push(entry);
								console.error(`capture ${file}: ${entry.status ?? "error"}${entry.themeApplied === false ? " (theme not applied)" : ""}`);
							}
						} finally {
							await ctx.close();
						}
					}
					if (manifest.owner?.error && set === "owner") break;
				}
			}
		} finally {
			await browser.close();
		}
	} finally {
		if (server) await server.stop();
		process.removeListener("SIGINT", onSignal);
		process.removeListener("SIGTERM", onSignal);
		writeManifest();
	}
	console.error(`screens: ${manifest.captures.length} captures; manifest at ${path.join(outDir, "manifest.json")}`);
	return exitCode;
}

const args = parseArgs(process.argv.slice(2));
if (args.diff) {
	await runDiff(args.diff);
	process.exit(0);
}
process.exit(await runCapture(args));
