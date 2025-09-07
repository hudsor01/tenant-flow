import * as React from "react"
import { TrendingUp, Minus } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import type { DashboardStats } from "@repo/shared"

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps extends React.ComponentProps<'div'> {
  data?: DashboardStats
}

export const SectionCards = React.forwardRef<HTMLDivElement, SectionCardsProps>(
  ({ data, className, ...props }, ref) => {
  // Fallback values for loading state - NO CALCULATIONS, pure presentation
  const revenue = data?.revenue?.monthly ?? 0
  const occupancyRate = data?.properties?.occupancyRate ?? 0
  const growth = data?.revenue?.growth ?? 0

  return (
    <div 
      ref={ref} 
      className={cn(
        "*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 touch-manipulation",
        className
      )}
      {...props}
    >
      {/* Monthly Revenue - Green (Profitable) */}
      <Card className="@container/card border-l-4 border-l-success transform-gpu will-change-transform touch-manipulation transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]">
        <CardHeader>
          <CardDescription>Monthly Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-success">
            {formatCurrency(revenue)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-success">
            Strong revenue growth <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Rent collections up from last month
          </div>
        </CardFooter>
      </Card>

      {/* Occupancy Rate - Info (Performance Metric) */}
      <Card className="@container/card border-l-4 border-l-info transform-gpu will-change-transform touch-manipulation transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]">
        <CardHeader>
          <CardDescription>Occupancy Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-info">
            {occupancyRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-info">
            Stable occupancy rate <Minus className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Minor decrease from last month
          </div>
        </CardFooter>
      </Card>

      {/* Revenue Growth - Info (Performance Metric) */}
      <Card className="@container/card border-l-4 border-l-info transform-gpu will-change-transform touch-manipulation transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]">
        <CardHeader>
          <CardDescription>Revenue Growth</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-info">
            {growth.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-info">
            Month over month growth <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Revenue growth compared to last month
          </div>
        </CardFooter>
      </Card>
    </div>
  )
})
SectionCards.displayName = 'SectionCards'
