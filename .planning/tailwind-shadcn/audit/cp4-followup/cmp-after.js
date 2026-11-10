// Before (HEAD 1c3f30d24) vs after (the fix) at the same cell: which geometry groups changed.
const fs = require("fs");
const B = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).results;
const A = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).results;
const key = (r) => `${r.cell.w}x${r.cell.h}${r.cell.collapsed ? " coll" : " exp"}`;
const R = (b) => b && { x: b.x, y: b.y, w: b.w, h: b.h };
for (const b of B) {
	const a = A.find((r) => key(r) === key(b));
	const groups = {
		kpiTiles: (r) => r.tiles.map((t) => R(t.stat)),
		kpiValues: (r) => r.tiles.map((t) => R(t.value)),
		kpiValueParts: (r) => r.tiles.map((t) => t.kids.map((k) => ({ t: k.text, ...R(k) }))),
		kpiLabels: (r) => r.tiles.map((t) => ({ x: t.labelBox.x, y: t.labelBox.y })),
		trendsTracks: (r) => r.trends.cols,
		trendsCards: (r) => r.trends.children.map((c) => R(c)),
		quickActions: (r) => [R(r.quickActions.card), r.quickActions.scrollW, r.quickActions.clientW],
		dock: (r) => R(r.dock.panel),
	};
	const changed = Object.entries(groups).filter(([, f]) => JSON.stringify(f(a)) !== JSON.stringify(f(b))).map(([k]) => k);
	const ovf = a.tiles.map((t) => t.statOverflowX);
	const before = b.tiles.map((t) => t.statOverflowX);
	console.log(`${key(b)}: ${changed.length ? "changed: " + changed.join(", ") : "identical"} | tile overflow before [${before}] after [${ovf}] | QA scroll-client before ${b.quickActions.scrollW - b.quickActions.clientW} after ${a.quickActions.scrollW - a.quickActions.clientW}`);
}
