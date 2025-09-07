import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface MetricsCardProps extends React.ComponentProps<'div'> {
  title: string
  value: string | number
  description?: string
  status?: string
  statusIcon?: LucideIcon
  icon: LucideIcon
  colorVariant: 'success' | 'primary' | 'revenue' | 'property' | 'warning' | 'info'
  trend?: 'up' | 'down' | 'stable'
}

const colorMap = {
  success: 'chart-1',
  primary: 'chart-2', 
  revenue: 'chart-3',
  property: 'chart-4',
  warning: 'chart-10',
  info: 'chart-1'
} as const

export const MetricsCard = React.forwardRef<HTMLDivElement, MetricsCardProps>(
  ({ 
    title, 
    value, 
    description, 
    status, 
    statusIcon: StatusIcon, 
    icon: Icon, 
    colorVariant,
    className, 
    ...props 
  }, ref) => {
    const chartColor = colorMap[colorVariant]
    
    return (
      <Card 
        ref={ref}
        className={cn(
          "@container/card border-l-4 transform-gpu will-change-transform touch-manipulation transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]",
          className
        )}
        style={{ borderLeftColor: `var(--${chartColor})` }}
        {...props}
      >
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl" style={{ color: `var(--${chartColor})` }}>
            {value}
          </CardTitle>
        </CardHeader>
        {(status || description) && (
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            {status && StatusIcon && (
              <div className="line-clamp-1 flex gap-2 font-medium" style={{ color: `var(--${chartColor})` }}>
                {status} <StatusIcon className="size-4" />
              </div>
            )}
            {description && (
              <div className="text-muted-foreground">
                {description}
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    )
  }
)
MetricsCard.displayName = 'MetricsCard'