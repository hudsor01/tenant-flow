"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { cn } from "@/lib/utils";

// Dynamically import ReactApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RevenueChartProps {
  className?: string;
  title?: string;
  data?: {
    name: string;
    data: number[];
  }[];
  categories?: string[];
  height?: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  className,
  title = "Revenue Overview",
  data = [
    {
      name: "Revenue",
      data: [1200, 1500, 1800, 1400, 1600, 2000, 2200, 2500, 2800, 2400, 2900, 3200],
    },
    {
      name: "Expenses",
      data: [800, 900, 1100, 950, 1050, 1200, 1400, 1500, 1700, 1450, 1800, 2000],
    },
  ],
  categories = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  height = 350,
}) => {
  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Inter, sans-serif",
    },
    colors: ["#3B82F6", "#10B981"], // Blue and green for TenantFlow
    chart: {
      fontFamily: "Inter, sans-serif",
      height: height,
      type: "area",
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      show: true,
      borderColor: "#e5e7eb",
      strokeDashArray: 5,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      theme: "light",
      y: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
    xaxis: {
      type: "category",
      categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          fontSize: "12px",
          colors: "#6B7280",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: "#6B7280",
        },
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 300,
          },
        },
      },
    ],
  };

  return (
    <div className={cn(
      "rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950",
      className
    )}>
      {title && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[500px]">
          <ReactApexChart
            options={options}
            series={data}
            type="area"
            height={height}
          />
        </div>
      </div>
    </div>
  );
};

// Property-specific revenue chart with default TenantFlow data
export const PropertyRevenueChart: React.FC<{ className?: string }> = ({ className }) => {
  const propertyData = [
    {
      name: "Rent Collection",
      data: [8500, 9200, 8800, 9100, 9500, 10200, 10800, 11200, 10900, 11400, 12100, 12800],
    },
    {
      name: "Operating Expenses",
      data: [2200, 2400, 2100, 2300, 2500, 2800, 3100, 3200, 2900, 3300, 3600, 3800],
    },
  ];

  return (
    <RevenueChart
      className={className}
      title="Property Revenue Overview"
      data={propertyData}
      height={400}
    />
  );
};

export default RevenueChart;