import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import type { PaymentAnalyticsData } from '@/types/analytics';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Receipt,
  Target,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { usePaymentAnalytics } from '@/hooks/usePayments';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface PaymentAnalyticsProps {
  propertyId?: string;
  tenantId?: string;
  title?: string;
  description?: string;
}

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function PaymentAnalytics({
  propertyId,
  title = 'Payment Analytics',
  description = 'Comprehensive payment insights and trends',
}: PaymentAnalyticsProps) {
  const { data: analytics, isLoading, error } = usePaymentAnalytics(propertyId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load payment analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage changes
  const monthlyChange = analytics.lastMonthAmount > 0
    ? ((analytics.currentMonthAmount - analytics.lastMonthAmount) / analytics.lastMonthAmount) * 100
    : 0;

  // Prepare monthly chart data
  type MonthlyDataItem = { month: string; amount: number; count: number };
  const monthlyChartData = (Object.values(analytics.monthlyData) as MonthlyDataItem[])
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12) // Last 12 months
    .map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM yyyy'),
      amount: item.amount,
      count: item.count,
    }));

  // Prepare payment types data for pie chart
  const paymentTypeNames: Record<string, string> = {
    'RENT': 'Rent',
    'SECURITY_DEPOSIT': 'Security Deposit',
    'LATE_FEE': 'Late Fee',
    'UTILITY': 'Utility',
    'MAINTENANCE': 'Maintenance',
    'OTHER': 'Other'
  };

  const paymentTypesData = (Object.entries(analytics.paymentTypes) as [string, number][])
    .map(([type, amount]) => ({
      name: paymentTypeNames[type] || type.replace('_', ' '),
      value: amount,
      percentage: ((amount / analytics.totalAmount) * 100).toFixed(1),
    }))
    .filter(item => item.value > 0);

  // Calculate collection efficiency based on expected vs actual payments
  const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysPassed = new Date().getDate();
  const monthProgress = (daysPassed / daysInCurrentMonth);

  // Estimate expected monthly revenue based on historical average
  const lastThreeMonths = (Object.values(analytics.monthlyData) as MonthlyDataItem[])
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(1, 4); // Skip current month, take last 3

  const avgMonthlyRevenue = lastThreeMonths.length > 0
    ? lastThreeMonths.reduce((sum, m) => sum + m.amount, 0) / lastThreeMonths.length
    : 0;

  const expectedCurrentMonth = avgMonthlyRevenue * monthProgress;
  const collectionEfficiency = expectedCurrentMonth > 0
    ? Math.min(100, Math.round((analytics.currentMonthAmount / expectedCurrentMonth) * 100))
    : analytics.currentMonthAmount > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Collected"
          value={`$${analytics.totalAmount.toLocaleString()}`}
          icon={DollarSign}
          color="bg-blue-500"
          delay={0.1}
        />
        <StatCard
          title="This Month"
          value={`$${analytics.currentMonthAmount.toLocaleString()}`}
          change={Math.round(monthlyChange)}
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

      {/* Charts and Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="types">Payment Types</TabsTrigger>
          <TabsTrigger value="collection">Collection Analysis</TabsTrigger>
        </TabsList>

        {/* Monthly Trends Tab */}
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
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `$${(value as number).toLocaleString()}`,
                          'Revenue'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Payment Types Tab */}
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
                        outerRadius={80}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {paymentTypesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`$${(value as number).toLocaleString()}`, 'Amount']}
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
                  {paymentTypesData.map((type: { name: string; value: number; percentage: string }, index: number) => (
                    <div key={type.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
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

        {/* Collection Analysis Tab */}
        <TabsContent value="collection" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Collection Efficiency */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Collection Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {collectionEfficiency}%
                    </div>
                    <p className="text-sm text-muted-foreground">On-time collections</p>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${collectionEfficiency}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Average Payment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Average Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      ${analytics.totalPayments > 0
                        ? Math.round(analytics.totalAmount / analytics.totalPayments).toLocaleString()
                        : '0'
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">Per transaction</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Year to Date */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Year to Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      ${analytics.currentYearAmount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date().getFullYear()} total
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
