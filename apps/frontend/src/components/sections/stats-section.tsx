"use client"

import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  Wrench,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down'
  icon: React.ReactNode
  accentColor: string
  subtitle?: string
}

function StatCard({ title, value, change, trend, icon, accentColor, subtitle }: StatCardProps) {
  const isPositive = trend === 'up'

  return (
    <div className="relative flex flex-col bg-background border border-border rounded-xl p-5 md:p-6 hover:shadow-lg transition-all duration-200">
      {/* Icon with soft background */}
      <div className={cn(
        "inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4",
        accentColor
      )}>
        {icon}
      </div>

      {/* Metric title */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>

        {/* Change badge */}
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
          isPositive
            ? "bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent/80"
            : "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive/80"
        )}>
          {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      </div>

      {/* Main value */}
      <div className="mt-1">
        <h3 className="text-3xl font-bold text-foreground">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

interface StatsSectionProps {
  className?: string
}

export function StatsSection({ className }: StatsSectionProps) {
  const stats = [
    {
      title: "Total Properties",
      value: "156",
      change: 12.5,
      trend: 'up' as const,
      icon: <Building2 className="w-6 h-6 text-primary" />,
      accentColor: "bg-primary/10 dark:bg-primary/20",
      subtitle: "+8 this month"
    },
    {
      title: "Active Tenants",
      value: "1,284",
      change: 8.2,
      trend: 'up' as const,
      icon: <Users className="w-6 h-6 text-accent" />,
      accentColor: "bg-accent/10 dark:bg-accent/20",
      subtitle: "98% occupancy rate"
    },
    {
      title: "Maintenance Requests",
      value: "24",
      change: 15.3,
      trend: 'down' as const,
      icon: <Wrench className="w-6 h-6 text-muted-foreground" />,
      accentColor: "bg-muted/20 dark:bg-muted/30",
      subtitle: "6 pending review"
    },
    {
      title: "Monthly Revenue",
      value: "$284.5K",
      change: 22.4,
      trend: 'up' as const,
      icon: <TrendingUp className="w-6 h-6 text-primary" />,
      accentColor: "bg-primary/10 dark:bg-primary/20",
      subtitle: "Target: $300K"
    }
  ]

  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Real-Time Property Metrics
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Track your portfolio performance with live data and insights
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              {...stat}
            />
          ))}
        </div>

        {/* Bottom insight bar */}
        <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Live data • Updated 2 minutes ago
              </span>
            </div>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              View Detailed Analytics →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatsSection