import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { usePricingContext } from '@/contexts/pricing-context'

export interface UsageIndicatorProps {
  className?: string
}

interface UsageMetric {
  label: string
  current: number
  limit: number | undefined
  unit: string
  percentage: number
  status: 'normal' | 'warning' | 'critical'
}

/**
 * Usage Indicator component
 * Shows current usage vs plan limits with visual indicators
 */
export function UsageIndicator({ className }: UsageIndicatorProps): React.ReactElement | null {
  const { currentPlan, usage, limits } = usePricingContext()
  
  const metrics = useMemo((): UsageMetric[] => {
    if (!currentPlan) {
      return []
    }
    const calculateUsage = (current: number, limit: number | undefined): UsageMetric['status'] => {
      if (!limit || limit === -1) return 'normal' // Unlimited or undefined
      const percentage = (current / limit) * 100
      if (percentage >= 90) return 'critical'
      if (percentage >= 70) return 'warning'
      return 'normal'
    }

    const calculatePercentage = (current: number, limit: number): number => {
      if (limit === -1) return 0 // Unlimited
      return Math.round((current / limit) * 100) // Don't cap at 100 for display
    }

    return [
      {
        label: 'Properties',
        current: usage.properties,
        limit: limits.properties,
        unit: '',
        percentage: calculatePercentage(usage.properties, limits.properties),
        status: calculateUsage(usage.properties, limits.properties)
      },
      {
        label: 'Units',
        current: usage.units,
        limit: limits.units,
        unit: '',
        percentage: calculatePercentage(usage.units, limits.units),
        status: calculateUsage(usage.units, limits.units)
      },
      {
        label: 'Tenants',
        current: usage.tenants,
        limit: limits.tenants,
        unit: '',
        percentage: calculatePercentage(usage.tenants, limits.tenants),
        status: calculateUsage(usage.tenants, limits.tenants)
      },
      {
        label: 'Team Members',
        current: usage.teamMembers,
        limit: limits.teamMembers,
        unit: '',
        percentage: calculatePercentage(usage.teamMembers, limits.teamMembers),
        status: calculateUsage(usage.teamMembers, limits.teamMembers)
      }
    ]
  }, [usage, limits, currentPlan])

  const overallStatus = useMemo(() => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length
    const warningCount = metrics.filter(m => m.status === 'warning').length
    
    if (criticalCount > 0) return 'critical'
    if (warningCount > 0) return 'warning'
    return 'normal'
  }, [metrics])
  
  if (!currentPlan) {
    return null
  }

  const getStatusIcon = (status: UsageMetric['status']) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <TrendingUp className="w-4 h-4 text-yellow-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  const getStatusColor = (status: UsageMetric['status']) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const _getProgressColor = (status: UsageMetric['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }

  return (
    <div data-testid="usage-indicator-container" className={className}>
      <Card className={cn('border-2', getStatusColor(overallStatus))}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {currentPlan}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            <Badge variant={overallStatus === 'normal' ? 'default' : 'destructive'}>
              {overallStatus === 'critical' ? 'Action Required' : 
               overallStatus === 'warning' ? 'Near Limit' : 'All Good'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {metrics.map((metric) => {
          const formatNumber = (num: number) => num.toLocaleString();
          const dataTestId = metric.label.toLowerCase().replace(/\s+/g, '').replace('teammembers', 'teamMembers');
          
          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-medium">{metric.label}</span>
                </div>
                <span className="text-gray-600">
                  {metric.limit === -1 || metric.limit === undefined
                    ? `${formatNumber(metric.current)}`
                    : `${formatNumber(metric.current)} / ${formatNumber(metric.limit)}`}
                </span>
              </div>
              
              {metric.limit === -1 ? (
                <div className="text-xs text-gray-500">
                  <span>Unlimited</span>
                </div>
              ) : metric.limit && (
                <div className="space-y-1">
                  <div 
                    data-testid={`usage-bar-${dataTestId}`}
                    className={cn(
                      'h-2 rounded-full overflow-hidden bg-gray-200',
                      metric.status === 'critical' ? 'bg-red-500' : 
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${metric.percentage}%` }}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{metric.percentage}%</span>
                    {metric.status === 'critical' && (
                      <span className="text-red-600 font-medium">Limit exceeded!</span>
                    )}
                    {metric.status === 'warning' && (
                      <span className="text-yellow-600 font-medium">Approaching limit</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {overallStatus !== 'normal' && (
          <div className={cn(
            'p-3 rounded-lg border',
            overallStatus === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          )}>
            <p className={cn(
              'text-sm font-medium',
              overallStatus === 'critical' ? 'text-red-800' : 'text-yellow-800'
            )}>
              {overallStatus === 'critical' 
                ? 'You\'ve exceeded your plan limits. Consider upgrading to continue using all features.'
                : 'You\'re approaching your plan limits. Consider upgrading to avoid interruptions.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}