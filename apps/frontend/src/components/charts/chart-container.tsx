'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ChartContainerProps } from '@repo/shared/types/frontend'
import * as React from 'react'

export function ChartContainer({
  title,
  description,
  children,
  height = 300,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <Card className={cn('w-full', className)} {...props}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="w-full overflow-hidden rounded-lg"
          style={{ height: `${height}px` }}
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// TenantFlow color palette for charts - consistent across all libraries
export const TENANTFLOW_CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
  success: 'var(--color-system-green)', // Green for positive metrics
  warning: 'var(--color-system-orange)', // Orange for warnings
  destructive: 'hsl(var(--destructive))',
  info: 'var(--color-system-blue)', // Blue for informational
  revenue: 'var(--color-system-green)', // Green for revenue
  occupancy: 'var(--color-system-blue)', // Blue for occupancy
  maintenance: 'var(--color-system-orange)', // Orange for maintenance
  properties: 'hsl(var(--primary))', // Primary for properties
}

// Consistent chart configuration for all libraries
export const TENANTFLOW_CHART_CONFIG = {
  style: {
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
  },
  colors: Object.values(TENANTFLOW_CHART_COLORS),
  grid: {
    strokeDasharray: '3 3',
    stroke: 'hsl(var(--border))',
    strokeOpacity: 0.5,
  },
  tooltip: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 4px 6px -1px var(--color-fill-primary), 0 2px 4px -1px var(--color-fill-secondary)',
  },
  legend: {
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
    color: 'hsl(var(--foreground))',
  },
  axis: {
    fontSize: '11px',
    fontFamily: 'var(--font-sans)',
    color: 'hsl(var(--muted-foreground))',
  }
}

// Sample TenantFlow property management data for all chart examples
export const SAMPLE_PROPERTY_DATA = {
  revenue: [
    { month: 'Jan', current: 125000, previous: 118000, target: 130000 },
    { month: 'Feb', current: 132000, previous: 125000, target: 135000 },
    { month: 'Mar', current: 128000, previous: 120000, target: 132000 },
    { month: 'Apr', current: 145000, previous: 135000, target: 140000 },
    { month: 'May', current: 138000, previous: 130000, target: 142000 },
    { month: 'Jun', current: 152000, previous: 142000, target: 150000 },
  ],
  properties: [
    { name: 'Sunset Apartments', occupancy: 94, revenue: 52000, units: 24, maintenance: 3 },
    { name: 'Oak Grove Complex', occupancy: 100, revenue: 48000, units: 18, maintenance: 1 },
    { name: 'Pine Valley Homes', occupancy: 87, revenue: 33000, units: 12, maintenance: 2 },
    { name: 'Cedar Point Plaza', occupancy: 92, revenue: 41000, units: 16, maintenance: 4 },
    { name: 'Maple Ridge Towers', occupancy: 96, revenue: 38000, units: 14, maintenance: 1 },
  ],
  maintenance: [
    { category: 'Plumbing', count: 12, status: 'completed' },
    { category: 'Electrical', count: 8, status: 'completed' },
    { category: 'HVAC', count: 15, status: 'pending' },
    { category: 'Appliances', count: 6, status: 'pending' },
    { category: 'General', count: 9, status: 'overdue' },
  ],
  occupancy: [
    { month: 'Jan', rate: 92.5 },
    { month: 'Feb', rate: 94.1 },
    { month: 'Mar', rate: 89.8 },
    { month: 'Apr', rate: 95.2 },
    { month: 'May', rate: 91.7 },
    { month: 'Jun', rate: 96.4 },
  ],
  kpis: [
    { metric: 'Total Revenue', value: 152000, change: 12.5, format: 'currency' },
    { metric: 'Properties', value: 45, change: 2.1, format: 'number' },
    { metric: 'Occupancy Rate', value: 94.2, change: -1.5, format: 'percentage' },
    { metric: 'Avg. Rent', value: 2850, change: 5.7, format: 'currency' },
  ]
}