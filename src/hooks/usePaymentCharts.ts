import { useMemo } from 'react';

interface ChartConfiguration {
  colors: string[];
  formatters: {
    currency: (value: number) => string;
    percentage: (value: number) => string;
  };
  tooltipFormatters: {
    currency: (value: number) => [string, string];
    count: (value: number) => [string, string];
  };
  chartDefaults: {
    strokeDasharray: string;
    tickFontSize: number;
    height: number;
    xAxisHeight: number;
    fillOpacity: number;
  };
}

/**
 * Custom hook for payment analytics chart configuration
 * Centralizes chart styling, colors, and formatting logic
 */
export function usePaymentCharts(): ChartConfiguration {
  const chartConfig = useMemo(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    const formatters = {
      currency: (value: number) => `$${value.toLocaleString()}`,
      percentage: (value: number) => `${value.toFixed(1)}%`,
    };

    const tooltipFormatters = {
      currency: (value: number) => [
        `$${value.toLocaleString()}`,
        'Revenue'
      ] as [string, string],
      count: (value: number) => [
        value.toString(),
        'Payments'
      ] as [string, string],
    };

    const chartDefaults = {
      strokeDasharray: '3 3',
      tickFontSize: 12,
      height: 300,
      xAxisHeight: 80,
      fillOpacity: 0.3,
    };

    return {
      colors,
      formatters,
      tooltipFormatters,
      chartDefaults,
    };
  }, []);

  return chartConfig;
}

/**
 * Custom hook for area chart specific configuration
 */
export function useAreaChartConfig() {
  const { colors, chartDefaults, formatters, tooltipFormatters } = usePaymentCharts();
  
  return {
    stroke: colors[0], // Primary blue
    fill: colors[0],
    fillOpacity: chartDefaults.fillOpacity,
    height: chartDefaults.height,
    strokeDasharray: chartDefaults.strokeDasharray,
    tickFontSize: chartDefaults.tickFontSize,
    xAxisHeight: chartDefaults.xAxisHeight,
    yAxisFormatter: formatters.currency,
    tooltipFormatter: tooltipFormatters.currency,
  };
}

/**
 * Custom hook for bar chart specific configuration
 */
export function useBarChartConfig() {
  const { colors, chartDefaults, tooltipFormatters } = usePaymentCharts();
  
  return {
    fill: colors[1], // Green
    height: chartDefaults.height,
    strokeDasharray: chartDefaults.strokeDasharray,
    tickFontSize: chartDefaults.tickFontSize,
    xAxisHeight: chartDefaults.xAxisHeight,
    tooltipFormatter: tooltipFormatters.count,
  };
}

/**
 * Custom hook for pie chart specific configuration
 */
export function usePieChartConfig() {
  const { colors } = usePaymentCharts();
  
  return {
    colors,
    outerRadius: 80,
    labelFormatter: (name: string, percentage: string) => `${name}: ${percentage}%`,
    tooltipFormatter: (value: number) => [`$${value.toLocaleString()}`, 'Amount'] as [string, string],
  };
}