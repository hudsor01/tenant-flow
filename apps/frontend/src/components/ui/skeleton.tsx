import { Table } from '@/components/ui/table'
"use client"

import { cn } from '@/lib/design-system'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'rounded' | 'circle'
  children?: React.ReactNode
}

function Skeleton({
  className,
  variant = 'default',
  children,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const variantClasses = {
    default: 'rounded',
    rounded: 'rounded-md',
    circle: 'rounded-full'
  }

  return (
    <div
      className={cn('animate-pulse bg-muted', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Preset skeleton components for common patterns
function CardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 p-6", className)} {...props}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" variant="rounded" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16" variant="rounded" />
        <Skeleton className="h-8 w-16" variant="rounded" />
      </div>
    </div>
  )
}

function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className, 
  ...props 
}: { 
  rows?: number
  columns?: number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Table Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 ? "w-1/4" : "",
                colIndex === columns - 1 ? "w-20" : ""
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ 
  items = 6, 
  className, 
  ...props 
}: { 
  items?: number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="w-12 h-12" variant="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" variant="rounded" />
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" variant="rounded" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="w-5 h-5" variant="circle" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-64 w-full" variant="rounded" />
      </div>
      
      {/* Table */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <TableSkeleton rows={8} columns={5} />
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  CardSkeleton, 
  TableSkeleton, 
  ListSkeleton, 
  DashboardSkeleton 
}