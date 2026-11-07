/**
 * Every chart legend names its series by their ChartConfig label.
 *
 * recharts' bare `<Legend />` prints each series' dataKey, so the property
 * performance charts' legends read "occupancy" and "revenue" (and, after the
 * rename to rent received, would have read "rentReceived") instead of
 * "Occupancy %" and "Rent received". `ChartLegend content={<ChartLegendContent
 * />}` reads the config's label. This sweeps first-party `src/` for a legend
 * rendered without that content.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			return name === "__tests__" || name === "test" ? [] : sources(path);
		}
		return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
	});
}

describe("chart legends", () => {
	it("render ChartLegendContent, never recharts' dataKey labels", () => {
		const hits = sources(join(process.cwd(), "src")).flatMap((file) =>
			readFileSync(file, "utf8")
				.split("\n")
				.map((line, index) => ({ line, index }))
				.filter(
					({ line }) =>
						/<(Legend|ChartLegend)\b/.test(line) &&
						!/content=\{<ChartLegendContent/.test(line),
				)
				.map(({ index }) => `${file.replace(process.cwd(), "")}:${index + 1}`),
		);
		expect(hits).toEqual([]);
	});
});
