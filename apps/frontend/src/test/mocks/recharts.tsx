/**
 * Recharts mock for Vitest tests
 * Provides mock implementations of recharts components that render as simple divs
 */
import type { ReactNode } from 'react'

interface ContainerProps {
	children?: ReactNode
}

interface ChartProps extends ContainerProps {
	data?: unknown[]
	width?: number
	height?: number
}

interface AxisProps {
	dataKey?: string
}

interface TooltipProps {
	content?: unknown
}

interface BarProps {
	dataKey?: string
	fill?: string
	name?: string
}

interface PieProps {
	data?: unknown[]
	dataKey?: string
	nameKey?: string
	cx?: string | number
	cy?: string | number
	innerRadius?: number
	outerRadius?: number
	fill?: string
	label?: boolean | unknown
	labelLine?: boolean
	children?: ReactNode
}

interface CellProps {
	fill?: string
	key?: string | number
}

interface LegendProps {
	verticalAlign?: string
}

export const ResponsiveContainer = ({ children }: ContainerProps) => (
	<div data-testid="responsive-container">{children}</div>
)

export const BarChart = ({ children, data }: ChartProps) => (
	<svg data-testid="bar-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
)

export const Bar = ({ dataKey, fill, name }: BarProps) => (
	<g data-testid="bar" data-key={dataKey} data-fill={fill} data-name={name} />
)

export const XAxis = ({ dataKey }: AxisProps) => (
	<g data-testid="x-axis" data-key={dataKey} />
)

export const YAxis = ({ dataKey }: AxisProps) => (
	<g data-testid="y-axis" data-key={dataKey} />
)

export const Tooltip = ({ content }: TooltipProps) => (
	<div data-testid="tooltip" data-has-content={!!content} />
)

export const Legend = ({ verticalAlign }: LegendProps) => (
	<g data-testid="legend" data-align={verticalAlign} />
)

export const PieChart = ({ children }: ChartProps) => (
	<svg data-testid="pie-chart">{children}</svg>
)

export const Pie = ({
	_data,
	dataKey,
	nameKey,
	cx,
	cy,
	innerRadius,
	outerRadius,
	fill,
	label,
	labelLine,
	children
}: PieProps) => (
	<g
		data-testid="pie"
		data-key={dataKey}
		data-name-key={nameKey}
		data-cx={cx}
		data-cy={cy}
		data-inner-radius={innerRadius}
		data-outer-radius={outerRadius}
		data-fill={fill}
		data-has-label={!!label}
		data-label-line={labelLine}
	>
		{children}
	</g>
)

export const Cell = ({ fill }: CellProps) => (
	<g data-testid="cell" data-fill={fill} />
)

export const LineChart = ({ children, data }: ChartProps) => (
	<svg data-testid="line-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
)

export const Line = ({
	dataKey,
	stroke,
	name
}: {
	dataKey?: string
	stroke?: string
	name?: string
}) => (
	<g
		data-testid="line"
		data-key={dataKey}
		data-stroke={stroke}
		data-name={name}
	/>
)

export const AreaChart = ({ children, data }: ChartProps) => (
	<svg data-testid="area-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
)

export const Area = ({
	dataKey,
	fill,
	stroke,
	name
}: {
	dataKey?: string
	fill?: string
	stroke?: string
	name?: string
}) => (
	<g
		data-testid="area"
		data-key={dataKey}
		data-fill={fill}
		data-stroke={stroke}
		data-name={name}
	/>
)

export const CartesianGrid = ({ strokeDasharray }: { strokeDasharray?: string }) => (
	<g data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray} />
)

export const ComposedChart = ({ children, data }: ChartProps) => (
	<svg data-testid="composed-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
)

export const ReferenceLine = ({
	y,
	stroke,
	strokeDasharray
}: {
	y?: number
	stroke?: string
	strokeDasharray?: string
}) => (
	<g
		data-testid="reference-line"
		data-y={y}
		data-stroke={stroke}
		data-stroke-dasharray={strokeDasharray}
	/>
)

export const LabelList = ({
	dataKey,
	position
}: {
	dataKey?: string
	position?: string
}) => <g data-testid="label-list" data-key={dataKey} data-position={position} />
