"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A donut chart with text"

const chartData = [
  { propertyType: "Apartment", units: 275, fill: "var(--color-apartment)" },
  { propertyType: "Single Family", units: 200, fill: "var(--color-singlefamily)" },
  { propertyType: "Condo", units: 187, fill: "var(--color-condo)" },
  { propertyType: "Townhouse", units: 173, fill: "var(--color-townhouse)" },
  { propertyType: "Commercial", units: 90, fill: "var(--color-commercial)" },
]

const chartConfig = {
  units: {
    label: "Units",
  },
  apartment: {
    label: "Apartment",
    color: "hsl(var(--chart-1))",
  },
  singlefamily: {
    label: "Single Family",
    color: "hsl(var(--chart-2))",
  },
  condo: {
    label: "Condo",
    color: "hsl(var(--chart-3))",
  },
  townhouse: {
    label: "Townhouse",
    color: "hsl(var(--chart-4))",
  },
  commercial: {
    label: "Commercial",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

export function ChartPieInteractive() {
  const totalUnits = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.units, 0)
  }, [])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Property Portfolio</CardTitle>
        <CardDescription>Units by Property Type</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="units"
              nameKey="propertyType"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalUnits.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Units
                        </tspan>
                      </text>
                    )
                  }
                  return null
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Portfolio growing by 12% this quarter <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total units across all property types
        </div>
      </CardFooter>
    </Card>
  )
}