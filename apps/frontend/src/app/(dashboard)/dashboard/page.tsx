'use client'

import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { useProperties } from '@/hooks/api/use-properties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function DashboardStats() {
  const { data: stats, isLoading, error } = useDashboardStats({
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  })
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard statistics. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[80px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalProperties || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.occupancyRate || 0}% occupancy rate
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.activeLeases || 0} active leases
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeLeases || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.expiredLeases || 0} expired leases
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.maintenanceRequests?.pending || 0}</div>
          <p className="text-xs text-muted-foreground">
            Pending requests
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RecentProperties() {
  const { data: properties, isLoading, error } = useProperties({ limit: 5 })
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Properties</CardTitle>
          <CardDescription>
            Your most recently added properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load properties. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Properties</CardTitle>
        <CardDescription>
          Your most recently added properties
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-[200px] mb-2" />
                  <Skeleton className="h-3 w-[300px]" />
                </div>
                <Skeleton className="h-8 w-[60px]" />
              </div>
            ))
          ) : properties?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No properties found</p>
              <Link href="/properties/new">
                <Button variant="outline" className="mt-2">Add Your First Property</Button>
              </Link>
            </div>
          ) : (
            properties?.map((property) => (
              <div key={property.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {property.address}, {property.city}, {property.state}
                  </p>
                </div>
                <Link href={`/properties/${property.id}`}>
                  <Button variant="outline" size="sm">View</Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Link href="/properties/new">
            <Button>Add Property</Button>
          </Link>
        </div>
      </div>
      
      <DashboardStats />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <RecentProperties />
        </div>
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/properties/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Add New Property
                </Button>
              </Link>
              <Link href="/tenants/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Add New Tenant
                </Button>
              </Link>
              <Link href="/leases/new" className="block">
                <Button variant="outline" className="w-full justify-start">
                  Create New Lease
                </Button>
              </Link>
              <Link href="/maintenance" className="block">
                <Button variant="outline" className="w-full justify-start">
                  View Maintenance Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}