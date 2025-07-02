import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { BarChart3, Receipt } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useAreaChartConfig, useBarChartConfig } from '@/hooks/usePaymentCharts';

interface MonthlyChartData {
  month: string;
  amount: number;
  count: number;
}

interface PaymentTrendsSectionProps {
  monthlyChartData: MonthlyChartData[];
}

/**
 * Payment trends section displaying monthly revenue and payment frequency charts
 * Shows area chart for revenue trends and bar chart for payment counts
 */
export default function PaymentTrendsSection({ monthlyChartData }: PaymentTrendsSectionProps) {
  const areaConfig = useAreaChartConfig();
  const barConfig = useBarChartConfig();

  return (
    <TabsContent value="trends" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Revenue
              </CardTitle>
              <CardDescription>Payment amounts collected over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={areaConfig.height}>
                <AreaChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray={areaConfig.strokeDasharray} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: areaConfig.tickFontSize }}
                    angle={-45}
                    textAnchor="end"
                    height={areaConfig.xAxisHeight}
                  />
                  <YAxis
                    tick={{ fontSize: areaConfig.tickFontSize }}
                    tickFormatter={areaConfig.yAxisFormatter}
                  />
                  <Tooltip
                    formatter={areaConfig.tooltipFormatter}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={areaConfig.stroke}
                    fill={areaConfig.fill}
                    fillOpacity={areaConfig.fillOpacity}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Count Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Frequency
              </CardTitle>
              <CardDescription>Number of payments received monthly</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={barConfig.height}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray={barConfig.strokeDasharray} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: barConfig.tickFontSize }}
                    angle={-45}
                    textAnchor="end"
                    height={barConfig.xAxisHeight}
                  />
                  <YAxis tick={{ fontSize: barConfig.tickFontSize }} />
                  <Tooltip 
                    formatter={barConfig.tooltipFormatter}
                  />
                  <Bar dataKey="count" fill={barConfig.fill} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TabsContent>
  );
}