'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

type ChartConfig = {
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
				data-tokens="applied"
				className={cn(
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='hsl(var(--border))']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='hsl(var(--border))']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='hsl(var(--border))']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='hsl(var(--background))']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='hsl(var(--background))']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
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
	payload,
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
		label?: string
		labelFormatter?: (label: string) => string
		labelClassName?: string
		formatter?: (
			value: unknown,
			name: string,
			item?: unknown,
			index?: number,
			payload?: unknown
		) => [string, string]
		color?: string
		payload?: Record<string, unknown>[]
	}) {
	const { config } = useChart()

	const tooltipLabel = React.useMemo(() => {
		if (hideLabel || !payload?.length) {
			return null
		}

		const [item] = payload
		const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
		const itemConfig = getPayloadConfigFromPayload(config, item, key)
		const value =
			!labelKey && typeof label === 'string'
				? config[label as keyof typeof config]?.label || label
				: itemConfig?.label

		if (labelFormatter) {
			return (
				<div
					data-tokens="applied"
					className={cn('font-medium', labelClassName)}
				>
					{labelFormatter(value, payload)}
				</div>
			)
		}

		if (!value) {
			return null
		}

		return (
			<div data-tokens="applied" className={cn('font-medium', labelClassName)}>
				{value}
			</div>
		)
	}, [
		label,
		labelFormatter,
		payload,
		hideLabel,
		labelClassName,
		config,
		labelKey
	])

	if (!active || !payload?.length) {
		return null
	}

	const nestLabel = payload.length === 1 && indicator !== 'dot'

	return (
		<div
			data-tokens="applied"
			className={cn(
				'border-[var(--color-separator)]/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-[var(--radius-large)] border px-2.5 py-1.5 text-xs shadow-[var(--shadow-premium-lg)]',
				className
			)}
		>
			{!nestLabel ? tooltipLabel : null}
			<div className="grid gap-1.5">
				{payload.map((item, index) => {
					const key = `${nameKey || item.name || item.dataKey || 'value'}`
					const itemConfig = getPayloadConfigFromPayload(config, item, key)
					const indicatorColor =
						color ||
						(item.payload as Record<string, unknown>)?.fill ||
						item.color

					return (
						<div
							key={String(item.dataKey || index)}
							data-tokens="applied"
							className={cn(
								'[&>svg]:text-[var(--color-label-tertiary)] flex w-full flex-wrap items-stretch gap-[var(--spacing-2)] [&>svg]:h-2.5 [&>svg]:w-2.5',
								indicator === 'dot' && 'items-center'
							)}
						>
							{formatter && item?.value !== undefined && item.name ? (
								formatter(
									item.value,
									String(item.name),
									item,
									index,
									item.payload
								)
							) : (
								<>
									{itemConfig?.icon ? (
										<itemConfig.icon />
									) : (
										!hideIndicator && (
											<div
												data-tokens="applied"
												className={cn(
													'shrink-0 rounded-[calc(var(--radius-small)/4)] border-(--color-border) bg-(--color-bg)',
													{
														'h-2.5 w-2.5': indicator === 'dot',
														'w-1': indicator === 'line',
														'w-0 border-[1.5px] border-dashed bg-transparent':
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
										data-tokens="applied"
										className={cn(
											'flex flex-1 justify-between leading-none',
											nestLabel ? 'items-end' : 'items-center'
										)}
									>
										<div className="grid gap-1.5">
											{nestLabel ? tooltipLabel : null}
											<span className="text-[var(--color-label-tertiary)]">
												{itemConfig?.label || String(item.name || '')}
											</span>
										</div>
										{item.value !== undefined && item.value !== null && (
											<span className="text-foreground font-mono font-medium tabular-nums">
												{(item.value as number).toLocaleString()}
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
	nameKey
}: React.ComponentProps<'div'> & {
	hideIcon?: boolean
	nameKey?: string
	payload?: Array<{
		value?: string
		color?: string
		dataKey?: string
		[key: string]: unknown
	}>
	verticalAlign?: 'top' | 'middle' | 'bottom'
}) {
	const { config } = useChart()

	if (!payload?.length) {
		return null
	}

	return (
		<div
			data-tokens="applied"
			className={cn(
				'flex items-center justify-center gap-[var(--spacing-4)]',
				verticalAlign === 'top' ? 'pb-3' : 'pt-3',
				className
			)}
		>
			{payload.map(item => {
				const key = `${nameKey || item.dataKey || 'value'}`
				const itemConfig = getPayloadConfigFromPayload(config, item, key)

				return (
					<div
						key={item.value}
						data-tokens="applied"
						className={cn(
							'[&>svg]:text-[var(--color-label-tertiary)] flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3'
						)}
					>
						{itemConfig?.icon && !hideIcon ? (
							<itemConfig.icon />
						) : (
							<div
								className="h-2 w-2 shrink-0 rounded-[calc(var(--radius-small)/4)]"
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
	payload: unknown,
	key: string
) {
	if (typeof payload !== 'object' || payload === null) {
		return undefined
	}

	const payloadPayload =
		'payload' in payload &&
		typeof payload.payload === 'object' &&
		payload.payload !== null
			? payload.payload
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
	ChartTooltipContent,
	type ChartConfig
}
