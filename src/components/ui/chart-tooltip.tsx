"use client";

import type { ComponentProps, CSSProperties } from "react";
import * as RechartsPrimitive from "recharts";
import type {
	NameType,
	Payload as RechartsPayload,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { getPayloadConfigFromPayload, useChart } from "#components/ui/chart";
import { cn } from "#lib/utils";

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
	active,
	payload: tooltipPayload,
	className,
	indicator = "dot",
	hideLabel = false,
	hideIndicator = false,
	label,
	labelFormatter,
	labelClassName,
	formatter,
	color,
	nameKey,
	labelKey,
}: ComponentProps<typeof RechartsPrimitive.Tooltip> &
	ComponentProps<"div"> & {
		hideLabel?: boolean;
		hideIndicator?: boolean;
		indicator?: "line" | "dot" | "dashed";
		nameKey?: string;
		labelKey?: string;
		// Recharts injects `payload` at runtime when this is rendered via
		// `<Tooltip content={<ChartTooltipContent />} />`; the prop itself is
		// not on the Tooltip Props type, so declare it explicitly here using
		// Recharts' own Payload type to keep formatter/labelFormatter calls
		// type-clean (no `as unknown as` bridges).
		payload?: ReadonlyArray<RechartsPayload<ValueType, NameType>>;
		label?: string;
	}) {
	const { config } = useChart();
	const payload = tooltipPayload;

	const tooltipLabel = (() => {
		if (hideLabel || !payload?.length) {
			return null;
		}

		const [item] = payload;
		const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
		// Recharts payload types are often readonly / generic -- cast locally to a
		// simple Record to satisfy our helper which reads arbitrary keys.
		const itemConfig = getPayloadConfigFromPayload(
			config,
			{ ...item } as Record<string, unknown>,
			key,
		);
		const value =
			!labelKey && typeof label === "string"
				? config[label as keyof typeof config]?.label || label
				: itemConfig?.label;

		if (labelFormatter) {
			return (
				<div className={cn("font-medium", labelClassName)}>
					{labelFormatter(value, tooltipPayload ?? [])}
				</div>
			);
		}

		if (!value) {
			return null;
		}

		return <div className={cn("font-medium", labelClassName)}>{value}</div>;
	})();

	if (!active || !payload?.length) {
		return null;
	}

	const nestLabel = payload.length === 1 && indicator !== "dot";

	return (
		<div
			className={cn(
				"border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
				className,
			)}
		>
			{!nestLabel ? tooltipLabel : null}
			<div className="grid gap-1.5">
				{payload
					.filter((item) => item.type !== "none")
					.map((item, index) => {
						const key = `${nameKey || item.name || item.dataKey || "value"}`;
						const itemConfig = getPayloadConfigFromPayload(
							config,
							{ ...item } as Record<string, unknown>,
							key,
						);
						const indicatorColor =
							color ||
							(item.payload &&
							typeof item.payload === "object" &&
							"fill" in item.payload
								? item.payload.fill
								: undefined) ||
							item.color;

						return (
							<div
								key={String(item.dataKey ?? item.name ?? index)}
								className={cn(
									"[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
									indicator === "dot" && "items-center",
								)}
							>
								{formatter &&
								item?.value !== undefined &&
								item.name &&
								item.payload !== null &&
								item.value !== null &&
								item.value !== undefined &&
								typeof item.value !== "object" ? (
									formatter(
										item.value as ValueType,
										item.name,
										item,
										index,
										payload ?? [],
									)
								) : (
									<>
										{itemConfig?.icon ? (
											<itemConfig.icon />
										) : (
											!hideIndicator && (
												<div
													className={cn(
														"shrink-0 rounded-sm border-border bg-(--color-bg)",
														{
															"h-2.5 w-2.5": indicator === "dot",
															"w-1": indicator === "line",
															"w-0 border-2 border-dashed bg-transparent":
																indicator === "dashed",
															"my-0.5": nestLabel && indicator === "dashed",
														},
													)}
													style={
														{
															"--color-bg": indicatorColor,
															"--color-border": indicatorColor,
														} as CSSProperties
													}
												/>
											)
										)}
										<div
											className={cn(
												"flex flex-1 justify-between leading-none",
												nestLabel ? "items-end" : "items-center",
											)}
										>
											<div className="grid gap-1.5">
												{nestLabel ? tooltipLabel : null}
												<span className="text-muted-foreground">
													{itemConfig?.label || item.name}
												</span>
											</div>
											{item.value !== null && item.value !== undefined && (
												<span className="text-foreground font-mono font-medium tabular-nums">
													{typeof item.value === "number"
														? item.value.toLocaleString()
														: String(item.value)}
												</span>
											)}
										</div>
									</>
								)}
							</div>
						);
					})}
			</div>
		</div>
	);
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
	className,
	hideIcon = false,
	payload,
	verticalAlign = "bottom",
	nameKey,
	...props
}: ComponentProps<"div"> & {
	hideIcon?: boolean;
	nameKey?: string;
	payload?: Array<{
		name?: string;
		value?: unknown;
		color?: string;
		dataKey?: string;
		type?: "none" | string;
	}>;
	verticalAlign?: "top" | "bottom";
}) {
	const { config } = useChart();

	if (!payload?.length) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex-center gap-4",
				verticalAlign === "top" ? "pb-3" : "pt-3",
				className,
			)}
			{...props}
		>
			{(payload || [])
				.filter((item) => item.type !== "none")
				.map((item) => {
					const key = `${nameKey || item.dataKey || "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);

					return (
						<div
							key={item.value?.toString()}
							className={cn(
								"[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3",
							)}
						>
							{itemConfig?.icon && !hideIcon ? (
								<itemConfig.icon />
							) : (
								<div
									className="size-2 shrink-0 rounded-sm"
									style={{
										backgroundColor: item.color,
									}}
								/>
							)}
							{itemConfig?.label}
						</div>
					);
				})}
		</div>
	);
}

export { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent };
