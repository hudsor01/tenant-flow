'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import type {
	Payload as RechartsPayload,
	ValueType
} from 'recharts/types/component/DefaultTooltipContent'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
	[k in string]: {
		label?: React.ReactNode
		icon?: React.ComponentType
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	)
}

type ChartContextProps = {
	config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
	const context = React.useContext(ChartContext)

	if (!context) {
		throw new Error('useChart must be used within a <ChartContainer />')
	}

	return context
}

function ChartContainer({
	id,
	className,
	children,
	config,
	...props
}: React.ComponentProps<'div'> & {
	config: ChartConfig
	children: React.ComponentProps<
		typeof RechartsPrimitive.ResponsiveContainer
	>['children']
}) {
	const uniqueId = React.useId()
	const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				data-slot="chart"
				data-chart={chartId}
				className={cn(
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='var(--color-border)']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='var(--color-border)']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='var(--color-border)']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='var(--color-background)']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='var(--color-background)']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
					className
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	)
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
	const colorConfig = Object.entries(config).filter(
		([, config]) => config.theme || config.color
	)

	if (!colorConfig.length) {
		return null
	}

	return (
		<style
			dangerouslySetInnerHTML={{
				__html: Object.entries(THEMES)
					.map(
						([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
	.map(([key, itemConfig]) => {
		const color =
			itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
			itemConfig.color
		return color ? `  --color-${key}: ${color};` : null
	})
	.join('\n')}
}
`
					)
					.join('\n')
			}}
		/>
	)
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
	active,
	payload: tooltipPayload,
	className,
	indicator = 'dot',
	hideLabel = false,
	hideIndicator = false,
	label,
	labelFormatter,
	labelClassName,
	formatter,
	color,
	nameKey,
	labelKey
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
	React.ComponentProps<'div'> & {
		hideLabel?: boolean
		hideIndicator?: boolean
		indicator?: 'line' | 'dot' | 'dashed'
		nameKey?: string
		labelKey?: string
		payload?: Array<{
			type?: 'none' | string
			color?: string
			dataKey?: string
			name?: string
			value?: unknown
			payload?: Record<string, unknown>
		}>
		label?: string
	}) {
	const { config } = useChart()
	const payload = tooltipPayload

	const tooltipLabel = React.useMemo(() => {
		if (hideLabel || !payload?.length) {
			return null
		}

		const [item] = payload
		const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
		// Recharts payload types are often readonly / generic — cast locally to a
		// simple Record to satisfy our helper which reads arbitrary keys.
		const itemConfig = getPayloadConfigFromPayload(
			config,
			item as unknown as Record<string, unknown>,
			key
		)
		const value =
			!labelKey && typeof label === 'string'
				? config[label as keyof typeof config]?.label || label
				: itemConfig?.label

		if (labelFormatter) {
			return (
				<div className={cn('font-medium', labelClassName)}>
					{labelFormatter(
						value,
						// Convert readonly/generic payload to a concrete mutable array for caller
						(tooltipPayload as unknown as RechartsPayload<
							ValueType,
							string
						>[]) || []
					)}
				</div>
			)
		}

		if (!value) {
			return null
		}

		return <div className={cn('font-medium', labelClassName)}>{value}</div>
	}, [
		label,
		labelFormatter,
		payload,
		hideLabel,
		labelClassName,
		config,
		labelKey,
		tooltipPayload
	])

	if (!active || !payload?.length) {
		return null
	}

	const nestLabel = payload.length === 1 && indicator !== 'dot'

	return (
		<div
			className={cn(
				'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
				className
			)}
		>
			{!nestLabel ? tooltipLabel : null}
			<div className="grid gap-1.5">
				{payload
					.filter(item => item.type !== 'none')
					.map((item, index) => {
						const key = `${nameKey || item.name || item.dataKey || 'value'}`
						const itemConfig = getPayloadConfigFromPayload(
							config,
							item as unknown as Record<string, unknown>,
							key
						)
						const indicatorColor =
							color ||
							(item.payload &&
							typeof item.payload === 'object' &&
							'fill' in item.payload
								? item.payload.fill
								: undefined) ||
							item.color

						return (
							<div
								key={item.dataKey}
								className={cn(
									'[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
									indicator === 'dot' && 'items-center'
								)}
							>
								{formatter &&
								item?.value !== undefined &&
								item.name &&
								item.payload !== null &&
								item.value !== null &&
								item.value !== undefined &&
								typeof item.value !== 'object' ? (
									formatter(
										item.value as ValueType,
										item.name,
										// cast payload item to the Recharts payload expected by formatter
										item as unknown as RechartsPayload<ValueType, string>,
										index,
										// payload may be readonly in Recharts; cast to mutable array for formatter
										(payload as unknown as RechartsPayload<
											ValueType,
											string
										>[]) || []
									)
								) : (
									<>
										{itemConfig?.icon ? (
											<itemConfig.icon />
										) : (
											!hideIndicator && (
												<div
													className={cn(
														'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
														{
															'h-2.5 w-2.5': indicator === 'dot',
															'w-1': indicator === 'line',
															'w-0 border-2 border-dashed bg-transparent':
																indicator === 'dashed',
															'my-0.5': nestLabel && indicator === 'dashed'
														}
													)}
													style={
														{
															'--color-bg': indicatorColor,
															'--color-border': indicatorColor
														} as React.CSSProperties
													}
												/>
											)
										)}
										<div
											className={cn(
												'flex flex-1 justify-between leading-none',
												nestLabel ? 'items-end' : 'items-center'
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
													{typeof item.value === 'number'
														? item.value.toLocaleString()
														: String(item.value)}
												</span>
											)}
										</div>
									</>
								)}
							</div>
						)
					})}
			</div>
		</div>
	)
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
	className,
	hideIcon = false,
	payload,
	verticalAlign = 'bottom',
	nameKey,
	...props
}: React.ComponentProps<'div'> & {
	hideIcon?: boolean
	nameKey?: string
	payload?: Array<{
		name?: string
		value?: unknown
		color?: string
		dataKey?: string
		type?: 'none' | string
	}>
	verticalAlign?: 'top' | 'bottom'
}) {
	const { config } = useChart()

	if (!payload?.length) {
		return null
	}

	return (
		<div
			className={cn(
				'flex items-center justify-center gap-4',
				verticalAlign === 'top' ? 'pb-3' : 'pt-3',
				className
			)}
			{...props}
		>
			{(payload || [])
				.filter(item => item.type !== 'none')
				.map(item => {
					const key = `${nameKey || item.dataKey || 'value'}`
					const itemConfig = getPayloadConfigFromPayload(config, item, key)

					return (
						<div
							key={item.value?.toString()}
							className={cn(
								'[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3'
							)}
						>
							{itemConfig?.icon && !hideIcon ? (
								<itemConfig.icon />
							) : (
								<div
									className="size-2 shrink-0 rounded-[2px]"
									style={{
										backgroundColor: item.color
									}}
								/>
							)}
							{itemConfig?.label}
						</div>
					)
				})}
		</div>
	)
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
	config: ChartConfig,
	payload: Record<string, unknown> | undefined,
	key: string
) {
	if (!payload) {
		return undefined
	}

	const payloadPayload =
		'payload' in payload &&
		typeof payload.payload === 'object' &&
		payload.payload !== null
			? (payload.payload as Record<string, unknown>)
			: undefined

	let configLabelKey: string = key

	if (
		key in payload &&
		typeof payload[key as keyof typeof payload] === 'string'
	) {
		configLabelKey = payload[key as keyof typeof payload] as string
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
	) {
		configLabelKey = payloadPayload[
			key as keyof typeof payloadPayload
		] as string
	}

	return configLabelKey in config
		? config[configLabelKey]
		: config[key as keyof typeof config]
}

export {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent
}
