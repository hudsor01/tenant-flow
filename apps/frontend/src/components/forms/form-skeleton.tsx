/**
 * Form Skeleton Component - Server Component
 * 
 * Loading state for forms with proper field structure
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface FormSkeletonProps {
  sections?: number
  fieldsPerSection?: number
  showActions?: boolean
}

export function FormSkeleton({ 
  sections = 2, 
  fieldsPerSection = 3,
  showActions = true
}: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <Card key={sectionIndex} className="animate-pulse" style={{ animationDelay: `${sectionIndex * 100}ms` }}>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px] mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {showActions && (
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      )}
    </div>
  )
}