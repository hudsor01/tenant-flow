'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TimeSeriesDataPoint } from '@repo/shared/types/dashboard-repository'
import { cn } from '#lib/utils'
import { BarChart3 } from 'lucide-react'

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
  color = 'var(--color-primary)',
}: MiniTrendChartProps) {
  if (isLoading) {
    return (
      <Card
        className={cn(
          'dashboard-card-surface dashboard-mini-chart',
          className
        )}
      >
        <CardHeader>
          <CardTitle className="typography-small">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] flex items-end gap-1 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card
        className={cn('dashboard-card-surface dashboard-mini-chart', className)}
      >
        <CardHeader>
          <CardTitle className="typography-small">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[80px] flex-center border border-dashed border-border rounded-lg bg-muted/30">
            <div className="text-center">
              <BarChart3 className="size-5 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">No data yet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn('dashboard-card-surface dashboard-mini-chart', className)}
    >
      <CardHeader>
        <CardTitle className="typography-small">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={data}>
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
                      <span className="text-caption">
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
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.08}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
