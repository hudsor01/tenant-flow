/**
 * Pin the Phase 3 KPI sparkline render contract (03-UI-SPEC § 6).
 *
 * The Vitest unit project aliases `recharts` to `src/test/mocks/recharts.tsx`
 * via the top-level `vitest.config.ts` resolver — every Area/AreaChart prop
 * the mock forwards is observable as a `data-*` attribute on the rendered
 * mock element. That's how this test asserts `isAnimationActive={false}`,
 * `dot={false}`, `activeDot={false}`, `strokeWidth={1.5}` without spinning
 * up a real SVG measurement pass.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiSparkline } from "#components/dashboard/components/kpi-sparkline";
import type { TimeSeriesDataPoint } from "#types/analytics";

const data: TimeSeriesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
	date: `2026-04-${String(i + 1).padStart(2, "0")}`,
	value: 1000 + i * 50,
}));

describe("KpiSparkline", () => {
	it('renders with role="img" + the passed aria-label', () => {
		render(
			<KpiSparkline
				data={data}
				trend="up"
				ariaLabel="Revenue trend over the last 30 days, currently $14,250, trending up"
			/>,
		);
		const img = screen.getByRole("img", {
			name: /Revenue trend over the last 30 days/,
		});
		expect(img).toBeInTheDocument();
		expect(img.tagName.toLowerCase()).toBe("div");
		expect(img.className).toContain("[grid-column:1/-1]");
		expect(img.className).toContain("h-16");
		expect(img.className).toContain("w-full");
	});

	it("renders a gradient with id matching the trend", async () => {
		const { container } = render(
			<KpiSparkline
				data={data}
				trend="down"
				ariaLabel="Occupancy trend over the last 30 days, currently 87 percent, trending down"
			/>,
		);
		// ChartContainer defers ResponsiveContainer mount until rAF fires (see
		// `ChartContainer` in `src/components/ui/chart.tsx` — the `mounted`
		// state guards the conditional ResponsiveContainer render so the
		// chart only paints after the first effect tick), so the AreaChart
		// subtree — including the <defs><linearGradient/></defs> — only
		// paints on the next tick. `waitFor` polls until the mount completes.
		const gradient = await waitFor(() => {
			const node = container.querySelector("linearGradient");
			expect(node).not.toBeNull();
			return node;
		});
		expect(gradient?.getAttribute("id")).toBe("spark-fill-down");
	});

	it("uses CSS-variable tokens — no hex / oklch color literal in the rendered DOM", async () => {
		const { container } = render(
			<KpiSparkline
				data={data}
				trend="stable"
				ariaLabel="Active leases trend over the last 30 days, currently 42, trending stable"
			/>,
		);
		// Wait for the deferred ResponsiveContainer mount (see note above)
		// before scanning — without this the inner SVG hasn't painted yet.
		await waitFor(() => {
			expect(container.querySelector("linearGradient")).not.toBeNull();
		});
		// Strip the deterministic gradient id substring before scanning so the
		// `spark-fill-stable` literal (which has no hex content) never trips
		// the regex. After the strip, no `#NNN..` hex shape may remain.
		const stripped = container.innerHTML.replace(
			/spark-fill-(?:up|down|stable)/g,
			"",
		);
		expect(stripped).not.toMatch(
			/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/,
		);
		// Defense-in-depth: no `oklch(` or `rgb(` either.
		expect(stripped).not.toMatch(/oklch\s*\(/i);
		expect(stripped).not.toMatch(/rgba?\s*\(/i);
	});

	it("renders Area with isAnimationActive=false, dot=false, activeDot=false, strokeWidth=1.5", async () => {
		const { container } = render(
			<KpiSparkline
				data={data}
				trend="up"
				ariaLabel="Revenue trend over the last 30 days, currently $14,250, trending up"
			/>,
		);
		// Same rAF gate — wait for the recharts mock subtree to mount before
		// reading its props off the data attributes.
		const area = await waitFor(() => {
			const node = container.querySelector('[data-testid="area"]');
			expect(node).not.toBeNull();
			return node;
		});
		// The recharts mock forwards each render-time prop as a data attribute.
		expect(area?.getAttribute("data-is-animation-active")).toBe("false");
		expect(area?.getAttribute("data-dot")).toBe("false");
		expect(area?.getAttribute("data-active-dot")).toBe("false");
		expect(area?.getAttribute("data-stroke-width")).toBe("1.5");
		expect(area?.getAttribute("data-stroke")).toBe("var(--color-spark)");
		expect(area?.getAttribute("data-key")).toBe("value");
		expect(area?.getAttribute("data-fill")).toBe("url(#spark-fill-up)");
	});
});
