import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatPercentage } from '@/utils/currency';

interface BenchmarkMetric {
  metric: string;
  yourValue: number;
  industryAverage: number;
  topQuartile: number;
  unit: 'percentage' | 'currency' | 'ratio' | 'days';
  status: 'excellent' | 'good' | 'average' | 'below-average' | 'poor';
  description: string;
}


// Mock benchmark data - in real implementation, this would come from industry data APIs
const getBenchmarkData = (): BenchmarkMetric[] => [
  {
    metric: 'Gross Rental Yield',
    yourValue: 8.5,
    industryAverage: 7.2,
    topQuartile: 9.5,
    unit: 'percentage',
    status: 'good',
    description: 'Annual rental income as percentage of property value',
  },
  {
    metric: 'Operating Expense Ratio',
    yourValue: 35,
    industryAverage: 40,
    topQuartile: 30,
    unit: 'percentage',
    status: 'good',
    description: 'Operating expenses as percentage of gross rental income',
  },
  {
    metric: 'Vacancy Rate',
    yourValue: 4.2,
    industryAverage: 6.8,
    topQuartile: 3.0,
    unit: 'percentage',
    status: 'good',
    description: 'Percentage of units vacant over the year',
  },
  {
    metric: 'Tenant Turnover Rate',
    yourValue: 25,
    industryAverage: 35,
    topQuartile: 20,
    unit: 'percentage',
    status: 'good',
    description: 'Annual tenant turnover percentage',
  },
  {
    metric: 'Average Days to Lease',
    yourValue: 18,
    industryAverage: 28,
    topQuartile: 14,
    unit: 'days',
    status: 'good',
    description: 'Average time to lease vacant units',
  },
  {
    metric: 'Maintenance Cost per Unit',
    yourValue: 1200,
    industryAverage: 1500,
    topQuartile: 900,
    unit: 'currency',
    status: 'good',
    description: 'Annual maintenance and repair costs per unit',
  },
  {
    metric: 'Debt Service Coverage Ratio',
    yourValue: 1.45,
    industryAverage: 1.25,
    topQuartile: 1.60,
    unit: 'ratio',
    status: 'good',
    description: 'Net operating income divided by debt service',
  },
  {
    metric: 'Cash-on-Cash Return',
    yourValue: 12.3,
    industryAverage: 8.5,
    topQuartile: 15.0,
    unit: 'percentage',
    status: 'good',
    description: 'Annual pre-tax cash flow relative to cash invested',
  },
];

export default function FinancialBenchmarking(): JSX.Element {
  const benchmarkData = getBenchmarkData();

  const formatValue = (value: number, unit: BenchmarkMetric['unit']): string => {
    switch (unit) {
      case 'percentage':
        return formatPercentage(value);
      case 'currency':
        return formatCurrency(value);
      case 'ratio':
        return value.toFixed(2);
      case 'days':
        return `${value} days`;
      default:
        return value.toString();
    }
  };

  const getStatusIcon = (status: BenchmarkMetric['status']) => {
    switch (status) {
      case 'excellent':
        return <Award className="h-5 w-5 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'average':
        return <Target className="h-5 w-5 text-yellow-500" />;
      case 'below-average':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'poor':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: BenchmarkMetric['status']): string => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 border-green-200';
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'average':
        return 'bg-yellow-50 border-yellow-200';
      case 'below-average':
        return 'bg-orange-50 border-orange-200';
      case 'poor':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressValue = (metric: BenchmarkMetric): number => {
    const range = metric.topQuartile;
    return Math.min(100, (metric.yourValue / range) * 100);
  };

  // Prepare data for radar chart
  const radarData = benchmarkData.slice(0, 6).map(metric => ({
    metric: metric.metric.replace(' ', '\n'),
    yourPerformance: (metric.yourValue / metric.topQuartile) * 100,
    industryAverage: (metric.industryAverage / metric.topQuartile) * 100,
  }));

  // Prepare data for comparison chart
  const comparisonData = benchmarkData.map(metric => ({
    metric: metric.metric,
    'Your Portfolio': metric.yourValue,
    'Industry Average': metric.industryAverage,
    'Top Quartile': metric.topQuartile,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financial Benchmarking</h2>
        <p className="text-muted-foreground">
          Compare your portfolio performance against industry standards for {propertyType} properties in {location} markets
        </p>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {benchmarkData.filter(m => m.status === 'excellent' || m.status === 'good').length}
            </div>
            <div className="text-sm text-muted-foreground">Metrics Above Average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {benchmarkData.filter(m => m.status === 'average').length}
            </div>
            <div className="text-sm text-muted-foreground">Metrics At Average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {benchmarkData.filter(m => m.status === 'below-average' || m.status === 'poor').length}
            </div>
            <div className="text-sm text-muted-foreground">Metrics Below Average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {((benchmarkData.filter(m => m.status === 'excellent' || m.status === 'good').length / benchmarkData.length) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Overall Performance</div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Radar</CardTitle>
          <CardDescription>
            Visual comparison of key metrics against industry benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 120]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar
                  name="Your Portfolio"
                  dataKey="yourPerformance"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Industry Average"
                  dataKey="industryAverage"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Benchmark Analysis</CardTitle>
          <CardDescription>
            Comprehensive comparison of your performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {benchmarkData.map((metric, index) => (
              <motion.div
                key={metric.metric}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(metric.status)}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{metric.metric}</h4>
                      <Badge variant={
                        metric.status === 'excellent' || metric.status === 'good' ? 'default' :
                        metric.status === 'average' ? 'secondary' : 'destructive'
                      }>
                        {metric.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Your Value</div>
                        <div className="text-lg font-bold">{formatValue(metric.yourValue, metric.unit)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Industry Average</div>
                        <div className="text-muted-foreground">{formatValue(metric.industryAverage, metric.unit)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Top Quartile</div>
                        <div className="text-muted-foreground">{formatValue(metric.topQuartile, metric.unit)}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Performance vs Top Quartile</span>
                        <span>{getProgressValue(metric).toFixed(0)}%</span>
                      </div>
                      <Progress value={getProgressValue(metric)} className="h-2" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Comparison Chart</CardTitle>
          <CardDescription>
            Side-by-side comparison of all benchmark metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey="metric" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="Your Portfolio" fill="#8884d8" />
                <Bar dataKey="Industry Average" fill="#82ca9d" />
                <Bar dataKey="Top Quartile" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}