'use client'

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

interface ChartAreaProps {
	data: Array<{
		date: string
		revenue: number
		expenses: number
	}>
	title?: string
	description?: string
}

interface TooltipProps {
	active?: boolean
	payload?: Array<{
		name: string
		value: number
		color: string
	}>
	label?: string
}

export function ChartArea({ data, title, description }: ChartAreaProps) {
	// Custom tooltip content using CSS variables
	const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
		if (active && payload && payload.length) {
			return (
				<div
					style={{
						background: 'var(--color-card)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius)',
						padding: 'var(--spacing-3)'
					}}
				>
					<p
						style={{
							fontSize: 'var(--font-caption-1)',
							color: 'var(--color-label-secondary)',
							marginBottom: 'var(--spacing-2)'
						}}
					>
						{label}
					</p>
					{payload.map((entry, index: number) => (
						<p
							key={index}
							style={{
								fontSize: 'var(--font-body)',
								color:
									entry.name === 'revenue'
										? 'var(--color-system-green)'
										: 'var(--color-system-orange)',
								margin: 0
							}}
						>
							{entry.name}: ${entry.value.toLocaleString()}
						</p>
					))}
				</div>
			)
		}
		return null
	}

	return (
		<div className="dashboard-widget">
			{title && (
				<div style={{ marginBottom: 'var(--spacing-4)' }}>
					<h3
						className="widget-title"
						style={{
							fontSize: 'var(--font-title-2)',
							lineHeight: 'var(--line-height-title-2)',
							color: 'var(--color-label-primary)',
							fontWeight: 600
						}}
					>
						{title}
					</h3>
					{description && (
						<p
							className="widget-subtitle"
							style={{
								fontSize: 'var(--font-caption-1)',
								lineHeight: 'var(--line-height-caption)',
								color: 'var(--color-label-secondary)',
								marginTop: 'var(--spacing-1)'
							}}
						>
							{description}
						</p>
					)}
				</div>
			)}
			<div className="chart-container-landscape">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={data}
						margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-system-green)"
									stopOpacity={0.3}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-system-green)"
									stopOpacity={0.05}
								/>
							</linearGradient>
							<linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-system-orange)"
									stopOpacity={0.3}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-system-orange)"
									stopOpacity={0.05}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="var(--color-separator)"
							opacity={0.3}
						/>
						<XAxis
							dataKey="date"
							stroke="var(--color-label-tertiary)"
							fontSize="var(--font-caption-1)"
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							stroke="var(--color-label-tertiary)"
							fontSize="var(--font-caption-1)"
							tickLine={false}
							axisLine={false}
							tickFormatter={value => `$${value / 1000}k`}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Area
							type="monotone"
							dataKey="revenue"
							stroke="var(--color-system-green)"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#colorRevenue)"
						/>
						<Area
							type="monotone"
							dataKey="expenses"
							stroke="var(--color-system-orange)"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#colorExpenses)"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
