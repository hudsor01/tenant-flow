'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TimeSeriesDataPoint } from '@repo/shared/types/dashboard-repository'
import { cn } from '#lib/utils'

interface MiniTrendChartProps {
  title: string
  data: TimeSeriesDataPoint[] | undefined
  isLoading?: boolean
  valueFormatter?: (value: number) => string
  className?: string
  color?: string
}

export function MiniTrendChart({
  title,
  data,
  isLoading,
  valueFormatter = (v) => v.toString(),
  className,
  color = 'var(--primary)',
}: MiniTrendChartProps) {
  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No trend data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              hide
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-md">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {new Date(payload[0].payload.date).toLocaleDateString()}
                      </span>
                      <span className="font-bold">
                        {valueFormatter(payload[0].value as number)}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
