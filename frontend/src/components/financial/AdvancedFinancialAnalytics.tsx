import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Line,
  AreaChart,
  Area,
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
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  BarChart3,
  Download,
  Lightbulb,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { formatCurrency, formatPercentage } from '@/utils/currency';
import FinancialBenchmarking from './FinancialBenchmarking';

interface AdvancedFinancialAnalyticsProps {
  propertyId?: string;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'];

export default function AdvancedFinancialAnalytics({ propertyId }: AdvancedFinancialAnalyticsProps) {
  
  const {
    cashFlowProjections,
    revenueStreams,
    expenseCategories,
    financialKPIs,
    propertyComparisons,
    financialInsights,
    isLoading,
  } = useFinancialAnalytics(propertyId);

  const handleExportReport = () => {
    // TODO: Implement PDF export functionality
    // This will trigger PDF generation when implemented
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Financial Analytics</h2>
          <p className="text-muted-foreground">
            Deep insights into your portfolio's financial performance and projections
          </p>
        </div>
        <Button 
          onClick={handleExportReport} 
          variant="outline" 
          className="gap-2"
          aria-label="Export financial report as PDF"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Report
        </Button>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {financialKPIs.map((kpi, index) => (
          <motion.div
            key={kpi.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-muted-foreground">{kpi.name}</div>
                  <Badge variant={
                    kpi.status === 'on-track' ? 'default' : 
                    kpi.status === 'at-risk' ? 'secondary' : 'destructive'
                  }>
                    {kpi.status}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Target: {kpi.target}</span>
                  {kpi.trend === 'improving' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {kpi.trend === 'declining' && <TrendingDown className="h-4 w-4 text-red-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Financial Insights Alert Panel */}
      {financialInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Financial Insights & Recommendations
            </CardTitle>
            <CardDescription>
              Smart insights based on your portfolio's financial data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {financialInsights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.severity === 'critical' ? 'bg-red-50 border-red-500' :
                    insight.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {insight.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />}
                    {insight.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                    {insight.severity === 'info' && <Info className="h-5 w-5 text-blue-600 mt-0.5" />}
                    <div className="flex-1">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <div className="text-sm">
                        <div className="font-medium">Impact: {insight.impact}</div>
                        <div className="text-muted-foreground">Recommendation: {insight.recommendation}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="projections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projections" className="gap-2">
            <Calendar className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Target className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Benchmarks
          </TabsTrigger>
        </TabsList>

        {/* Cash Flow Projections */}
        <TabsContent value="projections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>12-Month Cash Flow Projections</CardTitle>
              <CardDescription>
                Projected income, expenses, and net cash flow based on current trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowProjections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="projectedIncome"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Projected Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="projectedExpenses"
                      stackId="2"
                      stroke="#ff7300"
                      fill="#ff7300"
                      fillOpacity={0.6}
                      name="Projected Expenses"
                    />
                    <Line
                      type="monotone"
                      dataKey="netCashFlow"
                      stroke="#00ff00"
                      strokeWidth={3}
                      name="Net Cash Flow"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Confidence Indicators */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium">High Confidence</div>
                  <div className="text-xs text-muted-foreground">Months 1-3</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Medium Confidence</div>
                  <div className="text-xs text-muted-foreground">Months 4-6</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Low Confidence</div>
                  <div className="text-xs text-muted-foreground">Months 7-12</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Analysis */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Streams</CardTitle>
                <CardDescription>Breakdown of income sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueStreams}
                        dataKey="amount"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ source, percentage }) => `${source}: ${percentage.toFixed(1)}%`}
                      >
                        {revenueStreams.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Month-over-month and year-over-year growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueStreams.map((stream) => (
                    <div key={stream.source} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{stream.source}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={stream.trend === 'growing' ? 'default' : stream.trend === 'declining' ? 'destructive' : 'secondary'}>
                            {stream.trend}
                          </Badge>
                          {stream.monthOverMonth > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        MoM: {formatPercentage(Math.abs(stream.monthOverMonth))}, 
                        YoY: {formatPercentage(Math.abs(stream.yearOverYear))}
                      </div>
                      <Progress value={stream.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expense Analysis */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Operating expenses breakdown and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseCategories}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="category" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Monthly Amount']} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                  {expenseCategories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <Badge variant={
                          category.trend === 'increasing' ? 'destructive' : 
                          category.trend === 'decreasing' ? 'default' : 'secondary'
                        }>
                          {category.trend}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Monthly: {formatCurrency(category.avgMonthly)} • 
                        Annual: {formatCurrency(category.projectedAnnual)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Performance Comparison */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Performance Comparison</CardTitle>
              <CardDescription>
                Comparative analysis of all properties in your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyComparisons.map((property) => (
                  <div key={property.propertyId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{property.propertyName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Performance Score:</span>
                        <Badge variant={property.performanceScore > 80 ? 'default' : property.performanceScore > 60 ? 'secondary' : 'destructive'}>
                          {property.performanceScore.toFixed(0)}/100
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Revenue</div>
                        <div className="text-muted-foreground">{formatCurrency(property.revenue)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Net Income</div>
                        <div className="text-muted-foreground">{formatCurrency(property.netIncome)}</div>
                      </div>
                      <div>
                        <div className="font-medium">ROI</div>
                        <div className="text-muted-foreground">{formatPercentage(property.roi)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Occupancy</div>
                        <div className="text-muted-foreground">{formatPercentage(property.occupancyRate)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Avg Rent</div>
                        <div className="text-muted-foreground">{formatCurrency(property.avgRentPerUnit)}</div>
                      </div>
                    </div>
                    
                    <Progress value={property.performanceScore} className="mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Benchmarking */}
        <TabsContent value="benchmarks" className="space-y-6">
          <FinancialBenchmarking />
        </TabsContent>
      </Tabs>
    </div>
  );
}