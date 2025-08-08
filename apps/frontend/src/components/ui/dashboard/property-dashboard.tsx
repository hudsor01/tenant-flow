"use client"

import * as React from "react"
import {
  DollarSign,
  Users,
  Home,
  Wrench,
  FileText,
  BarChart3,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { StatsCard } from "./stats-card"

// Property Management Dashboard Stats
interface PropertyDashboardProps {
  loading?: boolean
  className?: string
  data?: {
    revenue?: { value: string, trend: number }
    tenants?: { value: string, trend: number }
    properties?: { value: string, trend: number }
    maintenance?: { value: string, trend: number }
    occupancy?: { value: string, trend: number }
    leases?: { value: string, trend: number }
  }
}

export function PropertyDashboard({ 
  loading = false, 
  className,
  data 
}: PropertyDashboardProps) {
  const stats = [
    {
      title: "Monthly Revenue",
      value: data?.revenue?.value || "$45,231.50",
      description: "Collected rent payments",
      trend: { 
        value: data?.revenue?.trend || 12.5, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <DollarSign className="h-4 w-4" />,
      variant: "revenue" as const
    },
    {
      title: "Active Tenants", 
      value: data?.tenants?.value || "1,284",
      description: "Currently occupied units",
      trend: { 
        value: data?.tenants?.trend || 4.2, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <Users className="h-4 w-4" />,
      variant: "tenants" as const
    },
    {
      title: "Properties",
      value: data?.properties?.value || "24",
      description: "Total managed properties", 
      trend: { 
        value: data?.properties?.trend || 8.1, 
        period: "vs last quarter",
        isPositive: true 
      },
      icon: <Home className="h-4 w-4" />,
      variant: "properties" as const
    },
    {
      title: "Maintenance",
      value: data?.maintenance?.value || "7",
      description: "Pending requests",
      trend: { 
        value: data?.maintenance?.trend || -15.3, 
        period: "vs last week",
        isPositive: false // Lower maintenance is better
      },
      icon: <Wrench className="h-4 w-4" />,
      variant: "maintenance" as const
    },
    {
      title: "Occupancy Rate",
      value: data?.occupancy?.value || "94.2%",
      description: "Current occupancy",
      trend: { 
        value: data?.occupancy?.trend || 2.1, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <BarChart3 className="h-4 w-4" />,
      variant: "occupancy" as const
    },
    {
      title: "Lease Renewals",
      value: data?.leases?.value || "18",
      description: "Due this month",
      trend: { 
        value: data?.leases?.trend || 5.8, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <FileText className="h-4 w-4" />,
      variant: "default" as const
    }
  ]

  return (
    <div className={cn(
      "grid gap-4 @container",
      // Responsive grid using container queries
      "@[640px]:grid-cols-2 @[960px]:grid-cols-3 @[1280px]:grid-cols-6 grid-cols-1",
      className
    )}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          trend={stat.trend}
          icon={stat.icon}
          variant={stat.variant}
          loading={loading}
        />
      ))}
    </div>
  )
}