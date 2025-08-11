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
import { LeasesDataTable } from '@/components/leases/leases-data-table'
import { LeasesStats } from '@/components/leases/leases-stats'

export const metadata = {
  title: 'Leases | TenantFlow',
  description: 'Manage lease agreements and track rental terms',
}

function LeasesHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Leases
        </h1>
        <p className="text-muted-foreground">
          Manage lease agreements and track rental terms
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Link href="/leases/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Lease
          </Button>
        </Link>
      </div>
    </div>
  )
}

function LeasesSearch() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leases by tenant, property, or lease terms..."
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

function LeasesLoadingSkeleton() {
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
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LeasesPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      <LeasesHeader />
      
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => (
        <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
      ))}</div>}>
        <LeasesStats />
      </Suspense>
      
      <LeasesSearch />
      
      <Suspense fallback={<LeasesLoadingSkeleton />}>
        <LeasesDataTable />
      </Suspense>
    </div>
  )
}