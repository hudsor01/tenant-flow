import { Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, 
  Search, 
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { TenantsDataTable } from '@/components/tenants/tenants-data-table'
import { TenantsStats } from '@/components/tenants/tenants-stats'

export const metadata = {
  title: 'Tenants | TenantFlow',
  description: 'Manage your tenants and track lease status',
}

function TenantsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Tenants
        </h1>
        <p className="text-muted-foreground">
          Manage your tenants and track lease agreements
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Link href="/tenants/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>
    </div>
  )
}

function TenantsSearch() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tenants by name, email, or phone..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TenantsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TenantsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <TenantsHeader />
      
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => (
        <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
      ))}</div>}>
        <TenantsStats />
      </Suspense>
      
      <TenantsSearch />
      
      <Suspense fallback={<TenantsLoadingSkeleton />}>
        <TenantsDataTable />
      </Suspense>
    </div>
  )
}