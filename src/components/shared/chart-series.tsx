/**
 * How a chart names its series by more than their hue, and states a money
 * series' figures as money (66.2-39 fix round 3, cycle 2, F39 and F33, and
 * the analytics pages' money charts the F33 sweep found).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 */
import type { ComponentProps, ComponentType, CSSProperties } from "react";
import type { ChartConfig } from "#components/ui/chart";
import type { ChartTooltipContent } from "#components/ui/chart-tooltip";
import {
	type CurrencyFormatOptions,
	formatCurrency,
} from "#lib/utils/currency";

/**
 * A second series' stroke: dashed, so two series differ by their line as
 * well as their hue (WCAG 1.4.1). The legend and tooltip keys draw it too.
 */
export const SECOND_SERIES_DASH = "5 3";

/**
 * A ChartConfig `icon` for a line or area series: a short stroke in the
 * series' color, solid or dashed as the series draws it. ChartLegendContent
 * and ChartTooltipContent render a config's icon in place of their color
 * square, so the key names the series by its line, not its hue alone.
 */
export function chartLineKey(color: string, dash?: string): ComponentType {
	function ChartLineKey() {
		return (
			<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
				<line
					x1="0"
					y1="6"
					x2="12"
					y2="6"
					stroke={color}
					strokeWidth={2}
					strokeDasharray={dash}
				/>
			</svg>
		);
	}
	return ChartLineKey;
}

/**
 * A money axis' tick: the figure in whole dollars ("$4,000", "-$500"). The
 * tooltip states the exact figure.
 */
export function moneyAxisTick(value: number): string {
	return formatCurrency(value, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}

type TooltipFormatter = NonNullable<
	ComponentProps<typeof ChartTooltipContent>["formatter"]
>;

/**
 * A ChartTooltipContent `formatter` that states each series' value through
 * `formatValue`, given the value and the series' config key. The formatter
 * replaces the tooltip's whole row, so it draws the row as
 * ChartTooltipContent does: the series' key, its config label, its value.
 */
export function seriesTooltipFormatter(
	config: ChartConfig,
	formatValue: (value: number, key: string) => string,
): TooltipFormatter {
	return (value, name, item) => {
		const entry = config[String(name)];
		const Key = entry?.icon;
		return (
			<>
				{Key ? (
					<Key />
				) : (
					<div
						className="size-2.5 shrink-0 rounded-sm bg-(--color-bg)"
						style={{ "--color-bg": item.color } as CSSProperties}
					/>
				)}
				<div className="flex flex-1 items-center justify-between gap-4 leading-none">
					<span className="text-muted-foreground">{entry?.label ?? name}</span>
					<span className="text-foreground font-mono font-medium tabular-nums">
						{formatValue(Number(value), String(name))}
					</span>
				</div>
			</>
		);
	};
}

/**
 * `seriesTooltipFormatter` for money series: every value through
 * `formatCurrency`, "Scheduled Rent  $12,800", not "12800" or, from the
 * `[value, name]` pair recharts' own tooltip takes, "$12,800Scheduled Rent".
 */
export function moneyTooltipFormatter(
	config: ChartConfig,
	options?: CurrencyFormatOptions,
): TooltipFormatter {
	return seriesTooltipFormatter(config, (value) =>
		formatCurrency(value, options),
	);
}
