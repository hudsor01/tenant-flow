import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Receipt, Target } from 'lucide-react';
import { formatCurrency } from '@/hooks/usePaymentAnalyticsData';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
                {change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                ) : change < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                ) : null}
                <span
                  className={`text-sm ${
                    change > 0
                      ? 'text-green-600'
                      : change < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {change > 0 ? '+' : ''}
                  {change}% {changeLabel}
                </span>
              </div>
            )}
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface AnalyticsMetricsSectionProps {
  analytics: {
    totalAmount: number;
    currentMonthAmount: number;
    totalPayments: number;
  };
  monthlyChange: number;
  collectionEfficiency: number;
}

/**
 * Analytics metrics section displaying key payment statistics
 * Shows total collected, monthly amounts, payment counts, and collection rates
 */
export default function AnalyticsMetricsSection({
  analytics,
  monthlyChange,
  collectionEfficiency,
}: AnalyticsMetricsSectionProps) {
  // const averagePayment = calculateAveragePayment(analytics.totalAmount, analytics.totalPayments);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Collected"
        value={formatCurrency(analytics.totalAmount)}
        icon={DollarSign}
        color="bg-blue-500"
        delay={0.1}
      />
      <StatCard
        title="This Month"
        value={formatCurrency(analytics.currentMonthAmount)}
        change={monthlyChange}
        changeLabel="from last month"
        icon={Calendar}
        color="bg-green-500"
        delay={0.2}
      />
      <StatCard
        title="Total Payments"
        value={analytics.totalPayments}
        icon={Receipt}
        color="bg-purple-500"
        delay={0.3}
      />
      <StatCard
        title="Collection Rate"
        value={`${collectionEfficiency}%`}
        icon={Target}
        color="bg-orange-500"
        delay={0.4}
      />
    </div>
  );
}