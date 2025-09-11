'use client'

import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { cn } from '@/lib/design-system'
import { Loader2 } from 'lucide-react'

interface GlobalLoadingIndicatorProps {
  className?: string
  variant?: 'bar' | 'spinner' | 'minimal'
  position?: 'top' | 'bottom' | 'center'
  showCount?: boolean
}

export function GlobalLoadingIndicator({
  className,
  variant = 'bar',
  position = 'top',
  showCount = false
}: GlobalLoadingIndicatorProps = {}) {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  
  const isLoading = isFetching > 0 || isMutating > 0
  const totalOperations = isFetching + isMutating

  if (!isLoading) return null

  const variants = {
    bar: (
      <div
        className={cn(
          'fixed z-50 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50',
          'animate-pulse transition-all duration-300 ease-out',
          position === 'top' && 'top-0 left-0 right-0',
          position === 'bottom' && 'bottom-0 left-0 right-0',
          className
        )}
        role="progressbar"
        aria-label={`Loading ${totalOperations} operations`}
      >
        <div className="h-full bg-primary/80 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    ),
    spinner: (
      <div
        className={cn(
          'fixed z-50 flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg',
          position === 'top' && 'top-4 right-4',
          position === 'bottom' && 'bottom-4 right-4',
          position === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'transition-all duration-300 ease-out',
          className
        )}
        role="status"
        aria-label={`Loading ${totalOperations} operations`}
      >
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-foreground">
          Loading{showCount && totalOperations > 1 ? ` (${totalOperations})` : ''}...
        </span>
      </div>
    ),
    minimal: (
      <div
        className={cn(
          'fixed z-50 w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20',
          'flex items-center justify-center',
          position === 'top' && 'top-4 right-4',
          position === 'bottom' && 'bottom-4 right-4',
          position === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'transition-all duration-300 ease-out animate-pulse',
          className
        )}
        role="status"
        aria-label={`Loading ${totalOperations} operations`}
      >
        <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
      </div>
    )
  }

  return variants[variant]
}

// Specialized loading indicators for specific query types
export function useQueryLoadingStates() {
  const financialLoading = useIsFetching({ queryKey: ['financial'] })
  const propertiesLoading = useIsFetching({ queryKey: ['properties'] })
  const tenantsLoading = useIsFetching({ queryKey: ['tenants'] })
  const dashboardLoading = useIsFetching({ queryKey: ['dashboard'] })
  
  return {
    financial: financialLoading > 0,
    properties: propertiesLoading > 0,
    tenants: tenantsLoading > 0,
    dashboard: dashboardLoading > 0,
    any: financialLoading + propertiesLoading + tenantsLoading + dashboardLoading > 0
  }
}

// Enhanced loading indicator with query-specific information
export function DetailedLoadingIndicator() {
  const loadingStates = useQueryLoadingStates()
  const totalOperations = useIsFetching() + useIsMutating()
  
  if (!loadingStates.any) return null

  const activeOperations = []
  if (loadingStates.financial) activeOperations.push('Financial')
  if (loadingStates.properties) activeOperations.push('Properties')
  if (loadingStates.tenants) activeOperations.push('Tenants')
  if (loadingStates.dashboard) activeOperations.push('Dashboard')

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">
            Loading ({totalOperations})
          </span>
        </div>
        
        {activeOperations.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {activeOperations.join(', ')}
          </div>
        )}
        
        {/* Progress indicator */}
        <div className="w-full bg-muted rounded-full h-1">
          <div 
            className="bg-primary h-1 rounded-full animate-pulse"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}