"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig} from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinancialOverview } from "@/hooks/api/financial";
import { Loader } from "@/components/magicui/loader";
import { useState } from "react";

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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { data: financialData, isLoading, error } = useFinancialOverview(selectedYear);

  // Loading state
  if (isLoading) {
    return (
      <Card className="shadow-xs transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="tracking-tight">Financial Overview</CardTitle>
          <CardDescription>Monthly income, expenses, and scheduled payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback data if API call fails
  const chartData = financialData?.chartData || [];
  const summary = financialData?.summary || {
    totalIncome: 0,
    totalExpenses: 0,
    totalScheduled: 0,
    netIncome: 0
  };

  // All calculations now done in database - no frontend business logic!
  return (
    <Card className="shadow-xs transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="tracking-tight">Financial Overview</CardTitle>
        <CardDescription className="leading-relaxed">Track your income, expenses, and scheduled amounts at a glance.</CardDescription>
        <CardAction>
          <Select defaultValue="last-year">
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Separator />
        <div className="adaptive-layout py-5">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-accent">
              <ArrowDownLeft className="stroke-chart-1 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Income</p>
              <p className="font-medium tabular-nums">{formatCurrency(summary.totalIncome)}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-accent">
              <ArrowUpRight className="stroke-chart-2 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Expenses</p>
              <p className="font-medium tabular-nums">{formatCurrency(summary.totalExpenses)}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="!h-auto" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-accent">
              <CalendarCheck className="stroke-chart-3 size-6" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Scheduled</p>
              <p className="font-medium tabular-nums">{formatCurrency(summary.totalScheduled)}</p>
            </div>
          </div>
        </div>
        <Separator />
        <ChartContainer className="max-h-72 w-full" config={chartConfig}>
          <BarChart margin={{ left: -25, right: 0, top: 25, bottom: 0 }} accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value >= 1000 ? value / 1000 + "k" : value}`}
              domain={[0, 20000]}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="scheduled" stackId="a" fill={chartConfig.scheduled?.color} />
            <Bar dataKey="expenses" stackId="a" fill={chartConfig.expenses?.color} />
            <Bar dataKey="income" stackId="a" fill={chartConfig.income?.color} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
