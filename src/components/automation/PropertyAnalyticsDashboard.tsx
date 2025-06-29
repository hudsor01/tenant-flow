import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePropertyAnalytics } from '@/hooks/usePropertyAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  TrendingUp, 
  TrendingDown,
  Building2,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Mail,
  Calendar,
  Target,
  Zap,
  Home,
  Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const alertSeverityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critical: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const alertTypeConfig = {
  occupancy_drop: { icon: Users, label: 'Occupancy Drop' },
  maintenance_spike: { icon: Wrench, label: 'Maintenance Spike' },
  revenue_decline: { icon: DollarSign, label: 'Revenue Decline' },
  tenant_turnover: { icon: Users, label: 'High Turnover' },
  expense_increase: { icon: TrendingUp, label: 'Expense Increase' },
};

export default function PropertyAnalyticsDashboard() {
  const { 
    propertyMetrics, 
    propertyAlerts, 
    portfolioSummary,
    isLoading, 
    sendAnalyticsReport,
    isSendingReport 
  } = usePropertyAnalytics();
  
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  const handleSendReport = (reportType: 'weekly' | 'monthly' | 'custom') => {
    sendAnalyticsReport(reportType);
    toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} analytics report sent!`);
  };

  const toggleExpanded = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const getPerformanceColor = (value: number, type: 'occupancy' | 'capRate' | 'efficiency') => {
    switch (type) {
      case 'occupancy':
        return value >= 90 ? 'text-green-600' : value >= 80 ? 'text-yellow-600' : 'text-red-600';
      case 'capRate':
        return value >= 6 ? 'text-green-600' : value >= 4 ? 'text-yellow-600' : 'text-red-600';
      case 'efficiency':
        return value >= 85 ? 'text-green-600' : value >= 75 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceIcon = (value: number, type: 'occupancy' | 'capRate' | 'efficiency') => {
    const isGood = (type === 'occupancy' && value >= 85) || 
                   (type === 'capRate' && value >= 5) || 
                   (type === 'efficiency' && value >= 80);
    return isGood ? TrendingUp : TrendingDown;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Portfolio Summary</span>
              </div>
              <div className="text-2xl font-bold">{portfolioSummary.totalProperties}</div>
              <div className="text-sm text-muted-foreground">
                {portfolioSummary.totalUnits} total units
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Occupancy Rate</span>
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(portfolioSummary.overallOccupancyRate, 'occupancy')}`}>
                {portfolioSummary.overallOccupancyRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Portfolio average
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-muted-foreground">Monthly Revenue</span>
              </div>
              <div className="text-2xl font-bold">${portfolioSummary.totalMonthlyRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                ${(portfolioSummary.totalMonthlyRevenue * 12).toLocaleString()} annually
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Portfolio ROI</span>
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(portfolioSummary.portfolioROI, 'capRate')}`}>
                {portfolioSummary.portfolioROI.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Cap rate average
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts Section */}
      {propertyAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Property Alerts ({propertyAlerts.length})
                </CardTitle>
                <CardDescription>
                  Performance issues requiring attention
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-orange-600">
                {portfolioSummary.criticalAlerts} critical
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {propertyAlerts.slice(0, 5).map((alert) => {
                const severityStyle = alertSeverityConfig[alert.severity];
                const typeConfig = alertTypeConfig[alert.alertType];
                const Icon = typeConfig.icon;
                
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.title}</span>
                          <Badge className={severityStyle.color}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {alert.propertyName} • {alert.description}
                        </div>
                      </div>
                    </div>
                    {alert.actionRequired && (
                      <Badge variant="outline" className="text-red-600">
                        Action Required
                      </Badge>
                    )}
                  </div>
                );
              })}
              {propertyAlerts.length > 5 && (
                <div className="text-center pt-3">
                  <Button variant="outline" size="sm">
                    View All {propertyAlerts.length} Alerts
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Performance Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property Performance
              </CardTitle>
              <CardDescription>
                Detailed metrics for each property in your portfolio
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendReport('weekly')}
                disabled={isSendingReport}
              >
                <Mail className="h-4 w-4 mr-2" />
                Weekly Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendReport('monthly')}
                disabled={isSendingReport}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Monthly Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {propertyMetrics.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No properties found</h3>
              <p className="text-sm text-muted-foreground">
                Add properties to your portfolio to see analytics and insights.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {propertyMetrics.map((property) => {
                const isExpanded = expandedProperty === property.propertyId;
                const OccupancyIcon = getPerformanceIcon(property.occupancyRate, 'occupancy');
                const CapRateIcon = getPerformanceIcon(property.capRate, 'capRate');
                
                return (
                  <motion.div
                    key={property.propertyId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Collapsible>
                      <div className="rounded-lg border bg-white">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{property.propertyName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{property.propertyName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {property.propertyAddress} • {property.totalUnits} units
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-6">
                              <div className="text-center">
                                <div className={`flex items-center gap-1 ${getPerformanceColor(property.occupancyRate, 'occupancy')}`}>
                                  <OccupancyIcon className="h-4 w-4" />
                                  <span className="font-medium">{property.occupancyRate.toFixed(1)}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground">Occupancy</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium">${property.totalMonthlyRevenue.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Revenue</div>
                              </div>
                              <div className="text-center">
                                <div className={`flex items-center gap-1 ${getPerformanceColor(property.capRate, 'capRate')}`}>
                                  <CapRateIcon className="h-4 w-4" />
                                  <span className="font-medium">{property.capRate.toFixed(1)}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground">Cap Rate</div>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(property.propertyId)}
                                >
                                  {isExpanded ? 'Less' : 'More'}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t border-border/50">
                            <div className="grid md:grid-cols-3 gap-6 mt-4">
                              <div>
                                <h4 className="font-medium text-sm mb-3">📊 Financial Metrics</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Avg Rent/Unit:</span>
                                    <span className="font-medium">${property.avgRentPerUnit.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Revenue Efficiency:</span>
                                    <span className={`font-medium ${getPerformanceColor(property.revenueEfficiency, 'efficiency')}`}>
                                      {property.revenueEfficiency.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Net Income:</span>
                                    <span className="font-medium">${property.netOperatingIncome.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Profit Margin:</span>
                                    <span className="font-medium">{property.profitMargin.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-sm mb-3">👥 Tenant Metrics</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Occupied Units:</span>
                                    <span className="font-medium">{property.occupiedUnits}/{property.totalUnits}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Avg Tenancy:</span>
                                    <span className="font-medium">{property.avgTenancyLength.toFixed(1)} months</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Turnover Rate:</span>
                                    <span className={`font-medium ${property.turnoverRate > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                      {property.turnoverRate.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Satisfaction:</span>
                                    <span className="font-medium">{property.tenantSatisfactionScore.toFixed(1)}/5.0</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium text-sm mb-3">🔧 Maintenance</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Requests (3mo):</span>
                                    <span className="font-medium">{property.maintenanceRequestsCount}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Response Time:</span>
                                    <span className="font-medium">{property.avgMaintenanceResponseTime.toFixed(1)}h</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cost/Unit:</span>
                                    <span className="font-medium">${property.maintenanceCostPerUnit.toFixed(0)}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Last updated: {format(new Date(property.lastUpdated), 'MMM dd, HH:mm')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performer Highlight */}
      {portfolioSummary.topPerformingProperty && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Zap className="h-5 w-5" />
              Top Performer: {portfolioSummary.topPerformingProperty}
            </CardTitle>
            <CardDescription>
              This property is leading your portfolio in overall performance metrics
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}