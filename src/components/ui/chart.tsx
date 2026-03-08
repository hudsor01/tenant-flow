'use client'

import { createContext, useContext, useId } from 'react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '#lib/utils'

// Re-export tooltip/legend from chart-tooltip for backward compatibility
export {
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent
} from '#components/ui/chart-tooltip'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
	[k in string]: {
		label?: ReactNode
		icon?: ComponentType
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	)
}

type ChartContextProps = {
	config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | null>(null)

export function useChart() {
	const context = useContext(ChartContext)

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
}: ComponentProps<'div'> & {
	config: ChartConfig
	children: ComponentProps<
		typeof RechartsPrimitive.ResponsiveContainer
	>['children']
}) {
	const uniqueId = useId()
	const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				data-chart={chartId}
				className={cn(
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='var(--color-border)']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='var(--color-border)']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='var(--color-border)']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='var(--color-background)']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='var(--color-background)']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
					className
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer minWidth={1} minHeight={1}>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	)
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
	// Guard against undefined config during SSR/static generation
	if (!config || typeof config !== 'object') {
		return null
	}

	const colorConfig = Object.entries(config).filter(
		([, config]) => config?.theme || config?.color
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

// Helper to extract item config from a payload.
export function getPayloadConfigFromPayload(
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
	ChartStyle
}
