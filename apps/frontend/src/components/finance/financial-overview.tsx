"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarCheck, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig} from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency, 
  ANIMATION_DURATIONS, 
  cn, 
  TYPOGRAPHY_SCALE 
} from "@/lib/utils";
import { useFinancialOverview } from "@/hooks/api/financial";
import { useState, useMemo } from "react";

const chartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-2)",
  },
  income: {
    label: "Income",
    color: "var(--chart-3)",
  },
} as ChartConfig;

export function FinancialOverview() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last-year");
  const [selectedYear, _setSelectedYear] = useState<number>(new Date().getFullYear());
  const { data: financialData, isLoading, error: _error } = useFinancialOverview(selectedYear);

  // Memoized calculations for better performance
  const { chartData, summary, trends, metrics } = useMemo(() => {
    const defaultData = {
      chartData: [],
      summary: { totalIncome: 0, totalExpenses: 0, totalScheduled: 0, netIncome: 0 },
      trends: { income: 0, expenses: 0, net: 0 },
      metrics: { avgMonthlyIncome: 0, avgMonthlyExpenses: 0, profitMargin: 0 }
    };

    if (!financialData?.chartData || financialData.chartData.length === 0) {
      return defaultData;
    }

    const data = financialData.chartData;
    const summaryData = financialData.summary;

    // Calculate trends (comparing last 3 months to previous 3 months)
    const recentData = data.slice(-3);
    const previousData = data.slice(-6, -3);
    
    const recentAvgIncome = recentData.reduce((sum, item) => sum + item.income, 0) / recentData.length;
    const previousAvgIncome = previousData.reduce((sum, item) => sum + item.income, 0) / previousData.length;
    const incomeTrend = previousAvgIncome > 0 ? ((recentAvgIncome - previousAvgIncome) / previousAvgIncome) * 100 : 0;

    const recentAvgExpenses = recentData.reduce((sum, item) => sum + item.expenses, 0) / recentData.length;
    const previousAvgExpenses = previousData.reduce((sum, item) => sum + item.expenses, 0) / previousData.length;
    const expensesTrend = previousAvgExpenses > 0 ? ((recentAvgExpenses - previousAvgExpenses) / previousAvgExpenses) * 100 : 0;

    const netTrend = incomeTrend - expensesTrend;

    // Calculate metrics
    const avgMonthlyIncome = summaryData.totalIncome / 12;
    const avgMonthlyExpenses = summaryData.totalExpenses / 12;
    const profitMargin = summaryData.totalIncome > 0 ? ((summaryData.totalIncome - summaryData.totalExpenses) / summaryData.totalIncome) * 100 : 0;

    return {
      chartData: data,
      summary: summaryData,
      trends: { income: incomeTrend, expenses: expensesTrend, net: netTrend },
      metrics: { avgMonthlyIncome, avgMonthlyExpenses, profitMargin }
    };
  }, [financialData]);

  // Loading state with enhanced skeleton
  if (isLoading) {
    return (
      <Card 
        className={cn(
          cardClasses(),
          'shadow-xl border-2 backdrop-blur-sm bg-card/95'
        )}
        style={{ 
          animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
        }}
      >
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle 
                className="tracking-tight font-bold text-foreground"
                style={{
                  fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
                  lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
                  fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
                }}
              >
                Financial Overview
              </CardTitle>
              <CardDescription className="text-base leading-relaxed max-w-lg">
                Loading your financial data and insights...
              </CardDescription>
            </div>
            <div className="animate-pulse">
              <DollarSign className="size-8 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4 p-6 rounded-xl bg-muted/30 border-2">
                  <div className="size-14 bg-muted rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-muted rounded w-20" />
                    <div className="h-6 bg-muted rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="h-80 bg-muted/20 rounded-xl animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Enhanced main component with modern SaaS design
  return (
    <Card 
      className={cn(
        cardClasses(),
        'dashboard-widget shadow-xl border-2 hover:shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden'
      )}
      style={{ 
        animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
        transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
      }}
      role="region"
      aria-labelledby="financial-overview-title"
    >
      <CardHeader 
        className="space-y-6 pb-8 bg-gradient-to-br from-background to-muted/20"
        style={{ 
          animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <DollarSign className="size-5 text-primary" />
              </div>
              <CardTitle 
                id="financial-overview-title"
                className="tracking-tight font-bold text-foreground"
                style={{
                  fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
                  lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
                  fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
                }}
              >
                Financial Overview
              </CardTitle>
            </div>
            <CardDescription className="leading-relaxed text-base max-w-2xl text-muted-foreground">
              Track your income, expenses, and scheduled amounts at a glance. Get insights into your financial performance and trends.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-3">
            <Select 
              value={selectedPeriod} 
              onValueChange={setSelectedPeriod}
              aria-label="Select time period for financial data"
            >
              <SelectTrigger 
                className="w-auto min-w-[160px] transition-all shadow-sm hover:shadow-md bg-background border-2"
                style={{
                  transition: `all ${ANIMATION_DURATIONS.fast} ease-out`,
                }}
              >
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="last-quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            {metrics.profitMargin !== 0 && (
              <Badge 
                variant={metrics.profitMargin > 0 ? "default" : "destructive"}
                className="text-xs font-semibold px-3 py-1"
              >
                {metrics.profitMargin > 0 ? "+" : ""}{metrics.profitMargin.toFixed(1)}% margin
              </Badge>
            )}
          </CardAction>
        </div>
      </CardHeader>
      <CardContent 
        className="space-y-8 px-8 pb-8"
        style={{ 
          animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
        }}
      >
        {/* Enhanced metric cards with trends and better accessibility */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          role="group" 
          aria-label="Financial metrics summary"
        >
          {/* Income Card */}
          <article 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/20 border-2 border-green-200/60 dark:border-green-800/40 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-100/50 dark:hover:shadow-green-950/50 transition-all cursor-pointer"
            style={{ 
              animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
              transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Total income: ${formatCurrency(summary.totalIncome)}${trends.income !== 0 ? `, trending ${trends.income > 0 ? 'up' : 'down'} by ${Math.abs(trends.income).toFixed(1)}%` : ''}`}
          >
            <div className="flex items-start justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-green-200/50 border border-green-300/50 group-hover:scale-110 transition-transform">
                    <ArrowDownLeft className="size-6 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-800 dark:text-green-300 text-sm font-semibold uppercase tracking-wide">
                      Total Income
                    </p>
                    {trends.income !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {trends.income > 0 ? (
                          <TrendingUp className="size-3 text-green-600" />
                        ) : (
                          <TrendingDown className="size-3 text-green-600" />
                        )}
                        <span className="text-xs text-green-600 font-medium">
                          {trends.income > 0 ? "+" : ""}{trends.income.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-bold tabular-nums text-3xl text-green-700 dark:text-green-300">
                  {formatCurrency(summary.totalIncome)}
                </p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  Avg: {formatCurrency(metrics.avgMonthlyIncome)}/mo
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-green-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </article>
          
          {/* Expenses Card */}
          <article 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/20 border-2 border-red-200/60 dark:border-red-800/40 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg hover:shadow-red-100/50 dark:hover:shadow-red-950/50 transition-all cursor-pointer"
            style={{ 
              animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
              transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Total expenses: ${formatCurrency(summary.totalExpenses)}${trends.expenses !== 0 ? `, trending ${trends.expenses > 0 ? 'up' : 'down'} by ${Math.abs(trends.expenses).toFixed(1)}%` : ''}`}
          >
            <div className="flex items-start justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-red-200/50 border border-red-300/50 group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="size-6 text-red-700 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-800 dark:text-red-300 text-sm font-semibold uppercase tracking-wide">
                      Total Expenses
                    </p>
                    {trends.expenses !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {trends.expenses > 0 ? (
                          <TrendingUp className="size-3 text-red-600" />
                        ) : (
                          <TrendingDown className="size-3 text-red-600" />
                        )}
                        <span className="text-xs text-red-600 font-medium">
                          {trends.expenses > 0 ? "+" : ""}{trends.expenses.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-bold tabular-nums text-3xl text-red-700 dark:text-red-300">
                  {formatCurrency(summary.totalExpenses)}
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  Avg: {formatCurrency(metrics.avgMonthlyExpenses)}/mo
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-red-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </article>
          
          {/* Scheduled/Net Income Card */}
          <article 
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/20 border-2 border-blue-200/60 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-950/50 transition-all cursor-pointer"
            style={{ 
              animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`,
              transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Net income: ${formatCurrency(summary.netIncome)}${trends.net !== 0 ? `, trending ${trends.net > 0 ? 'up' : 'down'} by ${Math.abs(trends.net).toFixed(1)}%` : ''}`}
          >
            <div className="flex items-start justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-200/50 border border-blue-300/50 group-hover:scale-110 transition-transform">
                    <CalendarCheck className="size-6 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 text-sm font-semibold uppercase tracking-wide">
                      Net Income
                    </p>
                    {trends.net !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {trends.net > 0 ? (
                          <TrendingUp className="size-3 text-blue-600" />
                        ) : (
                          <TrendingDown className="size-3 text-blue-600" />
                        )}
                        <span className="text-xs text-blue-600 font-medium">
                          {trends.net > 0 ? "+" : ""}{trends.net.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="font-bold tabular-nums text-3xl text-blue-700 dark:text-blue-300">
                  {formatCurrency(summary.netIncome)}
                </p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                  Scheduled: {formatCurrency(summary.totalScheduled)}
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </article>
        </div>
        <Separator className="opacity-60" />
        
        {/* Enhanced chart section with better accessibility */}
        <section 
          className="space-y-6"
          style={{ 
            animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`,
          }}
          aria-labelledby="monthly-breakdown-title"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 
                id="monthly-breakdown-title"
                className="text-lg font-semibold text-foreground"
                style={{
                  fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
                  lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight,
                  fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight
                }}
              >
                Monthly Financial Trends
              </h3>
              <p className="text-sm text-muted-foreground">
                Track your financial performance month over month
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 px-3 border-2 hover:bg-muted/50"
              >
                Export Data
              </Button>
              <Badge variant="outline" className="text-xs">
                {chartData.length} months
              </Badge>
            </div>
          </div>
          
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
                <BarChart 
                  data={chartData}
                  margin={{ left: 10, right: 30, top: 20, bottom: 20 }} 
                  barCategoryGap="25%"
                >
                  <CartesianGrid 
                    vertical={false} 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--muted-foreground))" 
                    opacity={0.2} 
                  />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    tickMargin={10} 
                    axisLine={false}
                    fontSize={11}
                    className="text-muted-foreground"
                    tick={{ fontSize: 11 }}
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
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      hideLabel={false}
                      labelFormatter={(label) => `${label} Financial Summary`}
                      formatter={(value, name) => [
                        formatCurrency(Number(value)), 
                        name === 'income' ? 'Income' : name === 'expenses' ? 'Expenses' : 'Scheduled'
                      ]}
                    />}
                    cursor={{ 
                      fill: 'hsl(var(--muted))', 
                      opacity: 0.1, 
                      radius: 4 
                    }}
                  />
                  <Bar 
                    dataKey="income" 
                    fill={chartConfig.income?.color}
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill={chartConfig.expenses?.color}
                    radius={[0, 0, 0, 0]}
                    name="Expenses"
                  />
                  <Bar 
                    dataKey="scheduled" 
                    fill={chartConfig.scheduled?.color}
                    radius={[0, 0, 4, 4]}
                    name="Scheduled"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            
            {/* Chart legend with enhanced styling */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.income?.color }} />
                <span className="text-xs font-medium text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.expenses?.color }} />
                <span className="text-xs font-medium text-muted-foreground">Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full" style={{ backgroundColor: chartConfig.scheduled?.color }} />
                <span className="text-xs font-medium text-muted-foreground">Scheduled</span>
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
