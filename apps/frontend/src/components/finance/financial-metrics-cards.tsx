"use client";

import { DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  formatCurrency, 
  ANIMATION_DURATIONS, 
  cn, 
  TYPOGRAPHY_SCALE,
  cardClasses,
  badgeClasses,
  animationClasses
} from "@/lib/utils";
import type { DashboardFinancialStats } from "@repo/shared";

interface FinancialMetricsCardsProps {
  data?: DashboardFinancialStats;
  isLoading?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  progress?: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  delay?: number;
}

const colorConfig = {
  blue: {
    bg: 'from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/20',
    border: 'border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700',
    shadow: 'hover:shadow-blue-100/50 dark:hover:shadow-blue-950/50',
    icon: 'bg-blue-200/50 border-blue-300/50 text-blue-700 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-300',
    value: 'text-blue-700 dark:text-blue-300',
    accent: 'text-blue-600/80 dark:text-blue-400/80',
    hover: 'bg-blue-400/5'
  },
  green: {
    bg: 'from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/20',
    border: 'border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700',
    shadow: 'hover:shadow-green-100/50 dark:hover:shadow-green-950/50',
    icon: 'bg-green-200/50 border-green-300/50 text-green-700 dark:text-green-400',
    text: 'text-green-800 dark:text-green-300',
    value: 'text-green-700 dark:text-green-300',
    accent: 'text-green-600/80 dark:text-green-400/80',
    hover: 'bg-green-400/5'
  },
  purple: {
    bg: 'from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/20',
    border: 'border-purple-200/60 dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700',
    shadow: 'hover:shadow-purple-100/50 dark:hover:shadow-purple-950/50',
    icon: 'bg-purple-200/50 border-purple-300/50 text-purple-700 dark:text-purple-400',
    text: 'text-purple-800 dark:text-purple-300',
    value: 'text-purple-700 dark:text-purple-300',
    accent: 'text-purple-600/80 dark:text-purple-400/80',
    hover: 'bg-purple-400/5'
  },
  orange: {
    bg: 'from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/20',
    border: 'border-orange-200/60 dark:border-orange-800/40 hover:border-orange-300 dark:hover:border-orange-700',
    shadow: 'hover:shadow-orange-100/50 dark:hover:shadow-orange-950/50',
    icon: 'bg-orange-200/50 border-orange-300/50 text-orange-700 dark:text-orange-400',
    text: 'text-orange-800 dark:text-orange-300',
    value: 'text-orange-700 dark:text-orange-300',
    accent: 'text-orange-600/80 dark:text-orange-400/80',
    hover: 'bg-orange-400/5'
  }
};

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  progress, 
  color, 
  delay = 0 
}: MetricCardProps) {
  const colors = colorConfig[color];
  
  return (
    <Card 
      className={cn(
        cardClasses('interactive'),
        `group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} ${colors.shadow} hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2`,
        animationClasses('fade-in'),
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        transform: 'translateY(20px)',
        animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out ${delay}ms both`,
        transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
      tabIndex={0}
      role="button"
      aria-label={`${title}: ${typeof value === 'number' ? formatCurrency(value) : value}${trend ? `, trending ${trend.isPositive ? 'up' : 'down'} by ${trend.value}%` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Add click behavior here if needed
        }
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                `flex size-12 items-center justify-center rounded-xl border shadow-sm group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110`,
                colors.icon
              )}
              style={{
                transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`,
              }}>
                <Icon className="size-6 transition-transform group-hover:scale-110" />
              </div>
              <div className="space-y-1">
                <p className={cn(
                  "text-sm font-semibold uppercase tracking-wide group-hover:tracking-wider",
                  colors.text
                )}
                style={{
                  transition: `letter-spacing ${ANIMATION_DURATIONS.fast} ease-out`,
                }}>
                  {title}
                </p>
                {trend && (
                  <div className="flex items-center gap-1">
                    {trend.isPositive ? (
                      <TrendingUp className="size-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="size-3 text-red-600" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      trend.isPositive ? "text-emerald-600" : "text-red-600"
                    )}>
                      {trend.isPositive ? "+" : ""}{trend.value}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {trend.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className={cn(
                "font-bold tabular-nums text-3xl",
                colors.value
              )}>
                {typeof value === 'number' ? formatCurrency(value) : value}
              </p>
              
              {subtitle && (
                <p className={cn("text-sm", colors.accent)}>
                  {subtitle}
                </p>
              )}
              
              {progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Progress</span>
                    <span className={cn("font-semibold tabular-nums", colors.accent)}>
                      {progress}%
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={cn(
                      "h-2 bg-muted/30",
                      "[&>div]:transition-all [&>div]:duration-1000 [&>div]:ease-out",
                      colors.bg.includes('green') ? '[&>div]:bg-emerald-500' :
                      colors.bg.includes('blue') ? '[&>div]:bg-blue-500' :
                      colors.bg.includes('purple') ? '[&>div]:bg-purple-500' : '[&>div]:bg-orange-500'
                    )}
                    style={{
                      transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
                      animationDelay: `${delay + 200}ms`
                    }}
                    aria-label={`${title} progress: ${progress}%`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={cn(
          `absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity`,
          colors.hover
        )} />
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <Card 
      className={cn(
        cardClasses('elevated'),
        "overflow-hidden rounded-2xl border-2",
        animationClasses('pulse')
      )}
      style={{ 
        animationDelay: `${delay}ms`,
        animation: `fadeIn ${ANIMATION_DURATIONS.default} ease-out ${delay}ms both`,
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-gradient-to-br from-muted to-muted/60 rounded-xl animate-pulse shadow-sm" />
          <div className="space-y-3 flex-1">
            <div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded-full w-24 animate-pulse" />
            <div className="h-8 bg-gradient-to-r from-muted to-muted/60 rounded-lg w-32 animate-pulse" />
            <div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded-full w-20 animate-pulse" />
            <div className="space-y-1">
              <div className="h-2 bg-gradient-to-r from-muted to-muted/60 rounded-full w-16 animate-pulse" />
              <div className="h-2 bg-gradient-to-r from-muted/50 to-muted/30 rounded-full w-full animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialMetricsCards({ 
  data, 
  isLoading = false, 
  className 
}: FinancialMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6", className)}>
        {[0, 100, 200, 300].map((delay, _index) => (
          <MetricCardSkeleton key={_index} delay={delay} />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const metrics: MetricCardProps[] = [
    {
      title: "Total Revenue",
      value: data.totalRevenue,
      subtitle: `${data.activeLeases} active leases`,
      icon: DollarSign,
      color: 'green',
      delay: 0,
      trend: {
        value: 12.5,
        label: "vs last month",
        isPositive: true
      }
    },
    {
      title: "Monthly Recurring",
      value: data.monthlyRecurring,
      subtitle: "Predictable income",
      icon: BarChart3,
      color: 'blue',
      delay: 100,
      trend: {
        value: 8.2,
        label: "vs last month",
        isPositive: true
      }
    },
    {
      title: "Occupancy Rate",
      value: `${data.occupancyRate}%`,
      subtitle: `${data.totalUnits} total units`,
      icon: PieChart,
      color: 'purple',
      delay: 200,
      progress: data.occupancyRate,
      trend: {
        value: 2.1,
        label: "vs last month",
        isPositive: true
      }
    },
    {
      title: "Performance",
      value: "94%",
      subtitle: "Target: 95%",
      icon: Target,
      color: 'orange',
      delay: 300,
      progress: 94,
      trend: {
        value: 1.3,
        label: "vs target",
        isPositive: false
      }
    }
  ];

  return (
    <section 
      className={cn("space-y-4", className)}
      aria-label="Financial metrics overview"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
              lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight,
              fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight
            }}
          >
            Key Performance Metrics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your most important financial indicators
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            badgeClasses('outline', 'sm'),
            "animate-pulse bg-primary/5 border-primary/20 text-primary"
          )}
          style={{
            animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
          }}
        >
          <div className="size-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
          Live Data
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map((metric, _index) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </section>
  );
}