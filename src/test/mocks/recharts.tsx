/**
 * Recharts mock for Vitest tests
 * Provides mock implementations of recharts components that render as simple divs
 *
 * A test that needs what recharts would draw from a function or element prop
 * (an axis tick formatter, the tooltip or legend `content`) sets a probe with
 * `setRechartsProbe`: YAxis then prints each probe tick through its
 * `tickFormatter`, Tooltip renders its `content` with the probe's tooltip
 * state, and Legend its `content` with the probe's payload, inside the chart's
 * own ChartContainer context. `resetRechartsProbe` clears it.
 */
import { cloneElement, isValidElement, type ReactNode } from "react";

interface RechartsProbe {
	yTicks?: number[];
	tooltip?: {
		active: boolean;
		label?: string;
		payload: Array<Record<string, unknown>>;
	};
	legend?: Array<Record<string, unknown>>;
}

let probe: RechartsProbe = {};

export function setRechartsProbe(next: RechartsProbe) {
	probe = next;
}

export function resetRechartsProbe() {
	probe = {};
}

interface ContainerProps {
	children?: ReactNode;
}

interface ChartProps extends ContainerProps {
	data?: unknown[];
	width?: number;
	height?: number;
}

interface AxisProps {
	dataKey?: string;
	tickFormatter?: (value: number, index: number) => string;
}

interface TooltipProps {
	content?: unknown;
}

interface BarProps {
	dataKey?: string;
	fill?: string;
	name?: string;
}

interface PieProps {
	data?: unknown[];
	dataKey?: string;
	nameKey?: string;
	cx?: string | number;
	cy?: string | number;
	innerRadius?: number;
	outerRadius?: number;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	label?: boolean | unknown;
	labelLine?: boolean;
	isAnimationActive?: boolean;
	children?: ReactNode;
}

interface LegendProps {
	verticalAlign?: string;
	content?: unknown;
}

export const ResponsiveContainer = ({ children }: ContainerProps) => (
	<div data-testid="responsive-container">{children}</div>
);

export const BarChart = ({ children, data }: ChartProps) => (
	<svg data-testid="bar-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
);

export const Bar = ({ dataKey, fill, name }: BarProps) => (
	<g data-testid="bar" data-key={dataKey} data-fill={fill} data-name={name} />
);

export const XAxis = ({ dataKey }: AxisProps) => (
	<g data-testid="x-axis" data-key={dataKey} />
);

export const YAxis = ({ dataKey, tickFormatter }: AxisProps) => (
	<g data-testid="y-axis" data-key={dataKey}>
		{probe.yTicks?.map((tick, index) => (
			<text key={tick} data-testid="y-tick">
				{tickFormatter ? tickFormatter(tick, index) : String(tick)}
			</text>
		))}
	</g>
);

export const Tooltip = ({ content }: TooltipProps) => (
	<div data-testid="tooltip" data-has-content={!!content}>
		{probe.tooltip && isValidElement<Record<string, unknown>>(content)
			? cloneElement(content, probe.tooltip)
			: null}
	</div>
);

export const Legend = ({ verticalAlign, content }: LegendProps) => (
	<g data-testid="legend" data-align={verticalAlign}>
		{probe.legend && isValidElement<Record<string, unknown>>(content)
			? cloneElement(content, { payload: probe.legend })
			: null}
	</g>
);

export const PieChart = ({ children }: ChartProps) => (
	<svg data-testid="pie-chart">{children}</svg>
);

export const Pie = ({
	data,
	dataKey,
	nameKey,
	cx,
	cy,
	innerRadius,
	outerRadius,
	fill,
	stroke,
	strokeWidth,
	label,
	labelLine,
	isAnimationActive,
	children,
}: PieProps) => (
	<g
		data-testid="pie"
		data-data={JSON.stringify(data)}
		data-key={dataKey}
		data-name-key={nameKey}
		data-cx={cx}
		data-cy={cy}
		data-inner-radius={innerRadius}
		data-outer-radius={outerRadius}
		data-fill={fill}
		data-stroke={stroke}
		data-stroke-width={strokeWidth}
		data-has-label={!!label}
		data-label-line={labelLine}
		data-is-animation-active={
			typeof isAnimationActive === "boolean"
				? String(isAnimationActive)
				: undefined
		}
	>
		{children}
	</g>
);

interface LabelProps {
	position?: string;
	content?:
		| ((args: { viewBox?: { cx: number; cy: number } }) => ReactNode)
		| ReactNode;
}

export const Label = ({ position, content }: LabelProps) => {
	if (typeof content === "function") {
		return (
			<g data-testid="pie-label" data-position={position}>
				{content({ viewBox: { cx: 0, cy: 0 } })}
			</g>
		);
	}
	return (
		<g data-testid="pie-label" data-position={position}>
			{content}
		</g>
	);
};

export const LineChart = ({ children, data }: ChartProps) => (
	<svg data-testid="line-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
);

export const Line = ({
	dataKey,
	stroke,
	name,
	strokeDasharray,
}: {
	dataKey?: string;
	stroke?: string;
	name?: string;
	strokeDasharray?: string;
}) => (
	<g
		data-testid="line"
		data-key={dataKey}
		data-stroke={stroke}
		data-name={name}
		data-stroke-dasharray={strokeDasharray}
	/>
);

export const AreaChart = ({ children, data }: ChartProps) => (
	<svg data-testid="area-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
);

export const Area = ({
	dataKey,
	fill,
	stroke,
	name,
	strokeWidth,
	isAnimationActive,
	dot,
	activeDot,
	strokeDasharray,
}: {
	dataKey?: string;
	fill?: string;
	stroke?: string;
	name?: string;
	strokeWidth?: number;
	isAnimationActive?: boolean;
	dot?: boolean | object;
	activeDot?: boolean | object;
	strokeDasharray?: string;
}) => (
	<g
		data-testid="area"
		data-key={dataKey}
		data-fill={fill}
		data-stroke={stroke}
		data-name={name}
		data-stroke-dasharray={strokeDasharray}
		data-stroke-width={
			typeof strokeWidth === "number" ? String(strokeWidth) : undefined
		}
		data-is-animation-active={
			typeof isAnimationActive === "boolean"
				? String(isAnimationActive)
				: undefined
		}
		data-dot={typeof dot === "boolean" ? String(dot) : undefined}
		data-active-dot={
			typeof activeDot === "boolean" ? String(activeDot) : undefined
		}
	/>
);

export const CartesianGrid = ({
	strokeDasharray,
}: {
	strokeDasharray?: string;
}) => (
	<g data-testid="cartesian-grid" data-stroke-dasharray={strokeDasharray} />
);

export const ComposedChart = ({ children, data }: ChartProps) => (
	<svg data-testid="composed-chart" data-data={JSON.stringify(data)}>
		{children}
	</svg>
);

export const ReferenceLine = ({
	y,
	stroke,
	strokeDasharray,
}: {
	y?: number;
	stroke?: string;
	strokeDasharray?: string;
}) => (
	<g
		data-testid="reference-line"
		data-y={y}
		data-stroke={stroke}
		data-stroke-dasharray={strokeDasharray}
	/>
);

export const LabelList = ({
	dataKey,
	position,
}: {
	dataKey?: string;
	position?: string;
}) => (
	<g data-testid="label-list" data-key={dataKey} data-position={position} />
);
