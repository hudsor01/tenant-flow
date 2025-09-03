'use client'

import { TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStats } from "@/hooks/api/use-dashboard";

export function SectionCards() {
  const { data: dashboardStats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Error loading dashboard data</CardDescription>
            <CardTitle className="text-red-600">Failed to load stats</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = dashboardStats;
  if (!stats) return null;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Monthly Rent Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${stats.revenue.monthly.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.revenue.growth >= 0 ? <TrendingUp /> : <TrendingDown />}
              {stats.revenue.growth >= 0 ? '+' : ''}{stats.revenue.growth.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.revenue.growth >= 0 ? 'Strong collection rate' : 'Collection needs attention'} 
            {stats.revenue.growth >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">Revenue from {stats.properties.total} active properties</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Occupied Units</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.units.occupied}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              {stats.units.occupancyRate}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.units.occupancyRate}% occupancy rate <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{stats.units.vacant} units available for rent</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Tenants</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.tenants.active}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +{stats.tenants.newThisMonth}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.tenants.newThisMonth > 0 ? 'Growing tenant base' : 'Stable tenant base'} <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">{stats.tenants.newThisMonth} new tenants this month</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Open Work Orders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.maintenance.open}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.maintenance.open > 0 ? <TrendingUp /> : <TrendingDown />}
              {stats.maintenance.open > 0 ? `${stats.maintenance.open} open` : 'All resolved'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.maintenance.avgResolutionTime > 0 ? `${stats.maintenance.avgResolutionTime} day avg resolution` : 'No pending requests'} 
            <TrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">{stats.maintenance.completed} completed this month</div>
        </CardFooter>
      </Card>
    </div>
  );
}
