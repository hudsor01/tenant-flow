// Prototype probe (CP-4 follow-up, option A): moves each KPI label + value into a wrapping flex row (value nowrap) in the live DOM and measures before/after. Measurement only; no source change.
//   bun <this> <label> <baseUrl> <outJson> <matrixJson>
// matrixJson: [{ "w": 1024, "h": 800, "collapsed": false }, ...]
// Reads only; intercepts user_tour_progress locally (0 forwarded); no trace/screenshot.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const [label, baseUrl, outJson, matrixJson] = process.argv.slice(2);
process.env.PLAYWRIGHT_BASE_URL = baseUrl;
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { chromium } = require("playwright");
const { loginAsOwner } = await import(path.join(ROOT, "tests/e2e/auth-helpers.ts"));
const matrix = JSON.parse(fs.readFileSync(matrixJson, "utf8"));

const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
let tourForwarded = 0;
let tourAnswered = 0;
await page.route("**/rest/v1/user_tour_progress*", async (route) => {
	tourAnswered += 1;
	if (route.request().method() === "GET") {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			headers: { "access-control-allow-origin": "*" },
			body: JSON.stringify([{ tour_key: "owner-onboarding", status: "completed", current_step: 0, completed_at: "2026-01-01T00:00:00.000Z", skipped_at: null, last_seen_at: "2026-01-01T00:00:00.000Z" }]),
		});
		return;
	}
	await route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
});
await loginAsOwner(page);
await page.evaluate(() => localStorage.setItem("tenantflow:tour-progress", JSON.stringify({ "owner-onboarding": "completed" })));

const results = [];
for (const cell of matrix) {
	await context.addCookies([{ name: "sidebar_state", value: cell.collapsed ? "false" : "true", url: baseUrl }]);
	await page.setViewportSize({ width: cell.w, height: cell.h });
	await page.goto(`${baseUrl}/dashboard`);
	await page.getByRole("heading", { level: 1, name: "Dashboard", exact: true }).waitFor({ timeout: 20000 });
	await page.waitForSelector('[data-testid="kpi-bento-row"] [role="list"] [data-slot="stat-value"]', { timeout: 20000 });
	await page.waitForSelector('[data-tour="quick-actions"]', { timeout: 20000 });
	await page.waitForFunction(() => {
		const n = document.querySelector('[data-testid="kpi-bento-row"]');
		return n !== null && Object.keys(n).some((k) => k.startsWith("__react"));
	});
	// let dynamic charts settle
	await page.waitForFunction(() => document.querySelector('[data-tour="trends-section"] [role="img"] svg') !== null, null, { timeout: 20000 }).catch(() => {});
	await page.waitForTimeout(600);
	const m = await page.evaluate(() => {
		const snap = () => [...document.querySelectorAll('[data-testid="kpi-bento-row"] [data-slot="stat"]')].map((s) => {
			const le = s.querySelector('[data-slot="stat-label"]');
			const ve = s.querySelector('[data-slot="stat-value"]');
			const l = le.getBoundingClientRect();
			const v = ve.getBoundingClientRect();
			const sb = s.getBoundingClientRect();
			const cs = getComputedStyle(s);
			const f = (b) => [b.x, b.y, b.width, b.height].map((n) => +n.toFixed(2));
			return { label: le.textContent, stat: f(sb), l: f(l), v: f(v), lines: Math.round(v.height / parseFloat(getComputedStyle(ve).lineHeight)), vInside: v.right <= sb.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth) + 0.5, ovf: s.scrollWidth - s.clientWidth };
		});
		const before = snap();
		for (const s of document.querySelectorAll('[data-testid="kpi-bento-row"] [data-slot="stat"]')) {
			const l = s.querySelector('[data-slot="stat-label"]');
			const v = s.querySelector('[data-slot="stat-value"]');
			const w = document.createElement("div");
			w.style.cssText = "grid-column: span 2 / span 2; display: flex; flex-wrap: wrap; justify-content: space-between; column-gap: 1rem; row-gap: 0.25rem";
			s.insertBefore(w, l);
			w.append(l, v);
			v.style.whiteSpace = "nowrap";
		}
		const after = snap();
		return { before, after };
	});
	const c = cell;
	const diffs = m.before.map((b, i) => {
		const a = m.after[i];
		const same = JSON.stringify([b.stat, b.l, b.v]) === JSON.stringify([a.stat, a.l, a.v]);
		return `${b.label}: before lines=${b.lines} v=${b.v} | after lines=${a.lines} v=${a.v} inside=${a.vInside} ovf=${a.ovf} ${same ? "IDENTICAL" : "CHANGED"}`;
	});
	console.log(`== ${c.w}x${c.h} ${c.collapsed ? "COLL" : "EXP"}\n  ${diffs.join("\n  ")}`);
	results.push({ cell, ...m });
}
fs.writeFileSync(outJson, JSON.stringify({ label, results }, null, 2));
await browser.close();
