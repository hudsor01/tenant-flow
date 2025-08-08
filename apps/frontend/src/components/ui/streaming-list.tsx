/**
 * Streaming List Component - Server Component
 * 
 * Progressive loading for lists with streaming support
 */

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface StreamingListProps<T> {
  items: Promise<T[]>
  renderItem: (item: T, index: number) => React.ReactNode
  renderSkeleton?: () => React.ReactNode
  skeletonCount?: number
  className?: string
}

async function StreamingListContent<T>({ 
  items, 
  renderItem,
  className 
}: Omit<StreamingListProps<T>, 'renderSkeleton' | 'skeletonCount'>) {
  const data = await items
  
  return (
    <div className={className}>
      {data.map((item, index) => renderItem(item, index))}
    </div>
  )
}

export function StreamingList<T>({ 
  items,
  renderItem,
  renderSkeleton,
  skeletonCount = 3,
  className = "space-y-4"
}: StreamingListProps<T>) {
  const defaultSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div 
          key={i} 
          className="animate-pulse p-4 border rounded-lg"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
  
  return (
    <Suspense fallback={renderSkeleton?.() || defaultSkeleton()}>
      <StreamingListContent 
        items={items} 
        renderItem={renderItem}
        className={className}
      />
    </Suspense>
  )
}