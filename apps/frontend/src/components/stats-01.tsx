import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { DashboardStats } from '@repo/shared';
import * as React from 'react';

interface PropertyStatsProps {
  data?: DashboardStats;
}

export default function Stats01({ data }: PropertyStatsProps) {
  // Property management focused stats with fallback values
  const statsData = [
    {
      name: "Monthly Revenue",
      value: formatCurrency(data?.revenue?.monthly ?? 0),
      change: data?.revenue?.growth ? `${data.revenue.growth > 0 ? '+' : ''}${data.revenue.growth.toFixed(1)}%` : "+0.0%",
      changeType: (data?.revenue?.growth ?? 0) >= 0 ? "positive" : "negative",
    },
    {
      name: "Occupancy Rate",
      value: `${(data?.properties?.occupancyRate ?? 0).toFixed(1)}%`,
      change: "+2.4%", // Mock change - would come from API
      changeType: "positive",
    },
    {
      name: "Active Properties",
      value: (data?.properties?.total ?? 0).toString(),
      change: "+1.2%", // Mock change - would come from API
      changeType: "positive",
    },
    {
      name: "Collection Rate",
      value: "96.8%", // Mock value - would come from API
      change: "-0.5%", // Mock change - would come from API
      changeType: "negative",
    },
  ];
  return (
    <div className="tw-:w-full">
      <div className="tw-:mx-auto tw-:grid tw-:grid-cols-1 tw-:gap-px tw-:rounded-xl tw-:bg-border tw-:sm:grid-cols-2 tw-:lg:grid-cols-4">
        {statsData.map((stat, index) => (
          <Card
            key={stat.name}
            className={cn(
              "tw-:rounded-none tw-:border-0 tw-:shadow-none tw-:py-0",
              index === 0 && "tw-:rounded-l-xl",
              index === statsData.length - 1 && "tw-:rounded-r-xl"
            )}
          >
            <CardContent className="tw-:flex tw-:flex-wrap tw-:items-baseline tw-:justify-between tw-:gap-x-4 tw-:gap-y-2 tw-:p-4 tw-:sm:p-6">
              <div className="tw-:text-sm tw-:font-medium tw-:text-muted-foreground">
                {stat.name}
              </div>
              <div
                className={cn(
                  "tw-:text-xs tw-:font-medium",
                  stat.changeType === "positive"
                    ? "tw-:text-green-800 tw-:dark:text-green-400"
                    : "tw-:text-red-800 tw-:dark:text-red-400"
                )}
              >
                {stat.change}
              </div>
              <div className="tw-:w-full tw-:flex-none tw-:text-3xl tw-:font-medium tw-:tracking-tight tw-:text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
