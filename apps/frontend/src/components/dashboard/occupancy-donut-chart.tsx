'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { BlurFade, NumberTicker } from '@/components/magicui'
import { getStaggerDelay, CHART_STYLES, CARD_STYLES, CHART_LOADING_SKELETON, CHART_ERROR_MESSAGES } from '@/lib/animations/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import type { ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  occupied: {
    label: 'Occupied',
    color: CHART_STYLES.COLORS.PRIMARY,
  },
  vacant: {
    label: 'Vacant',
    color: CHART_STYLES.COLORS.MUTED,
  },
} satisfies ChartConfig

export function OccupancyDonutChart() {
  const { data: stats, isLoading, error } = useDashboardOverview()

  // Handle error state using existing Alert pattern
  if (error) {
    return (
      <BlurFade delay={getStaggerDelay(3, 'MEDIUM_STAGGER')}>
        <Card className="col-span-1">
          <CardHeader className={CARD_STYLES.HEADER_COMPACT}>
            <CardTitle className="text-lg font-semibold">Occupancy Rate</CardTitle>
            <CardDescription>Current property occupancy</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="border-red-200 bg-red-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
{CHART_ERROR_MESSAGES.LOAD_FAILED}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  // Handle loading state using existing skeleton pattern
  if (isLoading) {
    return (
      <BlurFade delay={getStaggerDelay(3, 'MEDIUM_STAGGER')}>
        <Card className="col-span-1">
          <CardHeader className={CARD_STYLES.HEADER_COMPACT}>
            <CardTitle className="text-lg font-semibold">Occupancy Rate</CardTitle>
            <CardDescription>Current property occupancy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`${CHART_STYLES.HEIGHT} w-full ${CHART_LOADING_SKELETON}`} />
          </CardContent>
        </Card>
      </BlurFade>
    )
  }

  // Generate chart data from real API data
  const occupancyRate = stats?.units?.occupancyRate ?? 0
  const occupancyData = [
    { name: 'Occupied', value: occupancyRate, color: CHART_STYLES.COLORS.PRIMARY },
    { name: 'Vacant', value: 100 - occupancyRate, color: CHART_STYLES.COLORS.MUTED },
  ]

  return (
    <BlurFade delay={getStaggerDelay(3, 'MEDIUM_STAGGER')}>
      <Card className="col-span-1">
        <CardHeader className={CARD_STYLES.HEADER_COMPACT}>
          <CardTitle className="text-lg font-semibold">Occupancy Rate</CardTitle>
          <CardDescription>Current property occupancy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ChartContainer 
              config={chartConfig} 
              className={`${CHART_STYLES.HEIGHT} w-full`}
              role="img"
              aria-label={`Occupancy rate chart showing ${occupancyRate}% occupancy. ${occupancyData[0]?.value || 0}% occupied units and ${occupancyData[1]?.value || 0}% vacant units.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {occupancyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            {/* Simplified center content */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  <NumberTicker value={occupancyRate} />%
                </div>
                <div className="text-sm text-muted-foreground">Occupied</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </BlurFade>
  )
}