import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { PropertiesStats } from '@/components/properties/properties-stats'
import { PropertiesClient } from './properties-client'

/**
 * Server component for Properties page header
 * Static content that can be server-rendered
 */
function PropertiesHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
        <p className="text-muted-foreground">
          Manage your property portfolio
        </p>
      </div>
    </div>
  )
}

/**
 * Loading component for properties data
 */
function PropertiesLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

/**
 * Properties Page - Server Component
 * Follows React 19 server-first architecture:
 * - Server component for static layout and data
 * - Client component for interactive features
 */
export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      {/* Server-rendered header */}
      <PropertiesHeader />
      
      {/* Server-rendered stats with suspense boundary */}
      <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
        <PropertiesStats />
      </Suspense>
      
      {/* Interactive content in client component */}
      <Card>
        <CardContent className="p-6">
          <Suspense fallback={<PropertiesLoading />}>
            <PropertiesClient />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}