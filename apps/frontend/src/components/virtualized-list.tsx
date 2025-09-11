'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useMemo } from 'react'
import { cn } from '@/lib/design-system'

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize: number
  className?: string
  height?: number
  gap?: number
  overscan?: number
  getItemKey?: (item: T, index: number) => string
  onScrollToEnd?: () => void
}

export function VirtualizedList<T>({
  items,
  renderItem,
  estimateSize,
  className,
  height = 400,
  gap = 0,
  overscan = 5,
  getItemKey,
  onScrollToEnd
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    gap
  })

  // Detect scroll to end for infinite loading
  const virtualItems = rowVirtualizer.getVirtualItems()
  const lastItem = virtualItems[virtualItems.length - 1]

  useMemo(() => {
    if (lastItem && lastItem.index >= items.length - 1 && onScrollToEnd) {
      onScrollToEnd()
    }
  }, [lastItem, items.length, onScrollToEnd])

  return (
    <div
      ref={parentRef}
      className={cn(
        'overflow-auto',
        className
      )}
      style={{ height }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          const key = getItemKey && item ? getItemKey(item, virtualItem.index) : virtualItem.index

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item ? renderItem(item, virtualItem.index) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Specialized virtualized components for our domain entities

interface VirtualizedPropertyListProps {
  properties: Array<{
    id: string
    displayAddress: string
    displayType: string
    statusDisplay: string
    statusColor: string
  }>
  onPropertyClick?: (propertyId: string) => void
  className?: string
  height?: number
}

export function VirtualizedPropertyList({
  properties,
  onPropertyClick,
  className,
  height = 500
}: VirtualizedPropertyListProps) {
  return (
    <VirtualizedList
      items={properties}
      estimateSize={80}
      height={height}
      className={className}
      getItemKey={(property) => property.id}
      renderItem={(property) => (
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b border-border hover:bg-accent/50 cursor-pointer',
            'transition-colors duration-200'
          )}
          onClick={() => onPropertyClick?.(property.id)}
        >
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{property.displayAddress}</h3>
            <p className="text-sm text-muted-foreground">{property.displayType}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: property.statusColor }}
            />
            <span className="text-sm text-foreground">{property.statusDisplay}</span>
          </div>
        </div>
      )}
    />
  )
}

interface VirtualizedTenantListProps {
  tenants: Array<{
    id: string
    displayName: string
    displayEmail: string
    displayPhone: string
    statusDisplay: string
    statusColor: string
    avatarInitials: string
  }>
  onTenantClick?: (tenantId: string) => void
  className?: string
  height?: number
}

export function VirtualizedTenantList({
  tenants,
  onTenantClick,
  className,
  height = 500
}: VirtualizedTenantListProps) {
  return (
    <VirtualizedList
      items={tenants}
      estimateSize={88}
      height={height}
      className={className}
      getItemKey={(tenant) => tenant.id}
      renderItem={(tenant) => (
        <div
          className={cn(
            'flex items-center gap-4 p-4 border-b border-border hover:bg-accent/50 cursor-pointer',
            'transition-colors duration-200'
          )}
          onClick={() => onTenantClick?.(tenant.id)}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {tenant.avatarInitials}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{tenant.displayName}</h3>
            <p className="text-sm text-muted-foreground">{tenant.displayEmail}</p>
            <p className="text-xs text-muted-foreground">{tenant.displayPhone}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tenant.statusColor }}
            />
            <span className="text-sm text-foreground">{tenant.statusDisplay}</span>
          </div>
        </div>
      )}
    />
  )
}

// Hook for infinite loading with TanStack Query integration
export function useVirtualizedInfiniteQuery<T>(
  items: T[],
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) {
  const handleScrollToEnd = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  return {
    handleScrollToEnd,
    isLoading: isFetchingNextPage,
    hasMore: hasNextPage
  }
}