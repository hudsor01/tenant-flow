// @vitest-environment node
/**
 * ChartContainer recharts stroke selectors (66.2-25; D-28, C2, VD-16, VD-17).
 *
 * Recharts writes its default strokes as SVG presentation attributes (a grey on
 * grid lines, white on dots and sectors). Attribute-VALUE selectors that compare
 * that attribute with a `var()` never match, so the recolour rules were inert.
 * D-28 bans the hex value upstream matches on, so ChartContainer matches on the
 * attribute's PRESENCE instead: a class rule beats a presentation attribute.
 * The sector rule matches a stroke that is not a `var()` instead, so a Pie's
 * token stroke (the occupancy donut's wedge separator) survives it (66.2-39
 * fix round 3, F75); occupancy-donut-chart.test.tsx matches the compiled
 * selector against both kinds of sector.
 *
 * This file pins, in node (React SSR plus the real Tailwind engine):
 *   - the SSR class string, `data-slot="chart"`, the ChartStyle `<style>` text
 *     and the rAF mount gate (D-26: ResponsiveContainer is absent before the
 *     first animation frame);
 *   - that the project scan reaches chart.tsx (and not this file) and compiles
 *     each of the 5 selectors to the intended rule;
 *   - getPayloadConfigFromPayload's lookup order.
 */
import { resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	type ChartConfig,
	ChartContainer,
	getPayloadConfigFromPayload,
} from "#components/ui/chart";
import {
	loadProjectTailwindEngine,
	REPO_ROOT,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";

const CHART_STROKE_SELECTORS = [
	"[&_.recharts-cartesian-grid_line[stroke]]:stroke-border/50",
	"[&_.recharts-polar-grid_[stroke]]:stroke-border",
	"[&_.recharts-reference-line_[stroke]]:stroke-border",
	"[&_.recharts-dot[stroke]]:stroke-transparent",
	"[&_.recharts-sector:not([stroke^='var('])]:stroke-transparent",
] as const;

const [GRID, POLAR_GRID, REFERENCE_LINE, DOT, SECTOR] = CHART_STROKE_SELECTORS;

const ATTRIBUTE_VALUE_SELECTOR = "[stroke=";
const BORDER_VAR = /var\(--(color-)?border\)/;
const ENGINE_TIMEOUT_MS = 30_000;

const CHART_PATH = resolve(REPO_ROOT, "src/components/ui/chart.tsx");
const THIS_TEST_PATH = resolve(
	REPO_ROOT,
	"src/components/ui/__tests__/chart.test.tsx",
);

const REVENUE_CONFIG = {
	revenue: { label: "Revenue", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

let projectEnginePromise: Promise<TailwindEngine> | undefined;

function projectEngine(): Promise<TailwindEngine> {
	if (projectEnginePromise === undefined) {
		projectEnginePromise = loadProjectTailwindEngine();
	}
	return projectEnginePromise;
}

function renderChart(config: ChartConfig, className?: string): string {
	return renderToString(
		<ChartContainer id="probe" config={config} className={className}>
			<svg aria-hidden="true" />
		</ChartContainer>,
	);
}

function decodeAttribute(value: string): string {
	return value
		.replaceAll("&#x27;", "'")
		.replaceAll("&quot;", '"')
		.replaceAll("&amp;", "&");
}

/** The opening tag of the ChartContainer root (the element carrying data-chart). */
function chartRootTag(html: string): string {
	const match = /<div\b[^>]*\bdata-chart="chart-probe"[^>]*>/.exec(html);
	if (match === null) {
		throw new Error(
			'no element with data-chart="chart-probe" in the SSR markup',
		);
	}
	return match[0];
}

function chartRootClass(html: string): string {
	const match = /\bclass="([^"]*)"/.exec(chartRootTag(html));
	if (match === null) {
		throw new Error("the ChartContainer root has no class attribute");
	}
	return decodeAttribute(match[1] ?? "");
}

function styleText(html: string): string | null {
	const match = /<style\b[^>]*>([\s\S]*?)<\/style>/.exec(html);
	return match === null ? null : (match[1] ?? "");
}

function cssFor(engine: TailwindEngine, candidate: string): string {
	const [css] = engine.designSystem.candidatesToCss([candidate]);
	if (typeof css !== "string") {
		throw new Error(`Tailwind compiles no CSS for ${candidate}`);
	}
	return css;
}

describe("ChartContainer recharts stroke selectors (D-28, C2)", () => {
	it('renders one data-slot="chart" root carrying data-chart', () => {
		const html = renderChart(REVENUE_CONFIG);
		expect(html.split('data-slot="chart"')).toHaveLength(2);
		const root = chartRootTag(html);
		expect(root).toContain('data-slot="chart"');
		expect(root).toContain('data-chart="chart-probe"');
	});

	it("carries the 5 attribute-presence selectors and no attribute-value selector", () => {
		const classes = chartRootClass(renderChart(REVENUE_CONFIG));
		for (const selector of CHART_STROKE_SELECTORS) {
			expect(classes).toContain(selector);
		}
		expect(classes).not.toContain(ATTRIBUTE_VALUE_SELECTOR);
	});

	it("keeps the other recharts tokens and the layout classes", () => {
		const classes = chartRootClass(renderChart(REVENUE_CONFIG));
		for (const token of [
			"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
			"[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
			"aspect-video",
			"[&_.recharts-surface]:outline-hidden",
		]) {
			expect(classes).toContain(token);
		}
	});

	it("gives the tab-focusable recharts surface a visible inset focus outline", () => {
		const classes = chartRootClass(renderChart(REVENUE_CONFIG));
		for (const token of [
			"[&_.recharts-surface:focus-visible]:outline-2",
			"[&_.recharts-surface:focus-visible]:-outline-offset-2",
			"[&_.recharts-surface:focus-visible]:outline-ring",
			"[&_.recharts-surface:focus-visible]:outline-solid",
		]) {
			expect(classes).toContain(token);
		}
	});

	it("appends a consumer className and keeps all 5 selectors", () => {
		const classes = chartRootClass(
			renderChart(REVENUE_CONFIG, "!aspect-auto h-full w-full"),
		);
		expect(classes.endsWith("!aspect-auto h-full w-full")).toBe(true);
		for (const selector of CHART_STROKE_SELECTORS) {
			expect(classes).toContain(selector);
		}
	});

	it("emits the ChartStyle color variables for both themes", () => {
		const css = styleText(renderChart(REVENUE_CONFIG));
		expect(css).not.toBeNull();
		expect(css).toContain("[data-chart=chart-probe] {");
		expect(css).toContain(".dark [data-chart=chart-probe] {");
		expect(css).toContain("--color-revenue: var(--color-chart-1);");
	});

	it("emits the light theme value unprefixed and the dark value under .dark", () => {
		const css = styleText(
			renderChart({
				expenses: {
					label: "Expenses",
					theme: {
						light: "var(--color-chart-2)",
						dark: "var(--color-chart-3)",
					},
				},
			}),
		);
		expect(css).not.toBeNull();
		const [lightRule, darkRule] = (css ?? "").split(
			".dark [data-chart=chart-probe]",
		);
		expect(lightRule).toContain("[data-chart=chart-probe] {");
		expect(lightRule).toContain("--color-expenses: var(--color-chart-2);");
		expect(lightRule).not.toContain("var(--color-chart-3)");
		expect(darkRule).toContain("--color-expenses: var(--color-chart-3);");
		expect(darkRule).not.toContain("var(--color-chart-2)");
	});

	it("renders no <style> for a config without colors", () => {
		const html = renderChart({ revenue: { label: "Revenue" } });
		expect(styleText(html)).toBeNull();
	});

	it("keeps the rAF mount gate: no ResponsiveContainer before the first frame", () => {
		const html = renderChart(REVENUE_CONFIG);
		expect(html).not.toContain('data-testid="responsive-container"');
	});

	it(
		"scans chart.tsx and not this test file (non-vacuity)",
		async () => {
			const { scannedFiles } = await projectEngine();
			expect(scannedFiles).toContain(CHART_PATH);
			expect(scannedFiles).not.toContain(THIS_TEST_PATH);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"extracts the 5 selector candidates and no attribute-value candidate",
		async () => {
			const { candidates } = await projectEngine();
			for (const selector of CHART_STROKE_SELECTORS) {
				expect(candidates).toContain(selector);
			}
			expect(
				candidates.filter((c) => c.includes(ATTRIBUTE_VALUE_SELECTOR)),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"compiles each selector to the intended stroke rule",
		async () => {
			const engine = await projectEngine();

			const grid = cssFor(engine, GRID);
			expect(grid).toContain(".recharts-cartesian-grid line[stroke]");
			expect(grid).toContain("color-mix(");
			expect(grid).toContain("50%");
			expect(grid).toMatch(BORDER_VAR);

			const polar = cssFor(engine, POLAR_GRID);
			expect(polar).toContain(".recharts-polar-grid [stroke]");
			expect(polar).toMatch(BORDER_VAR);

			const reference = cssFor(engine, REFERENCE_LINE);
			expect(reference).toContain(".recharts-reference-line [stroke]");
			expect(reference).toMatch(BORDER_VAR);

			const dot = cssFor(engine, DOT);
			expect(dot).toContain(".recharts-dot[stroke]");
			expect(dot).toContain("stroke: transparent");

			const sector = cssFor(engine, SECTOR);
			expect(sector).toContain(".recharts-sector:not([stroke^='var('])");
			expect(sector).toContain("stroke: transparent");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"includes each selector rule in the compiled project CSS",
		async () => {
			const { compiledCss } = await projectEngine();
			for (const fragment of [
				".recharts-cartesian-grid line[stroke]",
				".recharts-polar-grid [stroke]",
				".recharts-reference-line [stroke]",
				".recharts-dot[stroke]",
				".recharts-sector:not([stroke^='var('])",
			]) {
				expect(compiledCss).toContain(fragment);
			}
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("getPayloadConfigFromPayload", () => {
	const config = {
		revenue: { label: "Revenue", color: "var(--color-chart-1)" },
		expenses: { label: "Expenses", color: "var(--color-chart-2)" },
		north: { label: "North" },
	} satisfies ChartConfig;

	it("returns undefined for an undefined payload", () => {
		expect(
			getPayloadConfigFromPayload(config, undefined, "revenue"),
		).toBeUndefined();
	});

	it("uses a string payload[key] as the config key", () => {
		expect(
			getPayloadConfigFromPayload(config, { region: "north" }, "region"),
		).toBe(config.north);
	});

	it("falls back to a string payload.payload[key]", () => {
		expect(
			getPayloadConfigFromPayload(
				config,
				{ payload: { region: "expenses" } },
				"region",
			),
		).toBe(config.expenses);
	});

	it("prefers payload[key] over payload.payload[key]", () => {
		expect(
			getPayloadConfigFromPayload(
				config,
				{ region: "north", payload: { region: "expenses" } },
				"region",
			),
		).toBe(config.north);
	});

	it("otherwise returns config[key]", () => {
		expect(
			getPayloadConfigFromPayload(
				config,
				{ value: 42, payload: { value: 7 } },
				"revenue",
			),
		).toBe(config.revenue);
	});

	it("returns config[key] when the named key is not in the config", () => {
		expect(
			getPayloadConfigFromPayload(config, { revenue: "unknown" }, "revenue"),
		).toBe(config.revenue);
	});
});
