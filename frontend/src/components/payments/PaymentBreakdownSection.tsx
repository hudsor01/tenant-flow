import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { usePieChartConfig } from '@/hooks/usePaymentCharts';

interface PaymentTypeData {
  name: string;
  value: number;
  percentage: string;
}

interface PaymentBreakdownSectionProps {
  paymentTypesData: PaymentTypeData[];
}

/**
 * Payment breakdown section displaying payment distribution by type
 * Shows pie chart and detailed summary list with percentages
 */
export default function PaymentBreakdownSection({ paymentTypesData }: PaymentBreakdownSectionProps) {
  const pieConfig = usePieChartConfig();

  return (
    <TabsContent value="types" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Types Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Payment Breakdown
              </CardTitle>
              <CardDescription>Distribution by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentTypesData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={pieConfig.outerRadius}
                    label={({ name, percentage }) => pieConfig.labelFormatter(name, percentage)}
                  >
                    {paymentTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieConfig.colors[index % pieConfig.colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={pieConfig.tooltipFormatter}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Types Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
              <CardDescription>Detailed breakdown by type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentTypesData.map((type, index) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: pieConfig.colors[index % pieConfig.colors.length] }}
                    />
                    <span className="font-medium">{type.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${type.value.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{type.percentage}%</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TabsContent>
  );
}