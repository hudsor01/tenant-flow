'use client'

import { useProperties } from '@/hooks/api/use-properties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DenseTable } from '@/components/data-table/dense-table'
import { propertyColumns } from '@/components/data-table/columns/property-columns'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Dashboard Recent Activity Component
 * Focused component for recent properties and activity
 * Extracted from massive dashboard client component
 */
export function DashboardRecentActivity() {
  const { data: properties, isLoading, error } = useProperties()

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading properties</AlertTitle>
        <AlertDescription>
          There was a problem loading your recent activity. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Recent Properties */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recent Properties</CardTitle>
            <CardDescription>
              Your latest property additions
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/properties">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <DenseTable 
              data={properties.slice(0, 5)}
              columns={propertyColumns.slice(0, 3)} // Show only name, address, type
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No properties yet</p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/properties">Add your first property</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to get things done faster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/properties">
                <ArrowRight className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/tenants">
                <ArrowRight className="mr-2 h-4 w-4" />
                Add Tenant
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/leases">
                <ArrowRight className="mr-2 h-4 w-4" />
                Create Lease
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/maintenance">
                <ArrowRight className="mr-2 h-4 w-4" />
                Log Maintenance
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}