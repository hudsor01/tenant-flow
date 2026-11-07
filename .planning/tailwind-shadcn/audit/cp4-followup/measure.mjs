// Dashboard layout probe for the CP-4 follow-up. Run from the worktree root under bun:
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
		const r = (el) => {
			if (!el) return null;
			const b = el.getBoundingClientRect();
			return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2) };
		};
		const sidebar = document.querySelector('[data-slot="sidebar"]:not([data-mobile="true"])');
		const main = document.querySelector("main#main-content");
		const grid = document.querySelector('[data-testid="kpi-bento-row"] [role="list"]');
		const gcs = getComputedStyle(grid);
		const tiles = [...grid.children].map((li) => {
			const stat = li.querySelector('[data-slot="stat"]');
			const scs = getComputedStyle(stat);
			const labelEl = stat.querySelector('[data-slot="stat-label"]');
			const value = stat.querySelector('[data-slot="stat-value"]');
			const vcs = getComputedStyle(value);
			const kids = [...value.children].map((k) => ({ text: k.textContent, ...r(k) }));
			const tops = [...new Set(kids.map((k) => Math.round(k.y)))];
			// intrinsic one-line width: clone with nowrap, absolutely positioned
			const clone = value.cloneNode(true);
			clone.style.position = "absolute";
			clone.style.whiteSpace = "nowrap";
			clone.style.width = "max-content";
			clone.style.visibility = "hidden";
			stat.appendChild(clone);
			const maxContent = clone.getBoundingClientRect().width;
			clone.remove();
			const lclone = labelEl.cloneNode(true);
			lclone.style.position = "absolute";
			lclone.style.width = "min-content";
			lclone.style.visibility = "hidden";
			stat.appendChild(lclone);
			const labelMin = lclone.getBoundingClientRect().width;
			lclone.remove();
			return {
				label: labelEl.textContent,
				valueText: value.textContent,
				li: r(li),
				stat: r(stat),
				statPadding: `${scs.paddingLeft}/${scs.paddingRight}`,
				statCols: scs.gridTemplateColumns,
				labelBox: r(labelEl),
				labelMinContent: +labelMin.toFixed(2),
				value: r(value),
				valueLineHeight: vcs.lineHeight,
				valueFontSize: vcs.fontSize,
				valueWhiteSpace: vcs.whiteSpace,
				valueMaxContent: +maxContent.toFixed(2),
				kids,
				lineCount: tops.length,
				statOverflowX: stat.scrollWidth - stat.clientWidth,
			};
		});
		const trends = document.querySelector('[data-tour="trends-section"]');
		const tcs = getComputedStyle(trends);
		const qa = document.querySelector('[data-tour="quick-actions"]');
		const tracks = tcs.gridTemplateColumns.split(" ").map(parseFloat);
		const gap = parseFloat(tcs.columnGap);
		const tb = trends.getBoundingClientRect();
		let x = tb.x;
		const trackBoxes = tracks.map((t) => {
			const box = { left: +x.toFixed(2), right: +(x + t).toFixed(2) };
			x += t + gap;
			return box;
		});
		const buttons = [...qa.querySelectorAll("button")].map((b) => ({ text: b.textContent, ...r(b), scrollW: b.scrollWidth, clientW: b.clientWidth }));
		const donutCard = trends.children[1];
		const donutImg = donutCard?.querySelector('[role="img"]');
		const donutSvg = donutImg?.querySelector("svg");
		const dockLink = document.querySelector('a[aria-label="Add Property"][title="Add Property"]');
		const dock = dockLink ? dockLink.closest(".fixed") : null;
		const dockPanel = dock?.firstElementChild ?? null;
		const ov = (a, b) => {
			if (!a || !b) return null;
			const w = Math.min(a.right, b.right) - Math.max(a.x, b.x);
			const h = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
			return w > 0 && h > 0 ? { w: +w.toFixed(2), h: +h.toFixed(2) } : null;
		};
		const dockR = r(dockPanel);
		return {
			viewport: { w: innerWidth, h: innerHeight },
			sidebarState: sidebar?.getAttribute("data-state") ?? null,
			sidebarContainer: r(sidebar?.querySelector('[data-slot="sidebar-container"]') ?? sidebar),
			main: r(main),
			mainPadded: r(main?.firstElementChild),
			kpiGrid: { box: r(grid), cols: gcs.gridTemplateColumns, colCount: gcs.gridTemplateColumns.split(" ").length, gap: gcs.columnGap, containerType: gcs.containerType },
			tiles,
			trends: { box: r(trends), cols: tcs.gridTemplateColumns, gap: tcs.columnGap, trackBoxes, children: [...trends.children].map((c) => ({ title: c.querySelector('[data-slot="card-title"], .leading-none')?.textContent ?? c.textContent.slice(0, 20), ...r(c) })) },
			quickActions: { card: r(qa), scrollW: qa.scrollWidth, clientW: qa.clientWidth, content: r(qa.querySelector('[data-slot="card-content"]') ?? qa.lastElementChild), buttons },
			donut: { card: r(donutCard), img: r(donutImg), svg: r(donutSvg) },
			dock: { wrapper: r(dock), panel: dockR, left: dock ? getComputedStyle(dock).left : null },
			overlap: { dockVsDonutCard: ov(dockR, r(donutCard)), dockVsDonutImg: ov(dockR, r(donutImg)), dockVsDonutSvg: ov(dockR, r(donutSvg)), dockVsRevenueCard: ov(dockR, r(trends.children[0])), dockVsQuickActions: ov(dockR, r(qa)) },
			docH: document.documentElement.scrollHeight,
		};
	});
	results.push({ cell, ...m });
	process.stdout.write(`${label} ${cell.w}x${cell.h} ${cell.collapsed ? "collapsed" : "expanded"}: sidebar=${m.sidebarState} cols=${m.kpiGrid.colCount} lines=${m.tiles.map((t) => t.lineCount).join(",")}\n`);
}
fs.writeFileSync(outJson, JSON.stringify({ label, baseUrl, tourAnswered, tourForwarded, results }, null, 2));
await browser.close();
