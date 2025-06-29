import { useQuery } from '@tanstack/react-query';
import { subMonths, format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { usePaymentAnalytics } from './usePayments';
import { usePropertyAnalytics } from './usePropertyAnalytics';

interface CashFlowProjection {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  confidence: 'high' | 'medium' | 'low';
  assumptions: string[];
}

interface RevenueStream {
  source: string;
  amount: number;
  percentage: number;
  trend: 'growing' | 'stable' | 'declining';
  monthOverMonth: number;
  yearOverYear: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  avgMonthly: number;
  projectedAnnual: number;
}

interface FinancialKPI {
  name: string;
  value: number | string;
  target: number | string;
  status: 'on-track' | 'at-risk' | 'off-track';
  trend: 'improving' | 'stable' | 'declining';
  description: string;
}

interface PropertyComparison {
  propertyId: string;
  propertyName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  roi: number;
  occupancyRate: number;
  avgRentPerUnit: number;
  maintenanceCostRatio: number;
  performanceScore: number;
}

interface FinancialInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  value?: number;
  relatedProperties?: string[];
  createdAt: string;
}

export function useFinancialAnalytics(propertyId?: string) {
  const { user } = useAuthStore();
  const { data: paymentAnalytics } = usePaymentAnalytics(propertyId);
  const { propertyMetrics, portfolioSummary } = usePropertyAnalytics();

  // Generate cash flow projections
  const { data: cashFlowProjections = [] } = useQuery({
    queryKey: ['cashFlowProjections', user?.id, propertyId],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const projections: CashFlowProjection[] = [];
      const currentDate = new Date();
      let cumulativeCashFlow = 0;

      // Project for next 12 months
      for (let i = 0; i < 12; i++) {
        const projectionDate = subMonths(currentDate, -i);
        const monthStr = format(projectionDate, 'yyyy-MM');

        // Get historical data for trend analysis
        const historicalRevenue = paymentAnalytics?.monthlyData[format(subMonths(projectionDate, 12), 'yyyy-MM')]?.amount || 0;
        const currentRevenue = paymentAnalytics?.currentMonthAmount || 0;

        // Calculate growth rate
        const growthRate = historicalRevenue > 0 
          ? ((currentRevenue - historicalRevenue) / historicalRevenue) / 12 
          : 0.02; // Default 2% monthly growth

        // Project income based on current occupancy and historical trends
        const baseIncome = propertyMetrics
          .filter(p => !propertyId || p.propertyId === propertyId)
          .reduce((sum, p) => sum + p.totalMonthlyRevenue, 0);
        
        const projectedIncome = baseIncome * Math.pow(1 + growthRate, i);

        // Project expenses (typically 30-40% of revenue for well-managed properties)
        const expenseRatio = 0.35; // 35% expense ratio
        const projectedExpenses = projectedIncome * expenseRatio;

        const netCashFlow = projectedIncome - projectedExpenses;
        cumulativeCashFlow += netCashFlow;

        // Determine confidence based on projection distance
        let confidence: CashFlowProjection['confidence'] = 'high';
        if (i > 6) confidence = 'low';
        else if (i > 3) confidence = 'medium';

        projections.push({
          month: monthStr,
          projectedIncome,
          projectedExpenses,
          netCashFlow,
          cumulativeCashFlow,
          confidence,
          assumptions: [
            `${(growthRate * 100).toFixed(1)}% monthly growth rate`,
            `${(expenseRatio * 100).toFixed(0)}% expense ratio`,
            'Current occupancy rates maintained',
            'No major capital expenditures',
          ],
        });
      }

      return projections;
    },
    enabled: !!user?.id && !!paymentAnalytics && propertyMetrics.length > 0,
  });

  // Analyze revenue streams
  const { data: revenueStreams = [] } = useQuery({
    queryKey: ['revenueStreams', user?.id, propertyId],
    queryFn: async () => {
      if (!paymentAnalytics) return [];

      const totalRevenue = paymentAnalytics.totalAmount;
      const streams: RevenueStream[] = [];

      // Analyze by payment type
      Object.entries(paymentAnalytics.paymentTypes).forEach(([type, amount]) => {
        const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
        
        // Calculate trends (mock data for now)
        const monthOverMonth = Math.random() * 20 - 10; // -10% to +10%
        const yearOverYear = Math.random() * 40 - 20; // -20% to +20%

        streams.push({
          source: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          amount,
          percentage,
          trend: monthOverMonth > 5 ? 'growing' : monthOverMonth < -5 ? 'declining' : 'stable',
          monthOverMonth,
          yearOverYear,
        });
      });

      return streams.sort((a, b) => b.amount - a.amount);
    },
    enabled: !!paymentAnalytics,
  });

  // Calculate expense categories
  const { data: expenseCategories = [] } = useQuery({
    queryKey: ['expenseCategories', user?.id, propertyId],
    queryFn: async () => {
      const categories: ExpenseCategory[] = [];
      const totalRevenue = paymentAnalytics?.totalAmount || 0;

      // Standard expense categories for rental properties
      const expenseRatios = {
        'Property Management': 0.08, // 8% of revenue
        'Maintenance & Repairs': 0.10, // 10% of revenue
        'Property Taxes': 0.12, // 12% of revenue
        'Insurance': 0.05, // 5% of revenue
        'Utilities': 0.03, // 3% of revenue
        'HOA Fees': 0.02, // 2% of revenue
        'Marketing & Advertising': 0.01, // 1% of revenue
        'Legal & Professional': 0.02, // 2% of revenue
        'Other Operating': 0.02, // 2% of revenue
      };

      Object.entries(expenseRatios).forEach(([category, ratio]) => {
        const monthlyAmount = (totalRevenue / 12) * ratio;
        const annualAmount = monthlyAmount * 12;
        const trend = Math.random() > 0.5 ? 'increasing' : Math.random() > 0.5 ? 'stable' : 'decreasing';

        categories.push({
          category,
          amount: monthlyAmount,
          percentage: ratio * 100,
          trend,
          avgMonthly: monthlyAmount,
          projectedAnnual: annualAmount,
        });
      });

      return categories.sort((a, b) => b.amount - a.amount);
    },
    enabled: !!paymentAnalytics,
  });

  // Calculate financial KPIs
  const financialKPIs: FinancialKPI[] = [
    {
      name: 'Gross Rental Yield',
      value: `${((portfolioSummary.totalMonthlyRevenue * 12) / (portfolioSummary.avgPropertyValue * portfolioSummary.totalProperties) * 100).toFixed(2)}%`,
      target: '8%',
      status: portfolioSummary.portfolioROI > 8 ? 'on-track' : portfolioSummary.portfolioROI > 6 ? 'at-risk' : 'off-track',
      trend: 'stable',
      description: 'Annual rental income as percentage of property value',
    },
    {
      name: 'Operating Expense Ratio',
      value: '35%',
      target: '30-40%',
      status: 'on-track',
      trend: 'stable',
      description: 'Operating expenses as percentage of gross income',
    },
    {
      name: 'Debt Service Coverage',
      value: '1.45',
      target: '>1.25',
      status: 'on-track',
      trend: 'improving',
      description: 'Net operating income divided by debt payments',
    },
    {
      name: 'Cash-on-Cash Return',
      value: `${(portfolioSummary.portfolioROI * 1.2).toFixed(2)}%`,
      target: '10%',
      status: portfolioSummary.portfolioROI > 8 ? 'on-track' : 'at-risk',
      trend: 'improving',
      description: 'Annual pre-tax cash flow relative to cash invested',
    },
    {
      name: 'Vacancy Rate',
      value: `${(100 - portfolioSummary.overallOccupancyRate).toFixed(1)}%`,
      target: '<5%',
      status: portfolioSummary.overallOccupancyRate > 95 ? 'on-track' : portfolioSummary.overallOccupancyRate > 90 ? 'at-risk' : 'off-track',
      trend: portfolioSummary.overallOccupancyRate > 90 ? 'improving' : 'declining',
      description: 'Percentage of units currently vacant',
    },
  ];

  // Compare property performance
  const propertyComparisons: PropertyComparison[] = propertyMetrics.map(property => {
    const revenue = property.totalMonthlyRevenue;
    const expenses = property.totalExpenses;
    const netIncome = property.netOperatingIncome;
    const roi = property.capRate;
    
    // Calculate performance score (0-100)
    const performanceScore = (
      (property.occupancyRate / 100) * 30 + // 30% weight
      (property.revenueEfficiency / 100) * 25 + // 25% weight
      (roi / 10) * 25 + // 25% weight (assuming 10% is excellent)
      (1 - (property.maintenanceCostPerUnit / 200)) * 20 // 20% weight
    );

    return {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      revenue,
      expenses,
      netIncome,
      roi,
      occupancyRate: property.occupancyRate,
      avgRentPerUnit: property.avgRentPerUnit,
      maintenanceCostRatio: (property.maintenanceCostPerUnit * property.totalUnits) / revenue,
      performanceScore: Math.min(100, Math.max(0, performanceScore)),
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore);

  // Generate financial insights
  const financialInsights: FinancialInsight[] = [];

  // Check for underperforming properties
  propertyComparisons.forEach(property => {
    if (property.performanceScore < 60) {
      financialInsights.push({
        id: `underperforming-${property.propertyId}`,
        type: 'risk',
        severity: property.performanceScore < 40 ? 'critical' : 'warning',
        title: `${property.propertyName} is underperforming`,
        description: `Performance score of ${property.performanceScore.toFixed(0)}/100 indicates significant issues`,
        impact: `Potential annual revenue loss of $${((property.avgRentPerUnit * 0.1) * 12).toFixed(0)}`,
        recommendation: property.occupancyRate < 80 
          ? 'Focus on reducing vacancy through competitive pricing or property improvements'
          : 'Review operating expenses and maintenance efficiency',
        value: property.revenue,
        relatedProperties: [property.propertyId],
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Check for cash flow opportunities
  if (portfolioSummary.overallOccupancyRate > 95) {
    financialInsights.push({
      id: 'high-occupancy-opportunity',
      type: 'opportunity',
      severity: 'info',
      title: 'High occupancy presents rent increase opportunity',
      description: `Portfolio occupancy at ${portfolioSummary.overallOccupancyRate.toFixed(1)}% suggests strong demand`,
      impact: 'Potential 3-5% rent increase could generate additional annual revenue',
      recommendation: 'Review market rates and consider strategic rent increases at lease renewals',
      createdAt: new Date().toISOString(),
    });
  }

  // Check for expense anomalies
  expenseCategories.forEach(category => {
    if (category.trend === 'increasing' && category.percentage > 15) {
      financialInsights.push({
        id: `expense-trend-${category.category.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'anomaly',
        severity: 'warning',
        title: `Rising ${category.category} expenses`,
        description: `${category.category} costs are ${category.percentage.toFixed(1)}% of revenue and trending upward`,
        impact: `Projected annual increase of $${(category.projectedAnnual * 0.1).toFixed(0)}`,
        recommendation: `Review ${category.category.toLowerCase()} contracts and explore cost reduction opportunities`,
        value: category.projectedAnnual,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return {
    cashFlowProjections,
    revenueStreams,
    expenseCategories,
    financialKPIs,
    propertyComparisons,
    financialInsights,
    isLoading: !paymentAnalytics || propertyMetrics.length === 0,
  };
}