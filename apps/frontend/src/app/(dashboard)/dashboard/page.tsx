import { Suspense } from 'react'
import { getDashboardStats } from '@/lib/data/dashboard'
import { getProperties } from '@/lib/data/properties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function DashboardStats() {
  const stats = await getDashboardStats()
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProperties}</div>
          <p className="text-xs text-muted-foreground">
            {stats.occupiedUnits} of {stats.totalUnits} units occupied
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTenants}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeTenants} active tenants
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeLeases}</div>
          <p className="text-xs text-muted-foreground">
            {stats.expiringLeases} expiring soon
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingMaintenance}</div>
          <p className="text-xs text-muted-foreground">
            Pending requests
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

async function RecentProperties() {
  const properties = await getProperties({ limit: 5 })
  
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
          {properties.map((property) => (
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
          ))}
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
      
      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <Suspense fallback={<div>Loading properties...</div>}>
            <RecentProperties />
          </Suspense>
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