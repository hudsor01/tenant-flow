import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Target,
  Lightbulb,
  Bell,
  Building,
  ArrowRight,
} from 'lucide-react';
import { usePaymentAnalytics, usePayments } from '@/hooks/usePayments';
import { useProperties as useProperties } from '@/hooks/useProperties';
import { motion } from 'framer-motion';
import { isAfter } from 'date-fns';
import type { Unit } from '@/types/entities';

interface PaymentInsightsProps {
  propertyId?: string;
  className?: string;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon: React.ElementType;
  priority: number;
}

export default function PaymentInsights({ propertyId, className }: PaymentInsightsProps) {
  const { data: analytics, isLoading } = usePaymentAnalytics(propertyId);
  const { data: payments = [] } = usePayments();
  const { data: properties = [] } = useProperties();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No payment data available for insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate insights based on payment data
  const insights: Insight[] = [];

  // Revenue Growth Insight
  const monthlyChange = analytics.lastMonthAmount > 0
    ? ((analytics.currentMonthAmount - analytics.lastMonthAmount) / analytics.lastMonthAmount) * 100
    : 0;

  if (monthlyChange > 10) {
    insights.push({
      id: 'revenue-growth',
      type: 'success',
      title: 'Strong Revenue Growth',
      description: `Revenue increased by ${monthlyChange.toFixed(1)}% compared to last month. Great job on collections!`,
      icon: TrendingUp,
      priority: 1,
    });
  } else if (monthlyChange < -10) {
    insights.push({
      id: 'revenue-decline',
      type: 'warning',
      title: 'Revenue Decline',
      description: `Revenue decreased by ${Math.abs(monthlyChange).toFixed(1)}% compared to last month. Consider reviewing collection processes.`,
      icon: TrendingDown,
      priority: 2,
    });
  }

  // Payment Frequency Insight
  const avgDaysBetweenPayments = analytics.totalPayments > 1
    ? 30 / (analytics.currentMonthPayments || 1)
    : 30;

  if (avgDaysBetweenPayments <= 30 && analytics.currentMonthPayments > 0) {
    insights.push({
      id: 'regular-payments',
      type: 'success',
      title: 'Consistent Payment Schedule',
      description: 'Tenants are making regular monthly payments. Your collection process is working well.',
      icon: CheckCircle,
      priority: 3,
    });
  }

  // Late Payment Detection
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lateThreshold = new Date(now.getFullYear(), now.getMonth(), 5); // 5th of month

  const currentMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.date);
    return paymentDate >= firstOfMonth;
  });

  const latePayments = currentMonthPayments.filter(p => {
    const paymentDate = new Date(p.date);
    return isAfter(paymentDate, lateThreshold);
  });

  if (latePayments.length > 0) {
    insights.push({
      id: 'late-payments',
      type: 'alert',
      title: 'Late Payments Detected',
      description: `${latePayments.length} payment(s) were received after the 5th of the month. Consider implementing late fee policies.`,
      icon: Clock,
      priority: 1,
      action: {
        label: 'Review Late Policies',
        onClick: () => {
          // Could navigate to settings or policies page
          console.log('Navigate to late payment policies');
        },
      },
    });
  }

  // Collection Efficiency
  const totalExpectedRent = properties.reduce((sum, property) => {
    return sum + (property.units?.reduce((unitSum: number, unit: Unit) => {
      return unitSum + (unit.status === 'OCCUPIED' ? Number(unit.rent) : 0);
    }, 0) ?? 0);
  }, 0);

  const collectionRate = totalExpectedRent > 0
    ? (analytics.currentMonthAmount / totalExpectedRent) * 100
    : 0;

  if (collectionRate >= 95) {
    insights.push({
      id: 'excellent-collection',
      type: 'success',
      title: 'Excellent Collection Rate',
      description: `You've collected ${collectionRate.toFixed(1)}% of expected rent this month. Outstanding performance!`,
      icon: Target,
      priority: 2,
    });
  } else if (collectionRate < 80) {
    insights.push({
      id: 'low-collection',
      type: 'warning',
      title: 'Low Collection Rate',
      description: `Only ${collectionRate.toFixed(1)}% of expected rent collected this month. Follow up with tenants may be needed.`,
      icon: AlertTriangle,
      priority: 1,
      action: {
        label: 'Review Outstanding Rent',
        onClick: () => {
          console.log('Navigate to outstanding rent report');
        },
      },
    });
  }

  // Payment Type Analysis
  const rentPayments = analytics.paymentTypes['RENT'] || 0;
  const totalPayments = analytics.totalAmount;
  const rentPercentage = totalPayments > 0 ? (rentPayments / totalPayments) * 100 : 0;

  if (rentPercentage < 70) {
    insights.push({
      id: 'non-rent-payments',
      type: 'info',
      title: 'High Non-Rent Payments',
      description: `${(100 - rentPercentage).toFixed(1)}% of payments are fees or deposits. Monitor for potential issues.`,
      icon: DollarSign,
      priority: 3,
    });
  }

  // Average Payment Analysis
  const avgPayment = analytics.totalPayments > 0
    ? analytics.totalAmount / analytics.totalPayments
    : 0;
  const expectedAvgRent = totalExpectedRent / Math.max(properties.reduce((sum, p) => sum + (p.units?.length || 0), 0), 1);

  if (avgPayment > expectedAvgRent * 1.1) {
    insights.push({
      id: 'high-avg-payment',
      type: 'info',
      title: 'Above Average Payments',
      description: `Average payment of ${formatCurrency(avgPayment, { maximumFractionDigits: 0 })} is higher than expected. This could indicate advance payments or extra fees.`,
      icon: TrendingUp,
      priority: 4,
    });
  }

  // Seasonal Insights
  const currentMonth = now.getMonth();
  if (currentMonth === 11 || currentMonth === 0) { // December or January
    insights.push({
      id: 'holiday-season',
      type: 'info',
      title: 'Holiday Season Reminder',
      description: 'Payment patterns may change during holidays. Consider sending friendly reminders to tenants.',
      icon: Calendar,
      priority: 4,
    });
  }

  // Property Performance Comparison (if multiple properties)
  if (properties.length > 1 && !propertyId) {
    const propertyPerformance = properties.map(property => {
      const propertyPayments = payments.filter(payment => {
        const lease = Array.isArray(payment.lease) ? payment.lease[0] : payment.lease;
        const unit = Array.isArray(lease?.unit) ? lease.unit[0] : lease?.unit;
        const paymentProperty = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
        return paymentProperty?.id === property.id;
      });

      const propertyRevenue = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
      return { property, revenue: propertyRevenue, paymentCount: propertyPayments.length };
    }).sort((a, b) => b.revenue - a.revenue);

    if (propertyPerformance.length > 0) {
      const topProperty = propertyPerformance[0];
      const bottomProperty = propertyPerformance[propertyPerformance.length - 1];

      if (topProperty.revenue > bottomProperty.revenue * 1.5) {
        insights.push({
          id: 'property-performance',
          type: 'info',
          title: 'Property Performance Variance',
          description: `${topProperty.property.name} is generating significantly more revenue than ${bottomProperty.property.name}. Review occupancy and pricing strategies.`,
          icon: Building,
          priority: 3,
        });
      }
    }
  }

  // Sort insights by priority and type
  const sortedInsights = insights.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const typeOrder = { alert: 0, warning: 1, success: 2, info: 3 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  const getInsightVariant = (type: string) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'alert': return 'destructive';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'alert': return Bell;
      case 'info': return Lightbulb;
      default: return Lightbulb;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Payment Insights & Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered insights to help optimize your payment collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedInsights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Good!</h3>
            <p className="text-muted-foreground">
              Your payment collection is performing well. Keep up the great work!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInsights.map((insight, index) => {
              const IconComponent = insight.icon;
              const AlertIcon = getInsightIcon(insight.type);

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Alert className={`border-l-4 ${
                    insight.type === 'success' ? 'border-l-green-500 bg-green-50' :
                    insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                    insight.type === 'alert' ? 'border-l-red-500 bg-red-50' :
                    'border-l-blue-500 bg-blue-50'
                  }`}>
                    <AlertIcon className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {insight.title}
                      </div>
                      <Badge variant={getInsightVariant(insight.type)} className="text-xs">
                        {insight.type.toUpperCase()}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-3">{insight.description}</p>
                      {insight.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={insight.action.onClick}
                          className="flex items-center gap-1"
                        >
                          {insight.action.label}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Stats Summary */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quick Performance Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{formatCurrency(analytics.currentMonthAmount)}</div>
              <div className="text-muted-foreground">This Month</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{analytics.currentMonthPayments}</div>
              <div className="text-muted-foreground">Payments</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">
                {collectionRate > 0 ? `${collectionRate.toFixed(0)}%` : 'N/A'}
              </div>
              <div className="text-muted-foreground">Collection Rate</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">
                {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(0)}%
              </div>
              <div className="text-muted-foreground">Monthly Change</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
