"use client";

import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig} from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  formatCurrency, 
  ANIMATION_DURATIONS, 
  cn, 
  TYPOGRAPHY_SCALE,
  cardClasses,
  badgeClasses,
  animationClasses,
  buttonClasses
} from "@/lib/utils";
import { useState, useMemo } from "react";

interface RevenueDataPoint {
  month: string;
  revenue: number;
  recurring: number;
  oneTime: number;
  projected?: number;
}

interface RevenueTrendChartProps {
  data?: RevenueDataPoint[];
  isLoading?: boolean;
  className?: string;
}

const chartConfig = {
  revenue: {
    label: "Total Revenue",
    color: "hsl(var(--primary))",
  },
  recurring: {
    label: "Recurring Revenue", 
    color: "hsl(142 76% 36%)",
  },
  oneTime: {
    label: "One-time Revenue",
    color: "hsl(221 83% 53%)",
  },
  projected: {
    label: "Projected Revenue",
    color: "hsl(var(--muted-foreground))",
  },
} as ChartConfig;

// Mock data for demonstration
const mockData: RevenueDataPoint[] = [
  { month: "Jan", revenue: 45000, recurring: 38000, oneTime: 7000 },
  { month: "Feb", revenue: 52000, recurring: 42000, oneTime: 10000 },
  { month: "Mar", revenue: 48000, recurring: 41000, oneTime: 7000 },
  { month: "Apr", revenue: 61000, recurring: 48000, oneTime: 13000 },
  { month: "May", revenue: 55000, recurring: 45000, oneTime: 10000 },
  { month: "Jun", revenue: 67000, recurring: 52000, oneTime: 15000 },
  { month: "Jul", revenue: 71000, recurring: 55000, oneTime: 16000 },
  { month: "Aug", revenue: 69000, recurring: 54000, oneTime: 15000 },
  { month: "Sep", revenue: 73000, recurring: 58000, oneTime: 15000 },
  { month: "Oct", revenue: 76000, recurring: 61000, oneTime: 15000 },
  { month: "Nov", revenue: 82000, recurring: 65000, oneTime: 17000 },
  { month: "Dec", revenue: 89000, recurring: 70000, oneTime: 19000, projected: 95000 },
];

function RevenueTrendSkeleton() {
  return (
    <Card 
      className={cn(
        cardClasses('elevated'), 
        'shadow-xl border-2 backdrop-blur-sm bg-card/95 overflow-hidden',
        animationClasses('fade-in')
      )}
      role="status"
      aria-label="Loading revenue trend data"
    >
      <CardHeader className="space-y-4 pb-6 bg-gradient-to-br from-background to-muted/20">
        <div className={animationClasses('pulse')}>
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-gradient-to-br from-muted to-muted/60 rounded-lg animate-pulse shadow-sm" />
                <div className="h-6 bg-gradient-to-r from-muted to-muted/60 rounded w-48 animate-pulse" />
              </div>
              <div className="h-4 bg-gradient-to-r from-muted/70 to-muted/40 rounded w-64 animate-pulse" />
            </div>
            <div className="size-8 bg-gradient-to-br from-muted to-muted/60 rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-2">
                <div className="size-4 bg-gradient-to-br from-muted to-muted/60 rounded animate-pulse" />
                <div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded w-20 animate-pulse" />
              </div>
              <div className="h-8 bg-gradient-to-r from-muted to-muted/60 rounded w-32 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-80 bg-gradient-to-br from-muted/10 to-muted/5 rounded-2xl border-2 border-muted/20 animate-pulse shadow-inner" />
      </CardContent>
    </Card>
  );
}

export function RevenueTrendChart({ 
  data = mockData, 
  isLoading = false, 
  className 
}: RevenueTrendChartProps) {
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [timeframe, setTimeframe] = useState<string>('12m');
  
  // Calculate trend metrics
  const metrics = useMemo(() => {
    if (!data || data.length < 2) {
      return { currentRevenue: 0, previousRevenue: 0, growth: 0, trend: 'neutral' as const };
    }
    
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const currentRevenue = current?.revenue || 0;
    const previousRevenue = previous?.revenue || 0;
    
    const growth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    
    const trend = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';
    
    return { currentRevenue, previousRevenue, growth, trend };
  }, [data]);

  if (isLoading) {
    return <RevenueTrendSkeleton />;
  }

  return (
    <Card 
      className={cn(
        cardClasses('elevated'),
        'shadow-xl border-2 hover:shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden group',
        animationClasses('fade-in'),
        className
      )}
      style={{ 
        animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
        transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
      role="region"
      aria-labelledby="revenue-trend-title"
    >
      <CardHeader 
        className="space-y-6 pb-8 bg-gradient-to-br from-background to-muted/20"
        style={{ 
          animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all"
                   style={{ transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)` }}>
                <TrendingUp className="size-5 text-primary transition-transform group-hover:scale-110" 
                           style={{ transition: `transform ${ANIMATION_DURATIONS.fast} ease-out` }} />
              </div>
              <CardTitle 
                id="revenue-trend-title"
                className="tracking-tight font-bold text-foreground"
                style={{
                  fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
                  lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
                  fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
                }}
              >
                Revenue Trends
              </CardTitle>
            </div>
            <p className="leading-relaxed text-base max-w-2xl text-muted-foreground">
              Track your revenue performance over time with detailed breakdowns of recurring and one-time income.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select 
              value={timeframe} 
              onValueChange={setTimeframe}
              aria-label="Select timeframe for revenue data"
            >
              <SelectTrigger 
                className={cn(
                  buttonClasses('outline', 'sm'),
                  "w-auto min-w-[120px] shadow-sm hover:shadow-md bg-background border-2 hover:border-primary/30 hover:scale-105"
                )}
                style={{
                  transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2">
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="12m">12 Months</SelectItem>
                <SelectItem value="24m">24 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={chartType} 
              onValueChange={(value) => setChartType(value as 'area' | 'line')}
              aria-label="Select chart type"
            >
              <SelectTrigger 
                className={cn(
                  buttonClasses('outline', 'sm'),
                  "w-auto min-w-[100px] shadow-sm hover:shadow-md bg-background border-2 hover:border-primary/30 hover:scale-105"
                )}
                style={{
                  transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-2">
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Key metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Current Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(metrics.currentRevenue)}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {metrics.trend === 'up' ? (
                <TrendingUp className="size-4 text-emerald-600" />
              ) : metrics.trend === 'down' ? (
                <TrendingDown className="size-4 text-red-600" />
              ) : (
                <BarChart3 className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">Growth Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                metrics.trend === 'up' ? "text-emerald-600" : 
                metrics.trend === 'down' ? "text-red-600" : "text-muted-foreground"
              )}>
                {metrics.growth > 0 ? "+" : ""}{metrics.growth.toFixed(1)}%
              </p>
              <Badge 
                variant={metrics.trend === 'up' ? 'default' : metrics.trend === 'down' ? 'destructive' : 'secondary'}
                className={cn(
                  badgeClasses(
                    metrics.trend === 'up' ? 'success' : 
                    metrics.trend === 'down' ? 'destructive' : 'secondary',
                    'sm'
                  ),
                  "text-xs animate-pulse"
                )}
                style={{
                  animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                }}
              >
                <div className={cn(
                  "size-2 rounded-full mr-1",
                  metrics.trend === 'up' ? "bg-emerald-500" : 
                  metrics.trend === 'down' ? "bg-red-500" : "bg-muted-foreground"
                )} />
                vs last month
              </Badge>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Avg Monthly</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0) / data.length)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent 
        className="space-y-6 px-8 pb-8"
        style={{ 
          animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
        }}
      >
        <div 
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/10 border-2 border-border/60 p-6 hover:shadow-lg transition-shadow"
          style={{
            minHeight: '400px',
            transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
          }}
        >
          <ChartContainer 
            className="h-[350px] w-full" 
            config={chartConfig}
            style={{
              transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart 
                  data={data}
                  margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.revenue?.color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartConfig.revenue?.color} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="recurringGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.recurring?.color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartConfig.recurring?.color} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false}
                    fontSize={11}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                      return `$${value}`;
                    }}
                    fontSize={11}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      labelFormatter={(label) => `${label} Revenue`}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)), 
                        name === 'revenue' ? 'Total Revenue' :
                        name === 'recurring' ? 'Recurring Revenue' :
                        name === 'oneTime' ? 'One-time Revenue' : 'Projected'
                      ]}
                    />}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={chartConfig.revenue?.color}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="recurring" 
                    stroke={chartConfig.recurring?.color}
                    fillOpacity={1}
                    fill="url(#recurringGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <LineChart 
                  data={data}
                  margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false}
                    fontSize={11}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                      return `$${value}`;
                    }}
                    fontSize={11}
                    className="text-muted-foreground"
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      labelFormatter={(label) => `${label} Revenue`}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)), 
                        name === 'revenue' ? 'Total Revenue' :
                        name === 'recurring' ? 'Recurring Revenue' :
                        name === 'oneTime' ? 'One-time Revenue' : 'Projected'
                      ]}
                    />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={chartConfig.revenue?.color}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recurring" 
                    stroke={chartConfig.recurring?.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="oneTime" 
                    stroke={chartConfig.oneTime?.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {data.some(item => item.projected) && (
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke={chartConfig.projected?.color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
          
          {/* Enhanced chart legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.revenue?.color }} />
              <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.recurring?.color }} />
              <span className="text-xs font-medium text-muted-foreground">Recurring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.oneTime?.color }} />
              <span className="text-xs font-medium text-muted-foreground">One-time</span>
            </div>
            {data.some(item => item.projected) && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-0.5 opacity-60" 
                  style={{ 
                    backgroundColor: chartConfig.projected?.color,
                    backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 2px, currentColor 2px, currentColor 4px)'
                  }} 
                />
                <span className="text-xs font-medium text-muted-foreground">Projected</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}