/**
 * ChartContainer's recharts selectors match what the installed recharts draws
 * (66.2-39 fix round 3, part 6c).
 *
 * The axis rule `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`
 * was written for recharts 2, which drew each tick's label inside its
 * `g.recharts-cartesian-axis-tick`. Recharts 3 draws the labels in a separate
 * `g.recharts-cartesian-axis-tick-labels` (each in a
 * `g.recharts-cartesian-axis-tick-label`) and leaves only the tick line in the
 * tick group, so the rule matched nothing: every chart's axis text painted the
 * `fill="#666"` recharts writes (5.58:1 on the light card, 3.37:1 on the dark
 * one). Every other unit test aliases `recharts` to a mock of divs, so no test
 * could see the drift.
 *
 * This renders the REAL recharts (required past the Vitest alias) inside the
 * real ChartContainer, compiles each of ChartContainer's `[&_.recharts…]`
 * classes with the project's Tailwind design system, and matches the compiled
 * selector against the drawn SVG: each rule must reach the elements it is
 * written for, and the axis rule every tick label.
 *
 * @vitest-environment jsdom
 */
import { createRequire } from "node:module";
import { render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import {
	loadProjectDesignSystem,
	type TailwindDesignSystem,
} from "#test/utils/tailwind-engine";

// Vitest aliases `recharts` to src/test/mocks/recharts.tsx for every unit
// test; Node's own require resolves the installed package instead.
const real: typeof import("recharts") = createRequire(import.meta.url)(
	"recharts",
);
const installed: { version: string } = createRequire(import.meta.url)(
	"recharts/package.json",
);

const ENGINE_TIMEOUT_MS = 30_000;
const CONFIG = {
	value: { label: "Value", color: "var(--color-chart-1)" },
} satisfies ChartConfig;
const DATA = [
	{ month: "Jan", value: 4 },
	{ month: "Feb", value: 9 },
	{ month: "Mar", value: 6 },
];

let designSystem: TailwindDesignSystem;
beforeAll(async () => {
	designSystem = await loadProjectDesignSystem();
}, ENGINE_TIMEOUT_MS);

/** Each recharts rule on the container, with the selector Tailwind compiles it to. */
function compiledRules(
	chart: Element,
): { candidate: string; selector: string }[] {
	return [...chart.classList]
		.filter((candidate) => candidate.startsWith("[&_.recharts"))
		.map((candidate) => {
			const css = designSystem.candidatesToCss([candidate])[0] ?? "";
			return { candidate, selector: css.slice(0, css.indexOf("{")).trim() };
		});
}

/** Every chart kind whose elements a ChartContainer rule is written for. */
function Charts() {
	return (
		<>
			<ChartContainer config={CONFIG} data-probe="cartesian">
				<real.LineChart width={480} height={240} data={DATA}>
					<real.CartesianGrid />
					<real.XAxis dataKey="month" />
					<real.YAxis />
					<real.ReferenceLine y={5} />
					<real.Tooltip defaultIndex={1} content={() => null} />
					<real.Line dataKey="value" isAnimationActive={false} />
				</real.LineChart>
			</ChartContainer>
			<ChartContainer config={CONFIG} data-probe="bar">
				<real.BarChart width={480} height={240} data={DATA}>
					<real.XAxis dataKey="month" />
					<real.Tooltip defaultIndex={1} content={() => null} />
					<real.Bar dataKey="value" isAnimationActive={false} />
				</real.BarChart>
			</ChartContainer>
			<ChartContainer config={CONFIG} data-probe="pie">
				<real.PieChart width={240} height={240}>
					<real.Pie
						data={DATA}
						dataKey="value"
						nameKey="month"
						isAnimationActive={false}
					/>
				</real.PieChart>
			</ChartContainer>
			<ChartContainer config={CONFIG} data-probe="radial">
				<real.RadialBarChart width={240} height={240} data={DATA}>
					<real.PolarGrid />
					<real.RadialBar
						dataKey="value"
						background
						isAnimationActive={false}
					/>
				</real.RadialBarChart>
			</ChartContainer>
		</>
	);
}

async function renderCharts(): Promise<HTMLElement> {
	const { container } = render(<Charts />);
	// ChartContainer mounts its chart on the first animation frame.
	await waitFor(() =>
		expect(container.querySelectorAll("svg.recharts-surface")).toHaveLength(4),
	);
	return container;
}

describe(`ChartContainer's recharts rules against recharts ${installed.version}`, () => {
	it(
		"paints every axis tick label with the muted-foreground rule",
		async () => {
			const container = await renderCharts();
			const chart = container.querySelector('[data-probe="cartesian"]');
			if (!chart) throw new Error("no cartesian ChartContainer");
			const axis = compiledRules(chart).filter((r) =>
				r.candidate.endsWith(":fill-muted-foreground"),
			);
			expect(axis).toHaveLength(1);
			const [rule] = axis;
			const labels = [
				...container.querySelectorAll(
					".recharts-cartesian-axis-tick-labels text",
				),
			];
			// 3 months on each X axis, the Y axis' ticks on the line chart.
			expect(labels.length).toBeGreaterThan(6);
			const reached = new Set(container.querySelectorAll(rule?.selector ?? ""));
			expect(
				labels
					.filter((label) => !reached.has(label))
					.map((label) => label.textContent),
			).toEqual([]);
			expect(rule?.candidate).toBe(
				"[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground",
			);
			// What it overrides: the presentation attribute recharts writes.
			expect(labels[0]?.getAttribute("fill")).toBe("#666");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"reaches what each other rule is written for",
		async () => {
			const container = await renderCharts();
			const chart = container.querySelector('[data-probe="cartesian"]');
			if (!chart) throw new Error("no cartesian ChartContainer");
			// The focus rules draw on a keyboard-focused surface (recharts makes
			// each one a tab stop).
			const surface = chart.querySelector<SVGSVGElement>(
				"svg.recharts-surface",
			);
			expect(surface?.getAttribute("tabindex")).toBe("0");
			surface?.focus();
			const reach = Object.fromEntries(
				compiledRules(chart).map(({ candidate, selector }) => [
					candidate,
					container.querySelectorAll(selector).length,
				]),
			);
			expect(Object.keys(reach)).toHaveLength(16);
			for (const [candidate, count] of Object.entries(reach)) {
				expect(count, candidate).toBeGreaterThan(0);
			}
			// The sector rule leaves a Pie's token stroke alone (F75).
			const sector = compiledRules(chart).find((r) =>
				r.candidate.startsWith("[&_.recharts-sector:not("),
			);
			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path",
			);
			path.setAttribute("class", "recharts-sector");
			path.setAttribute("stroke", "var(--color-card)");
			chart.querySelector("svg")?.appendChild(path);
			expect(path.matches(sector?.selector ?? "")).toBe(false);
			path.remove();
		},
		ENGINE_TIMEOUT_MS,
	);
});
