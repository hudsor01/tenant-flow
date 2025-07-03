import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsListEnhanced, TabsTriggerWithIcon } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Receipt,
  Building,
  Calendar,
  BarChart3,
  FileText,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useProperties } from '@/hooks/useApiProperties';
import { usePaymentStats } from '@/hooks/useApiPayments';
import PaymentAnalytics from '@/components/payments/PaymentAnalytics';
import PaymentReports from '@/components/payments/PaymentReports';
import PaymentInsights from '@/components/payments/PaymentInsights';
import PaymentsList from '@/components/payments/PaymentsList';
import AdvancedFinancialAnalytics from '@/components/financial/AdvancedFinancialAnalytics';
import { HeaderSidebarToggle } from '@/components/ui/sidebar-toggle';
import { FinancialDataEmptyState, AnalyticsEmptyState, InsightsEmptyState, ReportsEmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatPercentage, formatNumber, getCollectionRateStatus } from '@/utils/currency';

interface DashboardStatProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  changeIcon?: React.ReactNode;
  icon: React.ElementType;
  delay: number;
  trend?: number;
}

const DashboardStat: React.FC<DashboardStatProps> = ({
  title,
  value,
  change,
  icon: Icon,
  delay,
  trend
}) => {
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (trend < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'text-muted-foreground';
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="relative overflow-hidden h-32 sm:h-36 md:h-[140px]">
        <CardContent className="p-6 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="space-y-2 flex-1">
              <p className="stat-label">{title}</p>
              <p className="stat-value">{value}</p>
              {change && (
                <div className={`flex items-center gap-1 text-caption font-medium ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="truncate">{change}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl flex-shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
        
        {/* Subtle background gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-2xl" />
      </Card>
    </motion.div>
  );
};

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: properties = [] } = useProperties();
  const { data: analytics } = usePaymentStats();

  // Calculate key metrics with consistent formatting
  const totalRevenue = analytics?.totalAmount || 0;
  const monthlyRevenue = analytics?.currentMonthAmount || 0;
  const totalPayments = analytics?.totalPayments || 0;
  const monthlyPayments = analytics?.currentMonthPayments || 0;

  // Calculate changes
  const monthlyChange = analytics?.lastMonthAmount && analytics.lastMonthAmount > 0
    ? ((analytics.currentMonthAmount - analytics.lastMonthAmount) / analytics.lastMonthAmount) * 100
    : 0;

  // Calculate collection rate
  const expectedRevenue = properties.reduce((sum, property) => {
    return sum + (property.units?.reduce((unitSum, unit) => {
      return unitSum + (unit.status === 'OCCUPIED' ? unit.rent : 0);
    }, 0) || 0);
  }, 0);

  const collectionRate = expectedRevenue > 0 ? Math.min(100, (monthlyRevenue / expectedRevenue) * 100) : 0;
  const collectionStatus = getCollectionRateStatus(collectionRate);

  // Calculate average payment amount
  const avgPaymentAmount = totalPayments > 0 ? totalRevenue / totalPayments : 0;

  // Check if we have financial data
  const hasFinancialData = totalRevenue > 0 || totalPayments > 0;

  const handleAddPayment = () => {
    // Navigate to payments section to add new payment
    navigate('/payments');
  };

  const handleSetupProperties = () => {
    // Navigate to properties page to set up first property
    navigate('/properties');
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-1">
      {/* Header with Sidebar Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <HeaderSidebarToggle 
            isCollapsed={sidebarCollapsed}
            onToggle={setSidebarCollapsed}
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your rental income, payments, and financial performance
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(property => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Premium Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Tabs defaultValue="analytics" className="space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden rounded-2xl bg-card/90 p-2 shadow-lg shadow-black/5 border border-border/50 backdrop-blur-sm">
            <TabsListEnhanced 
              variant="premium" 
              className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-transparent p-0 h-auto gap-1"
            >
              <TabsTriggerWithIcon 
                value="analytics"
                icon={<BarChart3 className="h-5 w-5" />}
                label="Analytics"
              />
              <TabsTriggerWithIcon 
                value="advanced"
                icon={<Target className="h-5 w-5" />}
                label="Advanced"
              />
              <TabsTriggerWithIcon 
                value="insights"
                icon={<Lightbulb className="h-5 w-5" />}
                label="Insights"
              />
              <TabsTriggerWithIcon 
                value="reports"
                icon={<FileText className="h-5 w-5" />}
                label="Reports"
              />
              <TabsTriggerWithIcon 
                value="payments"
                icon={<Receipt className="h-5 w-5" />}
                label="Payments"
              />
            </TabsListEnhanced>
          </div>

          {/* Key Metrics with Consistent Formatting */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardStat
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={DollarSign}
              delay={0.3}
            />
            <DashboardStat
              title="This Month"
              value={formatCurrency(monthlyRevenue)}
              change={monthlyChange ? `${formatPercentage(Math.abs(monthlyChange))} from last month` : undefined}
              changeType={monthlyChange > 0 ? 'positive' : monthlyChange < 0 ? 'negative' : 'neutral'}
              trend={monthlyChange}
              icon={Calendar}
              delay={0.4}
            />
            <DashboardStat
              title="Total Payments"
              value={formatNumber(totalPayments)}
              change={`${formatNumber(monthlyPayments)} this month`}
              icon={Receipt}
              delay={0.5}
            />
            <DashboardStat
              title="Collection Rate"
              value={formatPercentage(collectionRate)}
              change={collectionStatus.status}
              changeType={collectionRate >= 85 ? 'positive' : collectionRate >= 70 ? 'neutral' : 'negative'}
              icon={Target}
              delay={0.6}
            />
          </div>

          {/* Analytics Tab - Unique Content */}
          <TabsContent value="analytics" className="space-y-6">
            {hasFinancialData ? (
              <PaymentAnalytics
                propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                title="Revenue Analytics"
                description="Detailed analysis of your rental income and payment trends"
              />
            ) : (
              <AnalyticsEmptyState onSetupProperties={handleSetupProperties} />
            )}
          </TabsContent>

          {/* Advanced Analytics Tab - New Enhanced Features */}
          <TabsContent value="advanced" className="space-y-6">
            {hasFinancialData ? (
              <AdvancedFinancialAnalytics
                propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
              />
            ) : (
              <AnalyticsEmptyState onSetupProperties={handleSetupProperties} />
            )}
          </TabsContent>

          {/* Insights Tab - Unique Content */}
          <TabsContent value="insights" className="space-y-6">
            {hasFinancialData ? (
              <>
                <PaymentInsights
                  propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                />
                
                {/* Performance Metrics Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                    <CardDescription>
                      Key performance indicators for your portfolio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <div className="text-2xl font-bold text-foreground">
                          {formatCurrency(avgPaymentAmount)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Average Payment</div>
                      </div>
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <div className="text-2xl font-bold text-foreground">
                          {formatNumber(properties.length)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Active Properties</div>
                      </div>
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <div className="text-2xl font-bold text-foreground">
                          {formatNumber(properties.reduce((sum, p) => sum + (p.units?.filter(u => u.status === 'OCCUPIED').length || 0), 0))}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Occupied Units</div>
                      </div>
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <div className="text-2xl font-bold text-foreground">
                          {formatPercentage((properties.reduce((sum, p) => sum + (p.units?.filter(u => u.status === 'OCCUPIED').length || 0), 0) / 
                            properties.reduce((sum, p) => sum + (p.units?.length || 0), 0)) * 100 || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Occupancy Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <InsightsEmptyState />
            )}
          </TabsContent>

          {/* Reports Tab - Unique Content */}
          <TabsContent value="reports" className="space-y-6">
            {hasFinancialData ? (
              <>
                <PaymentReports
                  propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                />
                
                {/* Property Performance Overview - Only on Reports Tab */}
                {properties.length > 1 && selectedProperty === 'all' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Property Performance Overview
                      </CardTitle>
                      <CardDescription>
                        Comparative analysis across all your properties
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {properties.slice(0, 6).map((property, index) => {
                          const occupiedUnits = property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0;
                          const totalUnits = property.units?.length || 0;
                          const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
                          const monthlyRent = property.units?.reduce((sum, unit) => {
                            return sum + (unit.status === 'OCCUPIED' ? unit.rent : 0);
                          }, 0) || 0;

                          return (
                            <motion.div
                              key={property.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.8 + index * 0.1 }}
                            >
                              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold truncate">{property.name}</h4>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Occupancy</span>
                                        <span className="font-medium">{formatPercentage(occupancyRate)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monthly Rent</span>
                                        <span className="font-medium">{formatCurrency(monthlyRent)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Units</span>
                                        <span className="font-medium">{occupiedUnits}/{totalUnits}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <ReportsEmptyState />
            )}
          </TabsContent>

          {/* Payments Tab - Unique Content */}
          <TabsContent value="payments" className="space-y-6">
            {hasFinancialData ? (
              <PaymentsList
                propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                showAddButton={true}
                title="Payment History"
                description="Complete transaction history across your properties"
              />
            ) : (
              <FinancialDataEmptyState onAddPayment={handleAddPayment} />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}