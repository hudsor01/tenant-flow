/**
 * How a chart states a money series' figures as money (66.2-39 fix round 3,
 * cycle 2, F33).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 */
import type { ComponentProps, CSSProperties } from "react";
import type { ChartConfig } from "#components/ui/chart";
import type { ChartTooltipContent } from "#components/ui/chart-tooltip";
import {
	type CurrencyFormatOptions,
	formatCurrency,
} from "#lib/utils/currency";

type TooltipFormatter = NonNullable<
	ComponentProps<typeof ChartTooltipContent>["formatter"]
>;

/**
 * A ChartTooltipContent `formatter` for money series. The formatter replaces
 * the tooltip's whole row, so it draws the row as ChartTooltipContent does
 * (the series' key, its config label, its value) with the value through
 * `formatCurrency`: "Scheduled Rent  $12,800", not "12800" or, from the
 * `[value, name]` pair recharts' own tooltip takes, "$12,800Scheduled Rent".
 */
export function moneyTooltipFormatter(
	config: ChartConfig,
	options?: CurrencyFormatOptions,
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
						{formatCurrency(Number(value), options)}
					</span>
				</div>
			</>
		);
	};
}
